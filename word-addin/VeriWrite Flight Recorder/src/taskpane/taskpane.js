/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global document, Office, Word */

import { startRecording, stopRecording, getFlightRecord, getOnlineStatus, setOnlineMode, getPostState, getEvBlock, getRetryStatus } from "./modules/recorder";

let lastManualSwitchAt = 0;
const msgDuration = 3000;

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
    // const reachable = await isUserOnline();
    // setOnlineMode(Boolean(onlineCb?.checked) && reachable);
    // if (onlineCb) onlineCb.checked = Boolean(onlineCb.checked) && reachable;
    onlineCb?.addEventListener("change", () => {
     switchOnlineCb();
    })
    showRetryMsg();
    autoSwitchMsg();
    setInterval(showRetryMsg, 500);
    setInterval(autoSwitchMsg, 1000);
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
  const cbMsgEl = document.getElementById("cb-msg");
  lastManualSwitchAt = Date.now();
  setOnlineMode(onlineCb.checked);
  const onlineMsg = "✅ Successfully switched to online mode.";
  const offlineMsg = "✅ Successfully switched to offline mode."
  if (onlineCb.checked) {
    cbMsgEl.textContent = onlineMsg;
  } else {
    cbMsgEl.textContent = offlineMsg;
  }
  setTimeout(() => {
    if (cbMsgEl.textContent === onlineMsg || cbMsgEl.textContent === offlineMsg) {
      cbMsgEl.textContent = "";
    }
  }, msgDuration)
}

async function autoSwitchMsg() {
  if (Date.now() - lastManualSwitchAt < msgDuration) {
    return;
  }

  const onlineCb = document.getElementById("onlineCb");
  const cbMsgEl = document.getElementById("cb-msg");
  const onlineStatus = getOnlineStatus();
  const onlineMsg = "✅ Detected Internet! Automatically switched to online mode.";
  const offlineMsg = "❗ No network access! Automatically switched to offline mode.";

  if (onlineStatus === "ONLINE_AUTO") {
    onlineCb.checked = true;
    cbMsgEl.textContent = onlineMsg;
    setTimeout(() => {
      if (cbMsgEl.textContent === onlineMsg) {
        cbMsgEl.textContent = "";
      }
    }, msgDuration)
  } else if (onlineStatus === "OFFLINE_AUTO") {
    onlineCb.checked = false;
    cbMsgEl.textContent = offlineMsg;
    setTimeout(() => {
      if (cbMsgEl.textContent === offlineMsg) {
        cbMsgEl.textContent = "";
      }
    }, msgDuration)
  }
}

function showRetryMsg() {
  const onlineMsgEl = document.getElementById("retry-msg");
  const retryStatus = getRetryStatus();

  if (retryStatus) {
    const { error, retryMs, retrying } = retryStatus;
    const seconds = Math.round((retryMs || 0) / 1000);
    onlineMsgEl.textContent = retrying
      ? `Reconnecting to record server... ${seconds}s`
      : `Connection Failed! Switched to offline recording.`;
  } else {
    onlineMsgEl.textContent = "";
  }
}
