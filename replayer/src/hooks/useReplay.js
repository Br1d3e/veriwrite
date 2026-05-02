import { useEffect, useState } from "react";
import {
  step,
  seekToSession,
  seekNextSession,
  seekPrevSession,
  convertTs,
  calculateTotalEv,
  totalSessionEv,
  calSesProgress,
  calDocProgress,
  calculateTs,
} from "../lib/replayEngine";

function initializeSnapshot(record) {
  const sessions = record?.sessions || record?.s || [];
  const docText = sessions[0]?.init || "";

  return {
    i: 0,
    evCount: 0,
    playing: false,
    speed: 1.0,
    budget: 0,
    lastFrameTs: 0,
    playTs: 0,
    record: record,
    sessions: sessions,
    currentSession: 0,
    sesTotalEv: totalSessionEv(record, 0),
    caretPos: docText.length,
    docText: docText,
    docTotalEv: calculateTotalEv(record),
    online: record.v === 3,
  };
}

export default function useReplay(record) {
  const [snapshot, setSnapshot] = useState(() => initializeSnapshot(record));

  useEffect(() => {
    setSnapshot(initializeSnapshot(record));
  }, [record]);

  useEffect(() => {
    if (!snapshot.playing) return;

    const frameId = requestAnimationFrame(runSessions);

    return () => cancelAnimationFrame(frameId);
  }, [snapshot]);

  function runSessions() {
    setSnapshot((prev) => {
      if (!prev.playing) return prev;

      const session = prev.sessions[prev.currentSession];
      const ev = Array.isArray(session?.ev) ? session.ev : [];
      let nextSnapshot = step(prev, ev);

      if (nextSnapshot.i >= ev.length) {
        if (nextSnapshot.currentSession >= nextSnapshot.sessions.length - 1) {
          console.log(`Finished All Sessions`);
          return {
            ...nextSnapshot,
            playing: false,
          };
        }

        nextSnapshot = seekNextSession(nextSnapshot);
      }

      return nextSnapshot;
    });
  }

  const actions = {
    play: () => {
      setSnapshot((prev) => ({
        ...prev,
        playing: true,
        lastFrameTs: performance.now(),
      }));
    },
    pause: () => {
      setSnapshot((prev) => ({
        ...prev,
        playing: false,
      }));
    },
  };
  return [snapshot, actions];
}
