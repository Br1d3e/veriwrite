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
    const init = session.init;      
    let currentText = init;     // Keep track of current docText

    // Maximum insLen for each
    const medThreshold = 15;
    const highThreshold = 30;
    // Maximum input rate
    const rateThreshold = 40;     


    for (let i = 0; i < ev.length; i++) {
        const ins = ev[i][3];
        const insLen = ins.length;
        const delLen = ev[i][2];
        const pos = ev[i][1];
        const dt = ev[i][0];
        const rate = Number((insLen / Math.max(dt, 1) * 1000).toFixed(2));   // average kps

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
        
        if (insLen >= medThreshold && insLen < highThreshold) {
            evDesc.tags.push("large insertion");
            evDesc.lvl = "medium";
        } else if (insLen >= highThreshold) {
            evDesc.tags.push("large insertion");
            evDesc.lvl = "high";
        }

        // Tags
        if (rate >= rateThreshold) {
            evDesc.tags.push("high rate");
        }
        const dtThres = 6000;
        if (dt > dtThres) {
            evDesc.tags.push("long pause");
        }
        if (currentText.includes(ins)) {
            evDesc.tags.push("in-doc paste")
        }
        currentText = currentText.slice(0, pos) + ins + currentText.slice(pos + delLen);  // update current text

        pasteIns.push(evDesc);
    }


    return pasteIns;
}
