
import { generateUUID, b64Encoder, b64Decoder, computeDiff } from "./utils";
import { saveCustomXml, loadSettings, loadRecord, updateSettings} from "./store";
import { getDocTitle, getDocAuthor, readBodyText } from "./docInfo";
import { startDoc, startSession, endSession, postBlock, hashText, getSessionPostState } from "./post";

// Initialize record
let flightRecord = null;
let session = null;
let docId = null;
let schema = null;
let xmlId = null;
// Recorder States
let ONLINE = true;
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

export function setOnlineMode(value) {
  if (recording) return;
  ONLINE = Boolean(value);
}

export function isOnlineMode() {
  return ONLINE;
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

// Creates new flightRecord.json
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

async function initializeSession() {
  session = {
    id: `s${flightRecord.sessions.length + 1}`,
    t0: Date.now(),
    tn: Date.now(),
    init: await readBodyText(),
    ev: [],
    kf: [],
    stats: {},
    prevHash: null,
    endHash: null
  };
}

async function flushBlock(docText) {
  if (posting) {
    await posting;
  }
  if (evBuffer.length === 0) return null;

  const blockEvents = evBuffer;
  evBuffer = [];

  posting = postBlock(blockEvents, docText)
    .then((receipt) => {
      blockReceipt = receipt;
      lastPost = Date.now();
      return receipt;
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

async function poll() {
  if (!recording || failed) return;

  try {
    const currentText = await captureDiff();

    if (ONLINE && evBuffer.length > 0 && Date.now() - lastPost >= postInterval) {
      await flushBlock(currentText);
    }
  } catch (error) {
    console.error("Polling Error: ", error);
    failRecording(error);
  }

  // Poll again (rate 200ms)
  if (recording && !failed) {
    setTimeout(poll, 200);
  }
}

async function captureDiff() {
  const newText = await readBodyText();
  const diff = computeDiff(lastText, newText, lastPoll);
  lastPoll = Date.now();
  if (!diff) return newText;

  lastText = newText;
  if (ONLINE) {
    evBuffer.push(diff);
  } else {
    session.ev.push(diff);
  }
  return newText;
}

// Append new session into flightRecord.sessions
async function updateSessions() {
  flightRecord.sessions.push(session);
  flightRecord.m.lastModified = Date.now();
  flightRecord.m.title = await getDocTitle();
  flightRecord.m.author = await getDocAuthor();

  xmlId = saveCustomXml(flightRecord);    // New XMl id
}

export async function startRecording() {
    if (recording) return;
    ONLINE = isOnlineMode();
    failed = false;
    lastError = null;
    blockReceipt = null;
    finalReceipt = null;
    posting = null;

    [docId, schema, xmlId] = await loadSettings();

    if (ONLINE) {
      docState = await startDoc();
      sesState = await startSession();
      evBuffer = [];
      lastPost = Date.now();
    } else {
      // Load existing record
      if (xmlId) {
          flightRecord = await loadRecord(xmlId);
      }

      // No docId, create new document
      if (!docId || !schema || !flightRecord) {
          console.log("Record load failed or is new, initializing fresh record...");
          flightRecord = await newRecord();
          await updateSettings("docId", flightRecord.m.docId);
          await updateSettings("v", flightRecord.v);
      }

      // Start new session
      await initializeSession();
    }

    lastPoll = Date.now();
    const initText = await readBodyText()
    lastText = initText;
        
    recording = true;

    poll();
}


export async function stopRecording() {
  if (!recording) return;
  recording = false;

  try {
    if (posting) {
      await posting;
    }

    const finalText = await captureDiff();

    if (ONLINE) {
      if (evBuffer.length > 0) {
        await flushBlock(finalText);
      } else {
        const finalHash = await hashText(finalText);
        const { currentDocHash } = getSessionPostState();
        if (currentDocHash !== finalHash) {
          throw new Error("Final document state changed, but no pending events were captured for the record server.");
        }
      }
      finalReceipt = await endSession(finalText);
    } else {
      await updateSessions();
    }
  } catch (error) {
    console.error("Stop Recording Error: ", error);
    failRecording(error);
    throw error;
  }
}


export function getFlightRecord() {
  return flightRecord;
}
