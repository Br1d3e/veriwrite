
import { calSessionDesc } from "./desc.js"
import { calSessionInterpret } from "./interpret.js";


export function calSession(session) {
    let sessionStats = {
        desc: calSessionDesc(session),
        interpret: calSessionInterpret(session)
    }
    return sessionStats;
}