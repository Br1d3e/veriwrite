/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global document, Office, Word */


import { startRecording, stopRecording, getFlightRecord } from "./modules/recorder";



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

Office.onReady((info) => {
    if (info.host === Office.HostType.Word) {
      document.getElementById("sideload-msg").style.display = "none";
      document.getElementById("app-body").style.display = "flex";
    }
    document.getElementById("btnStart")?.addEventListener("click", startRecording);
    document.getElementById("btnExport")?.addEventListener("click", () => {
      stopRecording().then(() => downloadJSON());
    });
});
