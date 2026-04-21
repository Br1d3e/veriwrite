/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global document, Office, Word */

import { startRecording, stopRecording, getFlightRecord, getOnlineStatus, setOnlineMode, getPostState, getEvBlock, getRetryStatus } from "./modules/recorder";

let lastManualSwitchAt = 0;
const msgDuration = 5000;
let lastAutoStatus = null;
let cbMsgTimeout = null;
let lastRetryKey = null;
let retryMsgTimeout = null;

function setCbMessage(message) {
  const cbMsgEl = document.getElementById("cb-msg");
  if (!cbMsgEl) return;
  cbMsgEl.textContent = message;
  if (cbMsgTimeout) {
    clearTimeout(cbMsgTimeout);
  }
  cbMsgTimeout = setTimeout(() => {
    if (cbMsgEl.textContent === message) {
      cbMsgEl.textContent = "";
    }
    cbMsgTimeout = null;
  }, msgDuration);
}

function setRetryMessage(message) {
  const retryMsgEl = document.getElementById("retry-msg");
  if (!retryMsgEl) return;
  retryMsgEl.textContent = message;
  if (retryMsgTimeout) {
    clearTimeout(retryMsgTimeout);
  }
  retryMsgTimeout = setTimeout(() => {
    if (retryMsgEl.textContent === message) {
      retryMsgEl.textContent = "";
    }
    retryMsgTimeout = null;
  }, msgDuration);
}

function downloadJSON() {
  const flightRecord = getFlightRecord();
  if (!flightRecord) return;

  const blob = new Blob([JSON.stringify(flightRecord, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  const safeTitle = (flightRecord.m.title || "session").replace(/[^\w\-]+/g, "_");
  a.href = URL.createObjectURL(blob);
  a.download = `${safeTitle}.flightrecord.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

Office.onReady(async (info) => {
    if (info.host === Office.HostType.Word) {
      document.getElementById("sideload-msg").style.display = "none";
      document.getElementById("app-body").style.display = "flex";
    }
    const onlineCb = document.getElementById("onlineCb");
    document.getElementById("btnStart")?.addEventListener("click", startRecording);
    document.getElementById("btnStop")?.addEventListener("click", async () => {
        await stopRecording() 
        if (getOnlineStatus() !== "ONLINE" && getOnlineStatus() !== "ONLINE_AUTO") {
          downloadJSON()
        }
    })
    onlineCb?.addEventListener("change", () => {
     switchOnlineCb();
    })
    setInterval(showRetryMsg, 500);
    setInterval(autoSwitchMsg, 500);
    // setInterval(debugState, 100);
  });

function debugState() {
  // Debug
  const postStateEl = document.getElementById("post-state")
  postStateEl.textContent = JSON.stringify(getPostState(), null, 2);
  // const evBlockEl = document.getElementById("ev-block");
  // evBlockEl.textContent = JSON.stringify(getEvBlock(), null, 2);
}

async function switchOnlineCb() {
  const onlineCb = document.getElementById("onlineCb");
  lastManualSwitchAt = Date.now();
  setOnlineMode(onlineCb.checked);
  const onlineMsg = "✅ Successfully switched to online mode.";
  const offlineMsg = "✅ Successfully switched to offline mode."
  if (onlineCb.checked) {
    setCbMessage(onlineMsg);
  } else {
    setCbMessage(offlineMsg);
  }
}

async function autoSwitchMsg() {
  if (Date.now() - lastManualSwitchAt < msgDuration) {
    return;
  }

  const onlineCb = document.getElementById("onlineCb");
  const onlineStatus = getOnlineStatus();
  const onlineMsg = "✅ Detected Internet! Automatically switched to online mode.";
  const offlineMsg = "❗ No network access! Automatically switched to offline mode.";

  if (onlineStatus === lastAutoStatus) {
    return;
  }

  if (onlineStatus === "ONLINE_AUTO") {
    onlineCb.checked = true;
    setCbMessage(onlineMsg);
  } else if (onlineStatus === "OFFLINE_AUTO") {
    onlineCb.checked = false;
    setCbMessage(offlineMsg);
  }
  lastAutoStatus = onlineStatus;
}

function showRetryMsg() {
  const retryStatus = getRetryStatus();

  if (retryStatus) {
    const { retryMs, retrying } = retryStatus;
    const seconds = Math.round((retryMs || 0) / 1000);
    const message = retrying
      ? `Reconnecting to record server... ${seconds}s`
      : `Connection Failed! Switched to offline recording.`;
    const retryKey = retrying ? `retrying:${seconds}` : "offline";
    if (retryKey !== lastRetryKey) {
      setRetryMessage(message);
      lastRetryKey = retryKey;
    }
  } else {
    const retryMsgEl = document.getElementById("retry-msg");
    if (retryMsgEl) {
      retryMsgEl.textContent = "";
    }
    if (retryMsgTimeout) {
      clearTimeout(retryMsgTimeout);
      retryMsgTimeout = null;
    }
    lastRetryKey = null;
  }
}
