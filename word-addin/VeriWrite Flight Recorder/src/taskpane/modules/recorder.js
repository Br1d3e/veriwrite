import { generateUUID, b64Encoder, b64Decoder, computeDiff, isUserOnline } from "./utils";
import { saveCustomXml, loadSettings, loadRecord, updateSettings } from "./store";
import { getDocTitle, getDocAuthor, readBodyText } from "./docInfo";
import {
  startDoc,
  startSession,
  endSession,
  postBlock,
  hashText,
  getSessionPostState,
  getRetryMs,
  OFFLINE_STATUS,
  sessionReady,
} from "./post";
import { serializeRecord, wrapVwContainer } from "./vwContainer";

// Initialize record
let flightRecord = null;
let session = null;
let docId = null;
let schema = null;
let xmlId = null;
// Recorder States
let onlineStatus = true;
let pending = false;
let recording = false;
let stopRequested = false;
let failed = false;
let fileReady = false;
const CHECKPOINT_INTERVAL = 60_000;
const POLL_INTERVAL = 200;
const BACKGROUND_POLL_INTERVAL = 1_000;
const STOP_SERVER_READY_TIMEOUT = 30_000;
const STOP_SERVER_READY_INTERVAL = 500;
let lastCheckpoint = Date.now();
let lastPoll = Date.now();
let lastText = "";
const postInterval = 60_000;
let lastPost = Date.now();
let currentText = "";
let evBuffer = [];
let postedBlocks = 0;
let posting = null;
let serverStartPromise = null;
let docState = null;
let sesState = null;
let blockReceipt = null;
let finalReceipt = null;
let lastError = null;
let lastRetryMs = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function setOnlineMode(value) {
  onlineStatus = Boolean(value);
}

export function getOnlineStatus() {
  return onlineStatus;
}

export function getSessionInfo() {
  const ev = session && Array.isArray(session.ev) ? session.ev : [];
  const timeElapsedMs = session ? (stopRequested ? session.tn : Date.now()) - session.t0 : 0;
  return {
    recording: recording || stopRequested,
    evCount: ev.length,
    timeElapsedMs,
  };
}

export function getPostState() {
  const sessions = Array.isArray(flightRecord?.sessions) ? flightRecord.sessions : [];
  const pendingSessions = sessions.filter((s) => s && s.fullOnline !== true);
  return {
    bufferedEv: evBuffer.length,
    pending,
    pendingSessions: pendingSessions.length,
    postedBlocks,
    lastPost,
  };
}

async function newRecord(docIdOverride = null) {
  let flightRecord = {
    v: 2,
    m: {
      docId: docIdOverride || generateUUID(),
      created: Date.now(),
      lastModified: Date.now(),
      title: await getDocTitle(),
      author: await getDocAuthor(),
    },
    sessions: [],
  };
  return flightRecord;
}

async function initializeSession(initTextOverride = null) {
  const initText = typeof initTextOverride === "string" ? initTextOverride : await readBodyText();
  session = {
    sid: generateUUID(),
    t0: Date.now(),
    tn: Date.now(),
    init: initText,
    ev: [],
    fullOnline: false,
    localPh: initText === "" ? null : await hashText(initText),
    localEh: null,
  };
}

function applyEvents(text, ev = []) {
  let nextText = text;
  for (const event of ev) {
    if (!Array.isArray(event) || event.length !== 4) {
      throw new Error("invalid event tuple");
    }
    const [, pos, delLen, ins] = event;
    if (!Number.isInteger(pos) || !Number.isInteger(delLen) || typeof ins !== "string") {
      throw new Error("invalid event tuple");
    }
    if (pos < 0 || delLen < 0 || pos > nextText.length) {
      throw new Error("event range out of bounds");
    }
    nextText = nextText.slice(0, pos) + ins + nextText.slice(pos + delLen);
  }
  return nextText;
}

function sessionCount(record) {
  return Array.isArray(record?.sessions) ? record.sessions.length : 0;
}

