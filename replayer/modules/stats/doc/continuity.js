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
        gaps: gaps,
        offlineTextRatio: calOfflineTextRatio(sessions, gaps)
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
            const gapBefore = i;
            const gapAfter = i + 1;
            // gap time metrics
            const prevEndTs = sessions[i-1].tn;
            const currStartTs = session.t0;
            const gapDuration = currStartTs - prevEndTs;

            const textDiff = dmp.diff_main(prevEndText, currentInit);
            dmp.diff_cleanupSemantic(textDiff);

            const textPatch = dmp.patch_make(prevEndText, textDiff);

            // an insertion (1), a deletion (-1) or an equality (0)
            let charsDiff = 0;
            for (let [op, text] of textDiff) {
                charsDiff += Math.abs(text.length * op);
            }
        
            const majorThres = 50;     // major difference = 50+ chars
            const majorDiff = charsDiff >= majorThres;

            const gap = {
                prevSession: gapBefore,
                nextSession: gapAfter,
                gapMs: gapDuration,
                textPatch: textPatch,
                charsDiff: charsDiff,
                majorDiff: majorDiff
            }
            gaps.push(gap);
        }
        

        // update next prevEndText based on current session's ev
        prevEndText = currentInit;
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

function getSegFromPos(textSeg, pos) {
    let segStart = 0;
    let segEnd = 0;
    let segIdx = 0;
    for (let i = 0; i < textSeg.length; i++) {
        segStart = segEnd;
        segEnd += textSeg[i].text.length;
        if (segStart <= pos && pos < segEnd) {
            segIdx = i;
            break;
        }
    } 
    const segPos = pos - segStart;
    return [segIdx, segPos];
}

function sumTextSegLen(textSeg) {
    let sum = 0;
    for (let seg of textSeg) {
        sum += seg.text.length;
    }
    return sum;
}

function editTextSeg(textSeg, pos, ins, delLen, type="recorded") {
    // Delete
    let [segIdx, segPos] = getSegFromPos(textSeg, pos);
    let toDelete = delLen;
    while (toDelete > 0 && segIdx < textSeg.length) {
        let text = textSeg[segIdx].text;
        if (toDelete < text.length - segPos) {
            textSeg[segIdx].text = text.slice(0, segPos) + text.slice(segPos + toDelete);
            break;
        }
        if (segPos === 0) {     // delete entire text seg
            textSeg.splice(segIdx, 1);
            toDelete -= text.length;
        } else if (segPos > 0){     // conserve seg the left side, del right part
            textSeg[segIdx].text = text.slice(0, segPos);
            toDelete -= text.length - segPos;
            segIdx++;
        }
        segPos = 0;
    }

    // Insert
    if (ins.length > 0) {
        if (sumTextSegLen(textSeg) === pos) {     // append to the end
            textSeg.push({
                text: ins,
                type: type
            });
        } else {
             // split current text segment
            [segIdx, segPos] = getSegFromPos(textSeg, pos);
            
            // on the left of seg
            if (segPos == 0) {
                textSeg.splice(segIdx, 0, {
                    text: ins,
                    type: type
                });
            } else if (segPos === textSeg[segIdx].text.length) {    // on the right of seg
                textSeg.splice(segIdx + 1, 0, {
                    text: ins,
                    type: type
                });
            } else {    // in the middle of seg
                const leftText = textSeg[segIdx].text.slice(0, segPos);
                const rightText = textSeg[segIdx].text.slice(segPos);
                textSeg[segIdx].text = leftText;
                textSeg.splice(segIdx + 1, 0, {
                    text: ins,
                    type: type
                });
                textSeg.splice(segIdx + 2, 0, {
                    text: rightText,
                    type: textSeg[segIdx].type
                });
            }
        }
    }
}

function calOfflineTextRatio(sessions, gaps) {
    const initText = sessions[0].init;
    let textSeg = [];
    textSeg.push({
        text: initText,
        type: "offline"
    });

    for (let i = 0; i < sessions.length; i++) {
        const ev = sessions[i].ev;

        // let currentText = sessions[i].init;     // debug

        if (ev.length > 0) {
            for (let j = 0; j < ev.length; j++) {
                const pos = ev[j][1];
                const ins = ev[j][3];
                const delLen = ev[j][2];

                editTextSeg(textSeg, pos, ins, delLen, "recorded");

                // currentText = currentText.slice(0, pos) + ins + currentText.slice(pos + delLen);
            }
        }

        // let joinedText = "";
        // for (let seg of textSeg) {
        //     joinedText += seg.text;
        // }
        // if (joinedText !== currentText) {
        //     console.log(`error at session ${i + 1}`)
        //     console.log("joinedText\n", joinedText);
        //     console.log("currentText\n", currentText);
        //     console.log("diff\n", dmp.diff_main(joinedText, currentText));
        // }


        // Session gaps
        for (let j = 0; j < gaps.length; j++) {    // Search for gap in gaps array
            if (gaps[j].prevSession === i + 1) {
                const gap = gaps[j];
                const textPatch = gap.textPatch;

                for (let patch of textPatch) {
                    let startPos = patch.start1;
                    const diffs = patch.diffs;
                    for (let diff of diffs) {
                        const op = diff[0];
                        const text = diff[1];

                        const ins = op === 1 ? text : "";
                        const delLen = op === -1 ? text.length : 0;

                        editTextSeg(textSeg, startPos, ins, delLen, "offline");
                        
                        if (op === 0 || op === 1) {
                            startPos += text.length;
                        }
                    }    
                }
            }
        }
    }

    // Compute ratio
    let offlineChars = 0;
    let recordedChars = 0;
    for (let seg of textSeg) {
        if (seg.type === "offline") {
            offlineChars += seg.text.length;
        } else if (seg.type === "recorded") {
            recordedChars += seg.text.length;
        }
    }
    const offlineTextRatio = offlineChars / (recordedChars + offlineChars);


    return offlineTextRatio;
}