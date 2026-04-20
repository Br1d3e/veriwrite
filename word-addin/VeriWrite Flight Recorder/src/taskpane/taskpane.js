/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global document, Office, Word */

import { startRecording, stopRecording, getFlightRecord, isOnlineMode, setOnlineMode, getPostState, getEvBlock, getOnlineCb, isDisconnected } from "./modules/recorder";
import { isUserOnline } from "./modules/utils";

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

setOnlineMode(isUserOnline());
Office.onReady((info) => {
    if (info.host === Office.HostType.Word) {
      document.getElementById("sideload-msg").style.display = "none";
      document.getElementById("app-body").style.display = "flex";
    }
    const onlineCb = document.getElementById("onlineCb");
    getOnlineCb(onlineCb);
    document.getElementById("btnStart")?.addEventListener("click", startRecording);
    document.getElementById("btnStop")?.addEventListener("click", async () => {
        await stopRecording() 
        if (!isOnlineMode()) {
          downloadJSON()
        }
    })
    setOnlineMode(Boolean(onlineCb?.checked));
    onlineCb?.addEventListener("change", () => {
     switchOnlineCb();
    })
    setInterval(showOfflineMsg, 500);
    // setInterval(debugState, 100);
  });

function debugState() {
  // Debug
  const postStateEl = document.getElementById("post-state")
  postStateEl.textContent = JSON.stringify(getPostState(), null, 2);
  // const evBlockEl = document.getElementById("ev-block");
  // evBlockEl.textContent = JSON.stringify(getEvBlock(), null, 2);
}

function switchOnlineCb() {
  const onlineCb = document.getElementById("onlineCb");
  const cbMsgEl = document.getElementById("cb-msg");
  setOnlineMode(onlineCb.checked);
  if (onlineCb.checked) {
    if (isUserOnline) {
      cbMsgEl.textContent = "✅ Successfully switched to online mode.";
    } else {
      cbMsgEl.textContent = "❗Warning: you are currently offline. Connect to the internet to use online mode."
    }
  } else {
    cbMsgEl.textContent = "✅ Successfully switched to offline mode.";
  }
  setTimeout(() => {
    cbMsgEl.textContent = "";
  }, 3000)
}

function showOfflineMsg() {
  const offlineMsgEl = document.getElementById("offline-msg");
  const disconnected = isDisconnected();

  if (disconnected) {
    const { error, retryMs, retrying } = disconnected;
    const seconds = Math.round((retryMs || 0) / 1000);
    offlineMsgEl.textContent = retrying
      ? `Reconnecting to record server... ${seconds}s`
      : `Connection Failed! Switched to offline recording.`;
  } else {
    offlineMsgEl.textContent = "";
  }
}
