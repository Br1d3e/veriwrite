import { Packr } from "msgpackr";

const magic = new TextEncoder().encode("VWFR");
const version = new Uint8Array([1]);
const codecId = new Uint8Array([1]);
const flightRecordStructures = [
  ["v", "m", "sessions"],
  ["docId", "created", "lastModified", "title", "author"],
  ["sid", "t0", "tn", "init", "ev", "fullOnline", "localPh", "localEh"],
];
const recordPackr = new Packr({ mapsAsObjects: true, useRecords: false });
const legacyRecordUnpackr = new Packr({
  structures: flightRecordStructures.map((structure) => structure.slice()),
});

function concatUint8Arrays(arrays) {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function sha256Bytes(bytes) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

export function serializeRecord(flightRecord) {
  const packed = recordPackr.pack(flightRecord);
  return packed;
}

export function deserializeRecord(bytes) {
  try {
    return recordPackr.unpack(bytes);
  } catch {
    return legacyRecordUnpackr.unpack(bytes);
  }
}

export async function wrapVwContainer(flightRecord) {
  const packedRecord = serializeRecord(flightRecord);
  const hash = await sha256Bytes(packedRecord);
  const recordStart = new Uint8Array([4 + 1 + 1 + 1 + hash.length]); // header + record length + hash
  return concatUint8Arrays([magic, version, codecId, recordStart, hash, packedRecord]);
}
