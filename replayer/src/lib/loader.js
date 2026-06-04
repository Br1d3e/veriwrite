/**
 * @fileoverview
 * Data pre-process
 *
 * Input: Raw flightRecord.json or .vw file (after msgpack unpacking)
 * Outputs a normalized flightRecord js object
 */

import { Packr } from "msgpackr";

function dedupe(sessions) {
  // Remove duplicates by session ID
  for (var i = 1; i < sessions.length; i++) {
    const currId = sessions[i].sid ?? sessions[i].id;
    const prevId = sessions[i - 1].sid ?? sessions[i - 1].id;
    if (
      currId &&
      prevId &&
      currId === prevId
      // || sessions[i].t0 === sessions[i-1].t0
      // || sessions[i].tn === sessions[i-1].tn
      // || sessions[i].init === sessions[i-1].init
      // || sessions[i].ev === sessions[i-1].ev
    ) {
      sessions.splice(i, 1);
      i--;
    }
  }
  return sessions;
}

function sort(sessions) {
  // Sort sessions by t0
  sessions.sort((a, b) => a.t0 - b.t0);
  return sessions;
}

// Escape Microsoft Word Chars
function normalizeLines(s) {
  return String(s)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n") // Hard Break
    .replace(/\u000b/g, "\n"); // Soft Break
}

function normalizeRecord(sessions) {
  for (let i = 0; i < sessions.length; i++) {
    sessions[i].init = normalizeLines(sessions[i].init);
    for (let j = 0; j < sessions[i].ev.length; j++) {
      sessions[i].ev[j][3] = normalizeLines(sessions[i].ev[j][3]);
    }
  }
  return sessions;
}

export function processData(flightRecord) {
  let newRecord = flightRecord;
  let sessions = newRecord.sessions || newRecord.s;
  sessions = dedupe(sessions);
  sessions = normalizeRecord(sessions);
  sessions = sort(sessions);
  return newRecord;
}

export function checkStruct(flightRecord, protocolVer) {
  if (protocolVer === 2) {
    const v = flightRecord.v ?? null;
    const m = flightRecord.m ?? null;
    const sessions = flightRecord.sessions ?? null;

    return (
      flightRecord &&
      v === protocolVer &&
      m &&
      sessions &&
      typeof sessions === "object"
    );
  } else if (protocolVer === 3) {
    const v = flightRecord.v ?? null;
    const m = flightRecord.m ?? null;
    const s = flightRecord.s ?? flightRecord.sessions;

    return (
      flightRecord &&
      v === protocolVer &&
      m &&
      s &&
      typeof m === "object" &&
      typeof s === "object"
    );
  }
}

export function recordFileType(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".json") || name.endsWith(".flightrecord")) {
    return "json";
  } else if (name.endsWith(".vw")) {
    return "vw";
  } else {
    return "unknown";
  }
}

export function isVwContainer(bytes) {
  const magic = new TextDecoder().decode(bytes.slice(0, 4));
  const version = bytes[4];
  return magic === "VWFR" && version === 1;
}

export function decodeVwContainer(bytes) {
  const binaryPayload = bytes.slice(5);
  const packr = new Packr();
  return packr.unpack(binaryPayload);
}
