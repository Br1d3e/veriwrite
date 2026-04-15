
import { calSessionDesc } from "./desc.js"
import { calSessionInterpret } from "./interpret.js";


export function calSession(session) {
    if (!session) return null;
    if (!hasActiveSessionEvents(session)) return null;

    const desc = calSessionDesc(session);
    let sessionStats = {
        desc: desc,
        interpret: calSessionInterpret(session, desc)
    }
    return sessionStats;
}

function hasActiveSessionEvents(session) {
    const ev = session.ev;
    if (!Array.isArray(ev) || ev.length === 0) return false;

    for (const event of ev) {
        const delLen = event[2] ?? 0;
        const ins = event[3] ?? "";
        if (delLen > 0 || ins.length > 0) return true;
    }
    return false;
}