async function persistRecord() {
  if (!flightRecord) return;
  flightRecord.m.lastModified = Date.now();
  flightRecord.m.title = await getDocTitle();
  flightRecord.m.author = await getDocAuthor();
  xmlId = await saveCustomXml(flightRecord);
}

async function syncPendingSessions(activeSid = null) {
  if (!flightRecord || !Array.isArray(flightRecord.sessions)) return;

  const pendingSessions = flightRecord.sessions.filter(
    (s) => s && s.sid !== activeSid && s.fullOnline !== true
  );
  if (pendingSessions.length === 0) return;

  const pendingStarts = pendingSessions.map((s) => s.t0).filter(Number.isFinite);
  const docStart = Math.min(flightRecord.m.created || Date.now(), ...pendingStarts);
  const titleOverride = flightRecord.m.title === "Untitled" ? null : flightRecord.m.title;
  const authorOverride = flightRecord.m.author === "Unknown" ? null : flightRecord.m.author;
  const docResponse = await startDoc(docStart, titleOverride, authorOverride);
  if (isOfflineResponse(docResponse)) {
    switchOffline(docResponse);
    return;
  }

  let changed = false;
  for (const pendingSession of pendingSessions) {
    const initText = pendingSession.init || "";
    const events = Array.isArray(pendingSession.ev) ? pendingSession.ev : [];
    const sessionResponse = await startSession(
      initText,
      true,
      pendingSession.t0,
      pendingSession.sid
    );
    if (isOfflineResponse(sessionResponse)) {
      switchOffline(sessionResponse);
      break;
    }

    const finalText = applyEvents(initText, events);
    if (events.length > 0) {
      const blockResponse = await postBlock(events, finalText, true);
      if (isOfflineResponse(blockResponse)) {
        switchOffline(blockResponse);
        break;
      }
    }

    const endResponse = await endSession(finalText, true, pendingSession.t0, pendingSession.tn);
    if (isOfflineResponse(endResponse)) {
      switchOffline(endResponse);
      break;
    }

    if (endResponse && endResponse.receipt) {
      pendingSession.fullOnline = true;
      changed = true;
    }
  }

  if (changed) {
    await persistRecord();
  }

  pending = pendingSessions.some((s) => s && s.fullOnline !== true);
  evBuffer = [];
  blockReceipt = null;
  finalReceipt = null;
}

async function flushBlock(docText, delayed = false) {
  if (posting) {
    await posting;
  }
  if (evBuffer.length === 0) return null;

  const blockEvents = evBuffer;
  evBuffer = [];

  posting = postBlock(blockEvents, docText, delayed)
    .then((response) => {
      if (isOfflineResponse(response)) {
        return response;
      }
      blockReceipt = response.receipt;
      lastPost = Date.now();
      postedBlocks++;
      return response;
    })
    .catch((error) => {
      evBuffer = blockEvents.concat(evBuffer);
      throw error;
    })
    .finally(() => {
      posting = null;
    });

  return posting;
}

function failRecording(error) {
  failed = true;
  recording = false;
  stopRequested = false;
  lastError = error instanceof Error ? error.message : String(error);
}

function switchOffline(error) {
  setOnlineMode(false);
  pending = true;
  if (error && error.status === OFFLINE_STATUS) {
    lastError = `${error.op || "record server"} unavailable`;
    lastRetryMs = error.retryMs || 0;
  } else {
    lastError = error instanceof Error ? error.message : String(error);
    lastRetryMs = getRetryMs() || 0;
  }
}

function switchOnline() {
  setOnlineMode(true);
  lastError = null;
  lastRetryMs = 0;
}

async function checkConnectivity() {
  const reachable = await isUserOnline();
  if (!reachable) {
    switchOffline({
      status: OFFLINE_STATUS,
      op: "connectivity",
      retryMs: 0,
    });
  } else {
    switchOnline();
  }
}

