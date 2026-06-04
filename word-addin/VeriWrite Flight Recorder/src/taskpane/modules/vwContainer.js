import { Packr } from "msgpackr";

const magic = new TextEncoder().encode("VWFR");
const version = new Uint8Array([1]);

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

export function serializeRecord(flightRecord) {
  const packr = new Packr(); // TODO: insert with flightRecord structure
  const packed = packr.pack(flightRecord);
  return packed;
}

export function deserializeRecord(bytes) {
  const packr = new Packr();
  const record = packr.unpack(bytes);
  return record;
}

export function wrapVwContainer(flightRecord) {
  const packedRecord = serializeRecord(flightRecord);
  return concatUint8Arrays([magic, version, packedRecord]);
}
