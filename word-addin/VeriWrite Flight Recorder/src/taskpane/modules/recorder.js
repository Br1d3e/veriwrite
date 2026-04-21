
import { generateUUID, b64Encoder, b64Decoder, computeDiff, isUserOnline } from "./utils";
import { saveCustomXml, loadSettings, loadRecord, updateSettings} from "./store";
import { getDocTitle, getDocAuthor, readBodyText } from "./docInfo";
import { startDoc, startSession, endSession, postBlock, hashText, getSessionPostState, getRetryMs, OFFLINE_STATUS, docReady, sessionReady } from "./post";

// Initialize record
let flightRecord = null;
let session = null;
let docId = null;
let schema = null;
let xmlId = null;
// Recorder States
let ONLINE = true;
let onlineStatus = "ONLINE";
let pending = false;
let recording = false;
let failed = false;
let lastPoll = Date.now();
let lastText = "";
const postInterval = 10_000;
let lastPost = Date.now();
let evBuffer = [];
let posting = null;
let docState = null;
let sesState = null;
let blockReceipt = null;
let finalReceipt = null;
let lastError = null;
let lastRetryMs = 0;


export function setOnlineMode(value, auto=false) {
  ONLINE = Boolean(value);
  if (auto) {
    onlineStatus = value ? "ONLINE_AUTO" : "OFFLINE_AUTO"
  } else {
    onlineStatus = value ? "ONLINE" : "OFFLINE"
  }
}

export function getOnlineStatus() {
  return onlineStatus;
}

export function getPostState() {
  return {
    docState,
    sesState,
    blockReceipt,
    finalReceipt,
    lastError
  }
}

export function getEvBlock() {
  return {
    timeElapsed: (Date.now() - lastPost) / 1000,
    evBuffer
  }
}

async function newRecord() {
  let flightRecord = {
    v: 2,
    m: {
      docId: generateUUID(),
      created: Date.now(),
      lastModified: Date.now(),
      title: await getDocTitle(),
      author: await getDocAuthor()
    },
    sessions: []
  }
  return flightRecord;
}

async function initializeSession(initTextOverride = null) {
  const initText = typeof initTextOverride === "string" ? initTextOverride : await readBodyText();
  session = {
    id: `s${flightRecord.sessions.length + 1}`,
    t0: Date.now(),
    tn: Date.now(),
    init: initText,
    ev: [],
    localPh: null,
    localEh: null
  };
}

async function flushBlock(docText, delayed=false) {
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
  setOnlineMode(false, true);
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
  setOnlineMode(true, true);
  lastError = null;
  lastRetryMs = 0;
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
      retryMs
    };
  }
  if (lastError && ONLINE === false) {
    return {
      error: lastError,
      retryMs: lastRetryMs
    };
  }
  else return null;
}

async function poll() {
  if (!recording || failed) return;

  try {
    const currentText = await captureDiff(pending);

    const prevOnlineStatus = onlineStatus;
    const reachable = await isUserOnline();
    if (!reachable) {
      switchOffline({
        status: OFFLINE_STATUS,
        op: "connectivity",
        retryMs: 0,
      });
    } else {
      switchOnline();
      if (!docReady()) {
        await startDoc()
      }
      if (!sessionReady()) {
        await startSession(currentText);
      }
    }

    if (ONLINE && evBuffer.length > 0 && Date.now() - lastPost >= postInterval) {
      let response = null;
      if (prevOnlineStatus.includes("OFFLINE") && onlineStatus.includes("ONLINE")) {
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

async function captureDiff(pending) {
  const newText = await readBodyText();
  const diff = computeDiff(lastText, newText, lastPoll);
  lastPoll = Date.now();
  if (!diff) return newText;

  lastText = newText;
  if (ONLINE || pending) {
    evBuffer.push(diff);
  }
  session.ev.push(diff);
  return newText;
}

// Append new session into flightRecord.sessions
async function updateSessions() {
  flightRecord.sessions.push(session);
  flightRecord.m.lastModified = Date.now();
  flightRecord.m.title = await getDocTitle();
  flightRecord.m.author = await getDocAuthor();

  xmlId = await saveCustomXml(flightRecord);    // New XML id
}

export async function startRecording() {
    if (recording) return;
    // setOnlineMode();
    failed = false;
    lastError = null;
    lastRetryMs = 0;
    blockReceipt = null;
    finalReceipt = null;
    posting = null;

    [docId, schema, xmlId] = await loadSettings();
    const sessionInitText = await readBodyText();

    if (ONLINE) {
      try {
        docState = await startDoc();
        if (isOfflineResponse(docState)) {
          switchOffline(docState);
        } else {
          sesState = await startSession(sessionInitText);
          if (isOfflineResponse(sesState)) {
            switchOffline(sesState);
          } else {
            evBuffer = [];
            lastPost = Date.now();
          }
        }
      } catch (error) {
        switchOffline(error);
      }
    }
    // Load existing record
    if (xmlId) {
        flightRecord = await loadRecord(xmlId);
    }

    // No docId, create new document
    if (!docId || !schema || !flightRecord) {
        console.log("Record load failed or is new, initializing fresh record...");
        flightRecord = await newRecord();
        await updateSettings("docId", flightRecord.m.docId);
        await updateSettings("v", 2);
    }

    // Start new session
    await initializeSession(sessionInitText);

    lastPoll = Date.now();
    lastText = sessionInitText;
        
    recording = true;

    poll();
}


export async function stopRecording() {
  if (!recording && !session) return;
  recording = false;

  try {
    if (posting) {
      await posting;
    }

    const finalText = await captureDiff();

    if (ONLINE) {
      if (evBuffer.length > 0) {
        const response = await flushBlock(finalText);
        if (isOfflineResponse(response)) {
          switchOffline(response);
          await updateSessions();
          return;
        }
      } else {
        const finalHash = await hashText(finalText);
        const { currentDocHash } = getSessionPostState();
        if (currentDocHash !== finalHash) {
          throw new Error("Final document state changed, but no pending events were captured for the record server.");
        }
      }
      finalReceipt = await endSession(finalText);
      if (isOfflineResponse(finalReceipt)) {
        switchOffline(finalReceipt);
      }
    }
    await updateSessions();
  } catch (error) {
    failRecording(error);
    throw error;
  }
}

export function getFlightRecord() {
  return flightRecord;
}
