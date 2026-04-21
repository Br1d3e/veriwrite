/**
 * @fileoverview Post recorded session blocks to record server.
 */

import { generateUUID, arraySum, SERVER_URL } from "./utils";
import { getDocAuthor, getDocTitle, readBodyText } from "./docInfo";
import { loadSettings, updateSettings } from "./store";

const PROTOCOL_VERSION = 3;
const AES_GCM_TAG_BYTES = 16;
export const OFFLINE_STATUS = "OFFLINE_LOCAL";

let docId = null;
let sid = null;
let v = PROTOCOL_VERSION;
let st0 = 0;
let bSeq = 0;
let prevHash = null;
let sessionKey = null;
let currentDocHash = null;
let challenge = null;
let serverDocReady = false;
let serverSessionReady = false;

let retrying = false;
let retryStart = 0;
let retryLastMs = 0;
const retryTimeout = 5_000;
const retryInterval = 1_000;
const requestTimeout = 1_000;

export function resetSessionState() {
  sid = null;
  st0 = 0;
  bSeq = 0;
  prevHash = null;
  sessionKey = null;
  currentDocHash = null;
  challenge = null;
  serverSessionReady = false;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binaryBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Uint8Array(binaryBytes);
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

export async function hashText(text) {
  return sha256Hex(text);
}

export function getRetryMs() {
  if (!retrying) return null;
  return Date.now() - retryStart;
}

async function postJson(path, body) {
  let response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeout);
  try {
    response = await fetch(`${SERVER_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    // throw new Error(`Record server is unreachable at ${SERVER_URL}. Start backend/record_server before using online mode.`);
    return;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text();
    // throw new Error(`Record server ${path} failed (${response.status}): ${detail}`);
    return;
  }

  return response.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function genECDHKey() {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const rawPub = new Uint8Array(await crypto.subtle.exportKey("raw", publicKey));

  return {
    privKey: privateKey,
    pubKeyB64: bytesToBase64(rawPub),
  };
}

async function deriveSessionKey(clientPrivateKey, serverPublicKeyBytes, saltB64, info) {
  const serverPublicKey = await crypto.subtle.importKey(
    "raw",
    serverPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: serverPublicKey },
    clientPrivateKey,
    256
  );

  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: base64ToBytes(saltB64),
      info: new TextEncoder().encode(canonicalJson(info)),
    },
    hkdfKey,
    256
  );

  return crypto.subtle.importKey(
    "raw",
    derivedBits,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
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

async function hashDocText(docText) {
  if (typeof docText === "string") return sha256Hex(docText);
  return hashDocState();
}

async function hashCurrent(header, challenge, iv, ct, tag) {
  return sha256Hex(canonicalJson({ header, challenge, iv, ct, tag }));
}

async function ensureDocSettings() {
  const [storedDocId, storedVersion] = await loadSettings();
  docId = storedDocId;
  const parsedVersion = storedVersion ? Number(storedVersion) : null;
  v = PROTOCOL_VERSION;

  if (parsedVersion !== PROTOCOL_VERSION) {
    if (storedVersion) {
      console.warn(`Migrating VeriWrite protocol setting from v${storedVersion} to v${PROTOCOL_VERSION}`);
    }
    await updateSettings("v", PROTOCOL_VERSION);
  }

  if (!docId) {
    docId = generateUUID();
    await updateSettings("docId", docId);
  }
}

async function retryPost(response, path, body) {
  if (response && response.status) {
    return response;
  }

  retrying = true;
  retryStart = Date.now();
  retryLastMs = 0;

  try {
    while (Date.now() - retryStart < retryTimeout) {
      response = await postJson(path, body);
      if (response && response.status) {
        return response;
      }
      await sleep(retryInterval);
    }
  } finally {
    retryLastMs = Date.now() - retryStart;
    retrying = false;
  }

  return {
    status: OFFLINE_STATUS,
    op: path.replace(/^\//, ""),
    retryMs: retryLastMs,
  };
}

function assertOnlineResponse(response, op) {
  if (!response || !response.status) {
    throw new Error(`${op} did not receive a valid record server response`);
  }
  return response;
}

export function docReady() {
    return serverDocReady;
}

export function sessionReady() {
    return serverDocReady && serverSessionReady;
}

export async function startDoc() {
  resetSessionState();
  serverDocReady = false;
  await ensureDocSettings();

  const title = await getDocTitle();
  const author = await getDocAuthor();
  const t0 = Date.now();
  const path = "/doc/start";
  const body = {
    v,
    dId: docId,
    t0,
    ttl: title,
    a: author,
  }

  let response = await postJson(path, body);
  response = await retryPost(response, path, body)
  response = assertOnlineResponse(response, "doc/start");
  if (response.status === OFFLINE_STATUS) return response;
  if (response.status !== "SUCCESS") {
    throw new Error(`Record server rejected doc start: ${JSON.stringify(response)}`);
  }
  serverDocReady = true;
  return response;
}

export async function startSession(initTextOverride = null) {
  if (!docId) {
    await ensureDocSettings();
  }
  if (!serverDocReady) {
    throw new Error("Cannot start server session before server doc is ready");
  }

  resetSessionState();
  sid = generateUUID();
  st0 = Date.now();

  const initText = typeof initTextOverride === "string" ? initTextOverride : await readBodyText();
  const initHash = await sha256Hex(initText);
  const generatedKey = await genECDHKey();
  currentDocHash = initHash;

  const path = "/session/start";
  const body = {
    v,
    dId: docId,
    sid,
    st0,
    cp: generatedKey.pubKeyB64,
    it: initText,
    ih: initHash,
  }

  let response = await postJson(path, body);
  response = await retryPost(response, path, body)
  response = assertOnlineResponse(response, "session/start");
  if (response.status === OFFLINE_STATUS) return response;

  if (response.status && response.status !== "SUCCESS") {
    throw new Error(`Record server rejected session start: ${JSON.stringify(response)}`);
  }
  
  const sKeyInfo = response.s_key;
  const serverPub = base64ToBytes(sKeyInfo.sp);
  const salt = sKeyInfo.salt;
  const info = sKeyInfo.info;
  sessionKey = await deriveSessionKey(generatedKey.privKey, serverPub, salt, info);

  challenge = response.challenge;
  serverSessionReady = true;

  return response;
}

export async function endSession(docText = null) {
  if (!sid) {
    throw new Error("Cannot end session before startSession()");
  }

  const dt = Date.now() - st0;
  const endHash = await hashDocText(docText);
  const path = "/session/end";
  const body = {
    v,
    dId: docId,
    sid,
    dt,
    eh: endHash,
  };

  let response = await postJson(path, body);
  response = await retryPost(response, path, body)
  response = assertOnlineResponse(response, "session/end");

  return response;
}

export function getSessionPostState() {
  return {
    sid,
    bSeq,
    prevHash,
    currentDocHash,
  };
}

export async function getChallenge(challenge) {
  if (challenge && challenge.sid && challenge.sid === sid && Date.now() < challenge.et) {
    return challenge;
  }

  const path = "/session/challenge";
  const body = {
    v,
    dId: docId,
    sid: sid,
  };
  let response = await postJson(path, body);
  response = await retryPost(response, path, body)
  response = assertOnlineResponse(response, "session/challenge");
  if (response.status === OFFLINE_STATUS) return response;

  if (response.status && response.status !== "SUCCESS") {
    throw new Error(`Record server rejected challenge: ${JSON.stringify(response)}`);
  }
  return response.challenge;
}

export async function postBlock(ev = [], docText = null, delayed = false) {
  if (!sid || !sessionKey) {
    throw new Error("Cannot post block before startSession()");
  }

  const q = bSeq;
  const dt0 = Date.now() - st0;
  const dtn = arraySum(ev.map((e) => e[0] || 0));
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
    idsh: currentDocHash,
    dsh: await hashDocText(docText),
    ev,
  };

  if (!delayed && (!challenge.sid || challenge.sid !== sid || challenge.et < Date.now())) {
    challenge = await getChallenge(challenge);
    if (challenge.status === OFFLINE_STATUS) return challenge;
  }

  const payloadText = canonicalJson(rawPayload);
  const aad = canonicalJson({ header, challenge });
  const { ct, iv, tag } = await encryptText(payloadText, sessionKey, aad);
  const ch = await hashCurrent(header, challenge, iv, ct, tag);

  const path = "/session/block";
  const body = {
    header,
    challenge,
    iv,
    ct,
    tag,
    ch,
  }
  if (delayed) {
    body.freshness = "OFFLINE_DELAYED";
  } else {
    body.freshness = "ONLINE";
  }
  let response = await postJson(path, body);
  response = await retryPost(response, path, body)
  response = assertOnlineResponse(response, `session/block ${q}`);
  if (response.status === OFFLINE_STATUS) return response;

  if (response.status && response.status !== "SUCCESS") {
    throw new Error(`Record server rejected block ${q}: ${JSON.stringify(response)}`);
  }

  prevHash = ch;
  currentDocHash = rawPayload.dsh;
  bSeq += 1;

  return response;
}
