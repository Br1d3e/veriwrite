/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global document, Office, Word */


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


// uuid generator
function generateUUID() {
  return crypto.randomUUID();
}

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

function b64Encoder(str) {
  const bytes = new TextEncoder().encode(str); // Uint8Array
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin); // base64 string
}

function b64Decoder(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Saves flightRecord.json at Word's CustomXmlPart Interface
 * 
 * @param {object} record - The flightRecord file
 */
async function saveCustomXml(record) {
  const json = JSON.stringify(record);
  const b64 = b64Encoder(json);   // Encode with base64
  const xml = `<vw xmlns="urn:veriwrite:v2"><b64>${b64}</b64></vw>`;
  try {
    await(Word.run(async (context) => {
      const settings = context.document.settings;
      await context.sync();
      
      // Replace original xml part
      const existingId = settings.getItemOrNullObject('xmlId');
      if (existingId) {
        context.document.customXmlParts.getById(existingId).delete();
      }

      const recordXml = context.document.customXmlParts.add(xml);
      recordXml.load("id");
      await context.sync();
      settings.set("xmlId", recordXml.id);
      await context.sync();
      xmlId = recordXml.id;
    }))
  } catch(err) {
    console.log("Error saving custom xml: ", err)
  }
}

// Load Settings: v, m.docId, xmlId
async function loadSettings() {
  try {
    await Word.run(async (context) => {
      const settings = context.document.settings;
      await context.sync()
      docId = settings.getItemOrNullObject('docId') ?? null;
      schema = settings.getItemOrNullObject('v') ?? null;
      xmlId = settings.getItemOrNullObject('xmlId') ?? null;
      // No docId, create new flightRecord
      if (!docId || !schema) {
        flightRecord = await newRecord();
        settings.set('docId', flightRecord.m.docId);  // Update Settings
        settings.set('v', flightRecord.v);
        await context.sync();
      }
      // No xmlId
      if (!xmlId) {
        await saveCustomXml(flightRecord);
      } else {
        await loadRecord();
      }
    })
  } catch(err) {
    console.log(`Error loading settings: ${err}`);
  }
}

// Load flightRecord from XML
async function loadRecord() {
  try {
    await Word.run(async (context) => {
      const settings = context.document.settings;
      const xmlId = settings.getItemOrNullObject('xmlId');
      await context.sync();
      if (!xmlId) return;
      // Extract XML
      const xmlPart =context.document.customXmlParts.getById(xmlId);
      const xml = xmlPart.getXml();
      await context.sync();
      // Parse XML
      const xmlStr = xml.value;
      const xmlDoc = new DOMParser().parseFromString(xmlStr, "text/xml");
      const b64 = xmlDoc.getElementsByTagName("b64")[0].textContent;
      const json = b64Decoder(b64);
      flightRecord = JSON.parse(json);
    })
  } catch(err) {
    console.log(`Error loading record: ${err}`);
  }
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


/**
 * Compares two input texts, generates [dt, pos, delLen, ins]
 * @param {string} oldText - 上一次轮询的文本
 * @param {string} newText - 当前读取的文本
 * @param {number} lastPollTime - 上一次记录的时间戳
 * @returns {Array | null} - 返回 tuple 或 null (如果没有变化)
 */
function computeDiff(oldText, newText, lastPoll) {
    const now = Date.now();
    const dt = now - lastPoll;

    // No change at all, return nothing
    if (oldText === newText) {
        return null;
    }
    
    // Find length of common prefix
    let p = 0;
    while (p < oldText.length && p < newText.length && oldText[p] === newText[p]) {
         p++;
    }
    
    // Find length of common suffix
    let s = 0;
    let i = oldText.length - 1;
    let j = newText.length - 1;
    while (i >= p && j >= p && oldText[i] === newText[j]) {
        s++;
        i--;
        j--;
    }

    // Compute Differences
    const pos = p;
    const delLen = oldText.length - p - s;
    const ins = newText.slice(p, newText.length - s);

    if (delLen === 0 && ins === "") return null;

    return [dt, pos, delLen, ins];
}


async function getDocTitle() {
  try {
    return await Word.run(async (context) => {
      const props = context.document.properties;
      props.load("title");
      await context.sync();
      return props.title || "Untitled";
    });
  } catch {
    return "Untitled";
  }
}

async function getDocAuthor() {
  try {
    return await Word.run(async (context) => {
      const props = context.document.properties;
      props.load("author");
      await context.sync();
      return props.author || "Unknown";
    });
  } catch {
    return "Unknown";
  }
}

async function readBodyText() {
  return Word.run(async (context) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text || "";
  });
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

  await saveCustomXml(flightRecord);
}

async function startRecording() {
  if (recording) return;

  await loadSettings();

  // If failed to loadSettings, create new Record
  if (!flightRecord) {
      console.log("Record load failed or is new, initializing fresh record...");
      flightRecord = await newRecord();
  }

  await initializeSession();

  lastPoll = Date.now();
  const initText = await readBodyText()
  lastText = initText;
    
  recording = true;
  console.log("Recording Started")

  poll();
}


async function stopRecording() {
  recording = false;
  
  const duration = (Date.now() - session.t0) / 1000;
  session.tn = Date.now();
  console.log(`Recording stopped. Duration: ${duration}s. Events: ${session.ev.length}`);

  await updateSession();
}


function downloadJSON() {
  const blob = new Blob([JSON.stringify(flightRecord, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  const safeTitle = (flightRecord.m.title || "session").replace(/[^\w\-]+/g, "_");
  a.href = URL.createObjectURL(blob);
  a.download = `${safeTitle}.flightrecord.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

Office.onReady((info) => {
    if (info.host === Office.HostType.Word) {
      document.getElementById("sideload-msg").style.display = "none";
      document.getElementById("app-body").style.display = "flex";
    }
    document.getElementById("btnStart")?.addEventListener("click", startRecording);
    document.getElementById("btnExport")?.addEventListener("click", () => {
      stopRecording();
      downloadJSON();
    });
});
