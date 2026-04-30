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

  return {
    ...currentSnapshot,
    currentSession: sid,
    i: 0,
    playTs: 0,
    budget: 0,
    docText: init,
    caretPos: init.length,
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
