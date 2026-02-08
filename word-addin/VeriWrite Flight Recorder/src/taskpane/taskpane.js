/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global document, Office, Word */

// Office.onReady((info) => {
//   if (info.host === Office.HostType.Word) {
//     document.getElementById("sideload-msg").style.display = "none";
//     document.getElementById("app-body").style.display = "flex";
//   }
// });


let flightRecord = {
  "v": 1,                       // (int) Schema version. Current: 1
  "m": {                        // (object) Metadata (short keys to reduce size)
    "t0": 0,        // (int) Start time in Unix epoch milliseconds
//    "sample": 200,              // (int) Polling interval in ms used by recorder (for reference)
    "title": "Essay"            // (string, optional) Document title
  },
  "init": "",                   // (string) Initial full text at recording start (stored once)
  "ev": [],                       // (array) Event stream (patch operations), in chronological order
  "kf": []                      // (array, optional) Keyframes for fast seeking; may be empty or omitted
}

let recording = false;
let lastPoll = Date.now();
let lastText = "";

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

async function readBodyText() {
  return Word.run(async (context) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text || "";
  });
}

async function startRecording() {
  if (recording) return;
  
  recording = true;
  console.log("Recording Started")

  try {
      const now = Date.now();
      const title = await getDocTitle();
      const initText = await readBodyText();
      
      flightRecord.m.t0 = now;
      flightRecord.m.title = title;
      flightRecord.init = initText;

      lastPoll = now;
      lastText = initText;
  } catch (error) {
      console.error("Recording Error: ", error);
  }

  poll();
}

async function poll() {
  if (!recording) return;

  try {
    const newText = await readBodyText();
    // Compute Difference
    const diff = computeDiff(lastText, newText, lastPoll);
    // If difference, log into flightRecord events
    if (diff) {
      flightRecord.ev.push(diff);
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

async function stopRecording() {
  recording = false;
  
  const duration = (Date.now() - flightRecord.m.t0) / 1000;
  console.log(`Recording stopped. Duration: ${duration}s. Events: ${flightRecord.ev.length}`);
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
    // document.getElementById("btnStop")?.addEventListener("click", stopRecording);
    document.getElementById("btnExport")?.addEventListener("click", () => {
      stopRecording();
      downloadJSON();
    });
});
