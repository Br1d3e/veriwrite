/**
 * @fileoverview Post recorded session blocks to record server.
 */

import { generateUUID, arraySum } from "./utils";
import { getDocAuthor, getDocTitle, readBodyText } from "./docInfo";
import { loadSettings, updateSettings } from "./store";

const SERVER_URL = "http://127.0.0.1:8000";
const PROTOCOL_VERSION = 3;
const AES_GCM_TAG_BYTES = 16;

let docId = null;
let sid = null;
let v = PROTOCOL_VERSION;
let st0 = 0;
let bSeq = 0;
let prevHash = null;
let sessionKey = null;

function resetSessionState() {
  sid = null;
  st0 = 0;
  bSeq = 0;
  prevHash = null;
  sessionKey = null;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function toHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

async function sha256Hex(input) {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(hashBuffer));
}

async function postJson(path, body) {
  const response = await fetch(`${SERVER_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Record server ${path} failed (${response.status}): ${detail}`);
  }

  return response;
}

async function genAEADKey() {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));

  return {
    key,
    keyB64: bytesToBase64(raw),
  };
}

async function encryptText(text, key, additionalData) {
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const aadBytes = new TextEncoder().encode(additionalData);
  const plaintextBytes = new TextEncoder().encode(text);
  const encryptedBytes = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: ivBytes,
        additionalData: aadBytes,
        tagLength: AES_GCM_TAG_BYTES * 8,
      },
      key,
      plaintextBytes
    )
  );

  return {
    ct: bytesToBase64(encryptedBytes.slice(0, -AES_GCM_TAG_BYTES)),
    iv: bytesToBase64(ivBytes),
    tag: bytesToBase64(encryptedBytes.slice(-AES_GCM_TAG_BYTES)),
  };
}

async function hashDocState() {
  return sha256Hex(await readBodyText());
}

async function hashCurrent(header, iv, ct, tag) {
  return sha256Hex(canonicalJson({ header, iv, ct, tag }));
}

async function ensureDocSettings() {
  const [storedDocId, storedVersion] = await loadSettings();
  docId = storedDocId;
  v = storedVersion ? Number(storedVersion) : PROTOCOL_VERSION;

  if (v !== PROTOCOL_VERSION) {
    throw new Error(`Unsupported VeriWrite protocol version: ${storedVersion}`);
  }

  if (!storedVersion) {
    await updateSettings("v", PROTOCOL_VERSION);
  }

  if (!docId) {
    docId = generateUUID();
    await updateSettings("docId", docId);
  }
}


export async function startDoc() {
  resetSessionState();
  await ensureDocSettings();

  const title = await getDocTitle();
  const author = await getDocAuthor();
  const t0 = Date.now();

  return postJson("/doc/start", {
    v,
    dId: docId,
    t0,
    ttl: title,
    a: author,
  });
}

export async function startSession() {
  if (!docId) {
    await ensureDocSettings();
  }

  resetSessionState();
  sid = generateUUID();
  st0 = Date.now();

  const initText = await readBodyText();
  const initHash = await sha256Hex(initText);
  const generatedKey = await genAEADKey();
  sessionKey = generatedKey.key;

  return postJson("/session/start", {
    v,
    dId: docId,
    sid,
    st0,
    sk: generatedKey.keyB64,
    it: initText,
    ih: initHash,
  });
}

export async function endSession() {
  if (!sid) {
    throw new Error("Cannot end session before startSession()");
  }

  const dt = Date.now() - st0;
  const endHash = await hashDocState();

  return postJson("/session/end", {
    v,
    dId: docId,
    sid,
    dt,
    eh: endHash,
    lbh: prevHash,
    bc: bSeq,
  });
}

export async function postBlock(arg1, arg2) {
  if (!sid || !sessionKey) {
    throw new Error("Cannot post block before startSession()");
  }

  const hasSeqOverride = Number.isInteger(arg1) && Array.isArray(arg2);
  const ev = hasSeqOverride ? arg2 : arg1;
  const q = hasSeqOverride ? arg1 : bSeq;
  const dt0 = Date.now() - st0;
  const dtn = arraySum((ev || []).map((e) => e[0] || 0));
  const header = {
    v,
    dId: docId,
    sid,
    q,
    ph: prevHash,
  };
  const rawPayload = {
    dt0,
    dtn,
    dsh: await hashDocState(),
    ev: ev || [],
  };
  const payloadText = canonicalJson(rawPayload);
  const headerText = canonicalJson(header);
  const { ct, iv, tag } = await encryptText(payloadText, sessionKey, headerText);
  const ch = await hashCurrent(header, iv, ct, tag);

  const response = await postJson("/session/block", {
    header,
    iv,
    ct,
    tag,
    ch,
  });

  prevHash = ch;
  bSeq = q + 1;

  return response;
}
