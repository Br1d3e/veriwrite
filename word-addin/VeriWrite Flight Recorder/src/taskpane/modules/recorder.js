
import { generateUUID, b64Encoder, b64Decoder, computeDiff } from "./utils";
import { saveCustomXml, loadSettings, loadRecord, updateSettings} from "./store";
import { getDocTitle, getDocAuthor, readBodyText } from "./docInfo";
import { startDoc, startSession, endSession, postBlock } from "./post";

// Initialize record
let flightRecord = null;
let session = null;
let docId = null;
let schema = null;
let xmlId = null;
// Recorder States
let recording = false;
let lastPoll = Date.now();
let lastText = "";



// Creates new flightRecord.json
async function newRecord() {
  let flightRecord = {
    "v": 2,
    "m": {
      "docId": generateUUID(),
      "created": Date.now(),
      "lastModified": Date.now(),
      "title": await getDocTitle(),
      "author": await getDocAuthor()
    },
    "sessions": []
  }
  return flightRecord;
}



async function initializeSession() {
  session = {
    "id": `s${flightRecord.sessions.length + 1}`,
    "t0": Date.now(),
    "tn": Date.now(),
    "init": await readBodyText(),
    "ev": [],
    "kf": [],
    "stats": {},
    "prevHash": null,
    "endHash": null
  };
}


async function poll() {
  if (!recording) return;

  try {
    const newText = await readBodyText();
    // Compute Difference
    const diff = computeDiff(lastText, newText, lastPoll);
    // If difference, log into session events
    if (diff) {
      session.ev.push(diff);
      lastPoll = Date.now();
      lastText = newText;
      console.log("Captured Difference: ", diff);
    }
  } catch (error) {
    console.error("Polling Error: ", error);
  }

  // Poll again (rate 100ms)
  if (recording) {
    setTimeout(poll, 100);
  }
}

// Append new session into flightRecord.sessions
async function updateSession() {
  flightRecord.sessions.push(session);
  flightRecord.m.lastModified = Date.now();
  flightRecord.m.title = await getDocTitle();
  flightRecord.m.author = await getDocAuthor();

  xmlId = saveCustomXml(flightRecord);    // New XMl id
}

export async function startRecording() {
    if (recording) return;

    [docId, schema, xmlId] = await loadSettings();

    // // Load existing record
    // if (xmlId) {
    //     flightRecord = await loadRecord(xmlId);
    // }

    // No docId, create new document
    await startDoc();

    // Start new session
    // await initializeSession();
    await startSession();

    lastPoll = Date.now();
    const initText = await readBodyText()
    lastText = initText;
        
    recording = true;
    console.log("Recording Started")

    poll();
}


export async function stopRecording() {
  recording = false;
  
  const duration = (Date.now() - session.t0) / 1000;
  session.tn = Date.now();
  console.log(`Recording stopped. Duration: ${duration}s. Events: ${session.ev.length}`);

  await endSession();
  // await updateSession();
}


export function getFlightRecord() {
  return flightRecord;
}