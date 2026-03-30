
import { calSessionDesc } from "./desc.js"



export function calSession(session) {
    let sessionStats = {
        desc: calSessionDesc(session)
    }
    return sessionStats;
}