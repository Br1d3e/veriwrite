/** 
 * @fileoverview Document-level gap / continuity metrics:
 * detected inter-session gaps
 * gap duration
 * text difference
 * chars differ
 * words differ
 * offline text ratio
 * notable jumps / major transitions
 */


import { wordCount } from "./utils";
import DiffMatchPatch from 'diff-match-patch'

const dmp = new DiffMatchPatch();


/**
 * Calculate document-level continuity metrics
 * @param {object} record 
 * @returns {object} continuity object
 */
export function calContinuity(record) {
    const sessions = record.sessions;

    const gaps = detectGaps(sessions);

    const continuity = {
        gaps: gaps
    }
    return continuity;
}


function detectGaps(sessions) {
    // Previous end text, initialized to the initial text of the first session
    const firstSession = sessions[0];
    const firstEv = firstSession.ev;
    let prevEndText = firstSession["init"];  
    if (firstEv.length > 0) {
        for (let ev of firstEv) {
            const pos = ev[1];
            const ins = ev[3];
            const delLen = ev[2];
            prevEndText = prevEndText.slice(0, pos) + ins + prevEndText.slice(pos + delLen);
        }
    }

    let gaps = [];
    for (let i = 1; i < sessions.length; i++) {
        const session = sessions[i];
        const ev = session.ev;

        const currentInit = session.init || "";     // Current session initial text

        if (currentInit !== prevEndText) {
            // Detected a gap with offline edits
            // positional stats
            const gapBefore = i - 1;
            const gapAfter = i;
            // gap time metrics
            const prevEndTs = sessions[i-1].tn;
            const currStartTs = session.t0;
            const gapDuration = currStartTs - prevEndTs;

            const textPatch = dmp.patch_make(prevEndText, currentInit);
            // an insertion (1), a deletion (-1) or an equality (0)
            

            const charsDiff = textPatch.length;
            // const wordDiff = wordCount(textDiff);
            
            const majorThres = 50;     // major difference = 50+ words
            // const majorDiff = wordDiff >= majorThres;

            const gap = {
                prevSession: gapBefore,
                nextSession: gapAfter,
                gapDuration: new Date(gapDuration),
                textPatch: textPatch,
                // charsDiff: charsDiff,
                // wordDiff: wordDiff,
                // majorDiff: majorDiff
            }
            gaps.push(gap);
        }
        

        // update next prevEndText based on current session's ev
        if (ev.length > 0) {
            for (let j = 0; j < ev.length; j++) {
                const pos = ev[j][1];
                const ins = ev[j][3];
                const delLen = ev[j][2];
                prevEndText = prevEndText.slice(0, pos) + ins + prevEndText.slice(pos + delLen);
            }
        }
    }
    return gaps;
}


function calOfflineTextRatio(sessions) {
    const initText = sessions[0].init;
    let textSeg = [];
    textSeg.push({
        text: initText,
        type: "offline"
    });

    for (let session of sessions) {
        const ev = session.ev;
        if (ev.length > 0) {
            for (let j = 0; j < ev.length; j++) {
                const pos = ev[j][1];
                const ins = ev[j][3];
                const delLen = ev[j][2];

                // TODO
                // Insert: set text at textSeg[pos+1]
            }
        }
    }

}