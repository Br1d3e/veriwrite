/**
 * @fileoverview
 * Data pre-process
 *
 * Input: Raw flightRecord.json or .vw file (after msgpack unpacking)
 * Outputs a normalized flightRecord js object
 */

import { Packr } from "msgpackr";

const flightRecordStructures = [
  ["v", "m", "sessions"],
  ["docId", "created", "lastModified", "title", "author"],
  ["sid", "t0", "tn", "init", "ev", "fullOnline", "localPh", "localEh"],
];
const recordUnpackr = new Packr({ mapsAsObjects: true, useRecords: false });
const legacyRecordUnpackr = new Packr({
  structures: flightRecordStructures.map((structure) => structure.slice()),
});

function dedupe(sessions) {
  // Remove duplicates by session ID
  const seenIds = new Set();
  return sessions.filter((session) => {
    const sessionId = session.sid ?? session.id;
    if (!sessionId) return true;

    if (seenIds.has(sessionId)) {
      return false;
    }

    seenIds.add(sessionId);
    return true;
  });
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
    sessions[i].init = normalizeLines(sessions[i].init ?? "");
    const ev = Array.isArray(sessions[i].ev) ? sessions[i].ev : [];
    sessions[i].ev = ev;

    for (let j = 0; j < ev.length; j++) {
      ev[j][3] = normalizeLines(ev[j][3] ?? "");
    }
  }
  return sessions;
}

export function processData(flightRecord) {
  let newRecord = flightRecord;
  let sessions = newRecord.sessions || newRecord.s || [];
  sessions = dedupe(sessions);
  sessions = normalizeRecord(sessions);
  sessions = sort(sessions);
  newRecord.sessions = sessions;
  if (newRecord.s) {
    newRecord.s = sessions;
  }
  return newRecord;
}

export function checkStruct(flightRecord, protocolVer) {
  if (protocolVer === 2) {
    const v = flightRecord.v ?? null;
    const m = flightRecord.m ?? null;
    const sessions = flightRecord.sessions ?? null;

    return flightRecord && v === protocolVer && m && Array.isArray(sessions);
  } else if (protocolVer === 3) {
    const v = flightRecord.v ?? null;
    const m = flightRecord.m ?? null;
    const s = flightRecord.s ?? flightRecord.sessions;

    return (
      flightRecord &&
      v === protocolVer &&
      m &&
      typeof m === "object" &&
      Array.isArray(s)
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
  if (!(bytes instanceof Uint8Array) || bytes.length < 39) return false;
  const magic = new TextDecoder().decode(bytes.slice(0, 4));
  const version = bytes[4];
  const codecId = bytes[5];
  const recordStart = bytes[6];
  return (
    magic === "VWFR" &&
    version === 1 &&
    codecId === 1 &&
    recordStart >= 39 &&
    recordStart < bytes.length
  );
}

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export async function verifyHash(bytes) {
  const recordStart = bytes[6];
  const givenHash = bytes.slice(7, recordStart);
  const binaryPayload = bytes.slice(recordStart);
  const computedHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", binaryPayload),
  );

  return bytesEqual(givenHash, computedHash);
}

export function decodeVwContainer(bytes) {
  const recordStart = bytes[6];
  const binaryPayload = bytes.slice(recordStart);

  try {
    return recordUnpackr.unpack(binaryPayload);
  } catch {
    return legacyRecordUnpackr.unpack(binaryPayload);
  }
}
