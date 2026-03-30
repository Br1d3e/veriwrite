// stats_layer2
// Tentatively interprets session data from desc.js


import { calSessionDesc } from "./desc.js";



/**
 * Calculates session interpretation stats, returns an interpretStats object
 * @param {object} session
 */
export function calSessionInterpret(session) {
    if (!session) return;

    let interpretStats = {
        pasteIns: calPasteIns(session),
        temporalLinearity: null,
        revisionIntensity: null
    }
    return interpretStats;
}


/**
 * Interprets paste-like insertion events
 * @param {*} session 
 * @returns pasteIns array of evDesc object: {lvl, evIdx, ins, dt, rate, tags}
 */
function calPasteIns(session) {
    if (!session) return;

    const descStats = calSessionDesc(session);

    let pasteIns = []

    const ev = session.ev;

    // Maximum insLen for each
    const medThreshold = 15;
    const highThreshold = 30;
    const rateThreshold = 40;       // tested from data


    for (let i = 0; i < ev.length; i++) {
        const ins = ev[i][3];
        const insLen = ins.length;
        const dt = ev[i][0];
        const rate = Number((insLen / dt * 1000).toFixed(2));   // average kps

        // Update description
        let evDesc = {
            lvl: "",
            evIdx: i,
            ins: ins,
            dt: dt,
            rate: rate,
            tags: []
        }

        if (insLen < medThreshold) continue;

        // let countFlag = false;      // Account for multiple possible reasons
        if (rate >= rateThreshold) {
            evDesc.lvl = "high";
            evDesc.tags.push("high rate");
            // countFlag = true;
        }
        
        if (insLen >= medThreshold && insLen < highThreshold) {
            evDesc.tags.push("large insertion");
            evDesc.lvl = "medium";
        } else if (insLen >= highThreshold) {
            evDesc.tags.push("large insertion");
            evDesc.lvl = "high";
        }

        pasteIns.push(evDesc);
    }


    return pasteIns;
}
