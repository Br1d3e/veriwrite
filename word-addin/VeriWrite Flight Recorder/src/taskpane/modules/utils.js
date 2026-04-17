
// uuid generator
export function generateUUID() {
  return crypto.randomUUID();
}

// Escape Microsoft Word Chars
function normalizeLines(s) {
    return String(s)
    .replace(/\r\n/g, "\n")  
    .replace(/\r/g, '\n')   // Hard Break
    .replace(/\u000b/g, '\n')   // Soft Break
}

export function arraySum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

export function b64Encoder(str) {
  const bytes = new TextEncoder().encode(str); // Uint8Array
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin); // base64 string
}

export function b64Decoder(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}


/**
 * Compares two input texts, generates [dt, pos, delLen, ins]
 * @param {string} oldText - 上一次轮询的文本
 * @param {string} newText - 当前读取的文本
 * @param {number} lastPollTime - 上一次记录的时间戳
 * @returns {Array | null} - 返回 tuple 或 null (如果没有变化)
 */
export function computeDiff(oldText, newText, lastPoll) {
    const now = Date.now();
    const dt = now - lastPoll;

    // No change at all, return nothing
    if (oldText === newText) {
        return null;
    }
    
    // Find length of common prefix
    let p = 0;
    while (p < oldText.length && p < newText.length && oldText[p] === newText[p]) {
         p++;
    }
    
    // Find length of common suffix
    let s = 0;
    let i = oldText.length - 1;
    let j = newText.length - 1;
    while (i >= p && j >= p && oldText[i] === newText[j]) {
        s++;
        i--;
        j--;
    }

    // Compute Differences
    const pos = p;
    const delLen = oldText.length - p - s;
    const ins = newText.slice(p, newText.length - s);

    if (delLen === 0 && ins === "") return null;

    return [dt, pos, delLen, ins];
}