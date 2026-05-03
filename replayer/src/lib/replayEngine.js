function applyPatch(currentSnapshot, eventArr) {
  const pos = eventArr[1];
  const delLen = eventArr[2];
  const ins = eventArr[3];

  const prev = currentSnapshot.docText;
  const docText = prev.slice(0, pos) + ins + prev.slice(pos + delLen);
  const caretPos = ins === "" && delLen > 0 ? pos : pos + ins.length;

  return {
    ...currentSnapshot,
    docText,
    caretPos,
  };
}

export function step(currentSnapshot, ev) {
  if (currentSnapshot.playing === false) return currentSnapshot;

  const now = performance.now();
  const frameMs = now - currentSnapshot.lastFrameTs;
  let nextSnapshot = {
    ...currentSnapshot,
    budget: currentSnapshot.budget + frameMs * currentSnapshot.speed,
  };

  while (
    nextSnapshot.i < ev.length &&
    nextSnapshot.budget >= ev[nextSnapshot.i][0]
  ) {
    nextSnapshot = applyPatch(nextSnapshot, ev[nextSnapshot.i]);
    nextSnapshot = {
      ...nextSnapshot,
      playTs: nextSnapshot.playTs + ev[nextSnapshot.i][0],
      budget: nextSnapshot.budget - ev[nextSnapshot.i][0],
      i: nextSnapshot.i + 1,
      evCount: nextSnapshot.evCount + 1,
      sesProg: calSesProgress(nextSnapshot),
      docProg: calDocProgress(nextSnapshot),
    };
  }

  return {
    ...nextSnapshot,
    lastFrameTs: now,
  };
}

export function seekToSession(currentSnapshot, sid) {
  if (
    typeof sid !== "number" ||
    sid < 0 ||
    sid >= currentSnapshot.sessions.length
  ) {
    return currentSnapshot;
  }

  const init = currentSnapshot.sessions[sid]?.init ?? "";
  const evCount = calculateTotalEv(currentSnapshot, sid);
  const sesTotalEv = totalSessionEv(currentSnapshot, sid);

  return {
    ...currentSnapshot,
    currentSession: sid,
    i: 0,
    playTs: 0,
    budget: 0,
    docText: init,
    caretPos: init.length,
    evCount,
    sesTotalEv,
    sesProg: 0,
    docProg: calDocProgress({
      ...currentSnapshot,
      evCount,
    }),
  };
}

export function seekNextSession(currentSnapshot) {
  if (currentSnapshot.currentSession >= currentSnapshot.sessions.length - 1) {
    return currentSnapshot;
  }

  return seekToSession(currentSnapshot, currentSnapshot.currentSession + 1);
}

export function seekPrevSession(currentSnapshot) {
  if (currentSnapshot.currentSession <= 0) return currentSnapshot;

  return seekToSession(currentSnapshot, currentSnapshot.currentSession - 1);
}

export function resetStatus(currentSnapshot) {
  if (!currentSnapshot.record) return;
  console.log("reset status");
  return {
    ...currentSnapshot,
    playTs: 0,
    playing: false,
    currentSession: 0,
    i: 0,
    evCount: 0,
    online: currentSnapshot.record.v === 3,
    docText: currentSnapshot.sessions[0].init,
    caretPos: currentSnapshot.sessions[0].init.length,
    budget: 0,
    lastFrameTs: 0,
    docTotalEv: calculateTotalEv(currentSnapshot),
    sesProg: calSesProgress(currentSnapshot),
    docProg: calDocProgress(currentSnapshot),
  };
}

export function convertTs(currentSnapshot) {
  const totalSec = currentSnapshot.playTs / 1000;
  const tsHr = Math.floor(totalSec / 3600);
  const tsMin = Math.floor((totalSec % 3600) / 60);
  const tsSec = Math.floor(totalSec % 60);
  const textHr = tsHr.toString().padStart(2, "0");
  const textMin = tsMin.toString().padStart(2, "0");
  const textSec = tsSec.toString().padStart(2, "0");

  return `${textHr}:${textMin}:${textSec}`;
}

export function totalSessionEv(arg1 = null, arg2 = null) {
  let record, currentSession;
  if (typeof arg1 === "object" && typeof arg2 === "number") {
    record = arg1;
    currentSession = arg2;
  } else if (typeof arg1 === "object") {
    record = arg1.record || arg1;
    currentSession = arg1.currentSession ?? arg2;
  } else {
    return 0;
  }

  const sessions = record?.sessions || record?.s || [];
  if (!Array.isArray(sessions)) return 0;
  const session = sessions[currentSession];

  return Array.isArray(session?.ev) ? session.ev.length : 0;
}

export function calculateTotalEv(arg1 = null, arg2 = null) {
  let record, currentSession;
  if (typeof arg1 === "object" && typeof arg2 === "number") {
    record = arg1;
    currentSession = arg2;
  } else if (typeof arg1 === "object") {
    record = arg1.record || arg1;
    currentSession = arg1.currentSession ?? arg2;
  } else {
    return 0;
  }

  const sessions = record?.sessions || record?.s || [];
  if (!Array.isArray(sessions)) return 0;
  const totalSession =
    typeof currentSession === "number" ? currentSession + 1 : sessions.length;
  let total = 0;
  for (let i = 0; i < totalSession && i < sessions.length; i++) {
    total += Array.isArray(sessions[i]?.ev) ? sessions[i].ev.length : 0;
  }
  return total;
}

export function calSesProgress(arg1, arg2) {
  let record, currentSnapshot;
  if (typeof arg1 === "object" && typeof arg2 === "object") {
    record = arg1;
    currentSnapshot = arg2;
  } else if (typeof arg1 === "object") {
    record = arg1.record;
    currentSnapshot = arg1;
  } else {
    return 0;
  }
  const sessions = record.sessions || record.s;
  if (!Array.isArray(sessions)) return 0;
  const sessionLength = sessions[currentSnapshot.currentSession].ev.length;
  return sessionLength === 0 ? 0 : (currentSnapshot.i / sessionLength) * 100;
}

export function calDocProgress(currentSnapshot) {
  return (currentSnapshot.evCount / currentSnapshot.docTotalEv) * 100;
}

export function calculateTs(eventIdx, record) {
  let totalTs = 0;
  for (let i = 0; i < eventIdx; i++) {
    totalTs += record.sessions[record.currentSession].ev[i][0];
  }
  return totalTs;
}