export async function refreshOnlineStatus() {
  await checkConnectivity();
  return onlineStatus;
}

function isOfflineResponse(response) {
  return response && response.status === OFFLINE_STATUS;
}

export function getRetryStatus() {
  const retryMs = getRetryMs();
  if (retryMs !== null) {
    return {
      retrying: true,
      error: "Retrying record server connection",
      retryMs,
    };
  }
  if (lastError && !onlineStatus) {
    return {
      retrying: false,
      error: lastError,
      retryMs: lastRetryMs,
    };
  } else return null;
}

async function poll() {
  if (!recording || failed) return;

  try {
    currentText = await captureDiff(pending);
  } catch (error) {
    failRecording(error);
  } finally {
    if (recording && !failed) {
      setTimeout(poll, POLL_INTERVAL);
    }
  }
}

async function captureDiff(pending = false) {
  const newText = await readBodyText();
  const diff = computeDiff(lastText, newText, lastPoll);
  lastPoll = Date.now();
  if (session) {
    session.tn = lastPoll;
  }
  if (!diff) return newText;

  lastText = newText;
  if (onlineStatus || pending) {
    evBuffer.push(diff);
  }
  session.ev.push(diff);
  return newText;
}

async function postPoll() {
  if (!recording || failed) return;

  try {
    const prevOnlineStatus = onlineStatus;
    await checkConnectivity();
    if (
      onlineStatus &&
      sessionReady() &&
      evBuffer.length > 0 &&
      Date.now() - lastPost >= postInterval
    ) {
      let response = null;
      const delayed = prevOnlineStatus === false && onlineStatus === true;
      response = await flushBlock(currentText, delayed);

      if (isOfflineResponse(response)) {
        switchOffline(response);
      }
    }
  } catch (error) {
    failRecording(error);
  } finally {
    if (recording && !failed) {
      setTimeout(postPoll, BACKGROUND_POLL_INTERVAL);
    }
  }
}

async function savePollCheckpoint() {
  if (!recording || failed) return;

  if (Date.now() - lastCheckpoint >= CHECKPOINT_INTERVAL) {
    try {
      lastCheckpoint = Date.now();
      await updateSessions();
    } catch (error) {
      failRecording(error);
    }
  }
  if (recording && !failed) {
    setTimeout(savePollCheckpoint, BACKGROUND_POLL_INTERVAL);
  }
}

async function waitForServerSessionReady() {
  const started = Date.now();
  if (serverStartPromise && !sessionReady()) {
    await Promise.race([serverStartPromise, sleep(STOP_SERVER_READY_TIMEOUT)]);
  }
  while (onlineStatus && !sessionReady() && Date.now() - started < STOP_SERVER_READY_TIMEOUT) {
    await sleep(STOP_SERVER_READY_INTERVAL);
  }
  return sessionReady();
}

async function startServerSession(sessionInitText) {
  await checkConnectivity();

  if (onlineStatus) {
    try {
      await syncPendingSessions(session?.sid);
    } catch (error) {
      switchOffline(error);
    }
  }

  if (onlineStatus) {
    try {
      docState = await startDoc();
      if (isOfflineResponse(docState)) {
        switchOffline(docState);
      } else {
        sesState = await startSession(sessionInitText, false, null, session?.sid);
        if (isOfflineResponse(sesState)) {
          switchOffline(sesState);
        } else {
          lastPost = Date.now();
          pending = false;
        }
      }
    } catch (error) {
      switchOffline(error);
    }
  }
}

export async function updateSessions(finalText = null) {
  if (!session || !flightRecord) return;
  if (!Array.isArray(flightRecord.sessions)) {
    flightRecord.sessions = [];
  }
  session.localEh = await hashText(finalText || (await readBodyText()));

  if (flightRecord.sessions.map((s) => s.sid).includes(session.sid)) {
    // Update existing session
    flightRecord.sessions = flightRecord.sessions.map((s) => (s.sid === session.sid ? session : s));
  } else {
    // Append new session
    flightRecord.sessions.push(session);
  }
  await persistRecord();
}

