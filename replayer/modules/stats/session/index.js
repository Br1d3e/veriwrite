
import { calSessionDesc } from "./desc.js"
import { calSessionInterpret } from "./interpret.js";


export function calSession(session) {
    if (!session) return null;
    const desc = calSessionDesc(session);
    let sessionStats = {
        desc: desc,
        interpret: calSessionInterpret(session, desc)
    }
    return sessionStats;
}