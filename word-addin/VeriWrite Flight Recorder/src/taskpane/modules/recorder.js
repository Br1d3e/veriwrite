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
let failed = false;
const CHECKPOINT_INTERVAL = 10_000; // 10s for testing
let lastCheckpoint = Date.now();
let lastPoll = Date.now();
let lastText = "";
const postInterval = 10_000;
let lastPost = Date.now();
let evBuffer = [];
let postedBlocks = 0;
let posting = null;
let docState = null;
let sesState = null;
let blockReceipt = null;
let finalReceipt = null;
let lastError = null;
let lastRetryMs = 0;

export function setOnlineMode(value) {
  onlineStatus = Boolean(value);
}

export function getOnlineStatus() {
  return onlineStatus;
}

export function getSessionInfo() {
  const ev = session && Array.isArray(session.ev) ? session.ev : [];
  const timeElapsedMs = session ? Date.now() - session.t0 : 0;
  return {
    recording,
    evCount: ev.length,
    timeElapsedMs,
  };
}

export function getPostState() {
  const pendingSessions = flightRecord.sessions.filter((s) => s && s.fullOnline !== true);
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

async function persistRecord() {
  if (!flightRecord) return;
  flightRecord.m.lastModified = Date.now();
  flightRecord.m.title = await getDocTitle();
  flightRecord.m.author = await getDocAuthor();
  xmlId = await saveCustomXml(flightRecord);
}

async function syncPendingSessions() {
  if (!flightRecord || !Array.isArray(flightRecord.sessions)) return;

  const pendingSessions = flightRecord.sessions.filter((s) => s && s.fullOnline !== true);
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

  if (Date.now() - lastCheckpoint >= CHECKPOINT_INTERVAL) {
    try {
      lastCheckpoint = Date.now();
      await updateSessions();
    } catch (error) {
      failRecording(error);
    }
  }

  try {
    const currentText = await captureDiff(pending);

    const prevOnlineStatus = onlineStatus;
    await checkConnectivity();
    if (
      onlineStatus &&
      sessionReady() &&
      evBuffer.length > 0 &&
      Date.now() - lastPost >= postInterval
    ) {
      let response = null;
      if (prevOnlineStatus === false && onlineStatus === true) {
        // delayed
        response = await flushBlock(currentText, true);
      } else {
        response = await flushBlock(currentText);
      }
      if (isOfflineResponse(response)) {
        switchOffline(response);
      }
    }
  } catch (error) {
    failRecording(error);
  }

  // Poll again (rate 200ms)
  if (recording && !failed) {
    setTimeout(poll, 200);
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

// Append new session into flightRecord.sessions
async function updateSessions(finalText = null) {
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
  failed = false;
  lastError = null;
  lastRetryMs = 0;
  blockReceipt = null;
  finalReceipt = null;
  posting = null;
  pending = false;
  evBuffer = [];
  session = null;

  [docId, schema, xmlId] = await loadSettings();
  const sessionInitText = await readBodyText();

  // Load existing record
  if (xmlId) {
    flightRecord = await loadRecord(xmlId);
  }

  if (!docId && flightRecord?.m?.docId) {
    docId = flightRecord.m.docId;
  }

  // No stored record, create new document
  if (!flightRecord) {
    console.log("Record load failed or is new, initializing fresh record...");
    flightRecord = await newRecord(docId);
  }
  await updateSettings("docId", flightRecord.m.docId);
  await updateSettings("v", 2);

  await checkConnectivity();

  if (onlineStatus) {
    try {
      await syncPendingSessions();
    } catch (error) {
      switchOffline(error);
    }
  }

  await initializeSession(sessionInitText);
  await persistRecord(); // checkpoint immediately when record starts

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
          evBuffer = [];
          lastPost = Date.now();
          pending = false;
        }
      }
    } catch (error) {
      switchOffline(error);
    }
  }

  lastPoll = Date.now();
  lastText = sessionInitText;

  recording = true;

  poll();
}

export async function stopRecording() {
  if (!recording && !session) return;
  recording = false;

  await checkConnectivity();

  try {
    if (posting) {
      await posting;
    }

    const finalText = await captureDiff();

    if (onlineStatus && sessionReady()) {
      if (evBuffer.length > 0) {
        const response = await flushBlock(finalText);
        if (isOfflineResponse(response)) {
          switchOffline(response);
          await updateSessions(finalText);
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
      finalReceipt = await endSession(finalText);
      if (isOfflineResponse(finalReceipt)) {
        switchOffline(finalReceipt);
      } else if (finalReceipt && finalReceipt.receipt) {
        session.fullOnline = true;
      }
    }
    await updateSessions(finalText);
    evBuffer = [];
    session = null;

    if (onlineStatus) {
      await syncPendingSessions();
    }
  } catch (error) {
    failRecording(error);
  }
}

export function getFlightRecord() {
  return flightRecord;
}