export async function startRecording() {
  if (recording) return;
  fileReady = false;
  failed = false;
  lastError = null;
  lastRetryMs = 0;
  blockReceipt = null;
  finalReceipt = null;
  posting = null;
  serverStartPromise = null;
  pending = false;
  evBuffer = [];
  postedBlocks = 0;
  session = null;
  stopRequested = false;

  const sessionInitText = await readBodyText();
  await initializeSession(sessionInitText);

  lastPoll = Date.now();
  lastText = sessionInitText;
  currentText = sessionInitText;
  recording = true;
  poll();

  [docId, schema, xmlId] = await loadSettings();

  // Load existing record without clobbering newer in-memory sessions.
  if (xmlId) {
    const storedRecord = await loadRecord(xmlId);
    if (!flightRecord || sessionCount(storedRecord) > sessionCount(flightRecord)) {
      flightRecord = storedRecord;
    }
  }

  if (!docId && flightRecord?.m?.docId) {
    docId = flightRecord.m.docId;
  }

  // No stored record, create new document
  if (!flightRecord) {
    flightRecord = await newRecord(docId);
  }
  await updateSettings("docId", flightRecord.m.docId);
  await updateSettings("v", 3);

  await persistRecord(); // checkpoint immediately when record starts
  postPoll();
  savePollCheckpoint();
  serverStartPromise = startServerSession(sessionInitText);
}

export async function stopRecording(onStopped = null) {
  if (!recording && !stopRequested && !session) return;
  fileReady = false;

  if (recording) {
    const finalText = await captureDiff();
    currentText = finalText;
    await updateSessions(finalText);
    recording = false;
    stopRequested = true;
  }

  await checkConnectivity();

  try {
    if (posting) {
      await posting;
    }
    const finalText = currentText;

    if (onlineStatus && !sessionReady()) {
      await waitForServerSessionReady();
    }

    if (onlineStatus && sessionReady()) {
      if (evBuffer.length > 0) {
        const response = await flushBlock(finalText);
        if (isOfflineResponse(response)) {
          switchOffline(response);
          fileReady = true;
          return;
        }
      } else {
        const finalHash = await hashText(finalText);
        const { currentDocHash } = getSessionPostState();
        if (currentDocHash !== finalHash) {
          throw new Error(
            "Final document state changed, but no pending events were captured for the record server."
          );
        }
      }
      finalReceipt = await endSession(finalText, false, session.t0, session.tn);
      if (isOfflineResponse(finalReceipt)) {
        switchOffline(finalReceipt);
        pending = true;
        fileReady = true;
        return {
          status: "WAITING_FOR_SERVER_SESSION",
          message:
            "Session end is still waiting for the record server. Keep Word open and try Stop again shortly.",
        };
      } else if (finalReceipt && finalReceipt.receipt) {
        session.fullOnline = true;
        await updateSessions(finalText);
      } else {
        throw new Error(
          `Record server did not return a session receipt: ${JSON.stringify(finalReceipt)}`
        );
      }
    } else if (onlineStatus && session && session.ev.length > 0) {
      pending = true;
      fileReady = true;
      return {
        status: "WAITING_FOR_SERVER_SESSION",
        message:
          "Record server session is not ready yet. Keep Word open and try Stop again shortly.",
      };
    }

    if (onlineStatus) {
      await syncPendingSessions();
    }

    evBuffer = [];
    session = null;
    stopRequested = false;
    fileReady = true;
  } catch (error) {
    fileReady = false;
    failRecording(error);
    throw error;
  }
  onStopped && onStopped();
  return { status: "STOPPED" };
}

export function getFlightRecord() {
  return flightRecord;
}

export function isFileReady() {
  return fileReady;
}

export function getVwRecord() {
  return wrapVwContainer(flightRecord);
}
