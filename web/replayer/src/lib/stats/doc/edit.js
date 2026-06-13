/**
 * @fileoverview Document-level edit metrics:
 * total inserted chars
 * total deleted chars
 * net chars
 * word count
 * paste origin ratio
 * session insert chars graph
 * edit time heatmap
 */


import { wordCount, editTextSeg } from "./utils.js";

/**
 * Calculate document-level edit metrics
 * @param {object} record flightRecord json
 * @param {object} timeline document-level timeline metrics (used for edit time heatmap)
 * @returns {object} editStats
 */
export function calEditStats(record, timeline) {
    const sessions = record.sessions;

    let docInsChars = 0;
    let docDelChars = 0;
    for (let session of sessions) {
        const ev = session.ev;
        for (let j = 0; j < ev.length; j++) {
            const ins = ev[j][3];
            const delLen= ev[j][2];
            docInsChars += ins.length;
            docDelChars += delLen;
        }
    }

    const docFinalText = getDocFinalText(sessions);

    const docNetChars = docInsChars - docDelChars;
    const docWordCount = wordCount(docFinalText);

    // Paste origin ratio
    const originChars = docFinalText.length
    const pasteOriginRatio =  originChars - getPasteChars(sessions) > 0 ? getPasteChars(sessions) / originChars : 0;

    // Session insert chars graph
    const insCharsGraph = sessionInsGraph(sessions);

    // Edit time heatmap
    const activeDays = timeline.activeDays;
    const heatmap = editHeatmap(sessions, activeDays);

    const editStats = {
        insertedChars: docInsChars,
        deletedChars: docDelChars,
        netChars: docNetChars,
        wordCount: docWordCount,
        pasteOriginRatio: pasteOriginRatio,
        insCharsGraph: insCharsGraph,
        heatmap: heatmap
    };

    return editStats;
}


function getDocFinalText(sessions) {
    // Compute final document text to get word count
    const lastSession = sessions[sessions.length - 1];
    let docFinalText = lastSession.init || "";  // Initial text of last session
    const lastEv = lastSession.ev;
    for (let i = 0; i < lastEv.length; i++) {
        const ins = lastEv[i][3];
        const delLen= lastEv[i][2];
        const pos = lastEv[i][1];
        // Update text
        docFinalText = docFinalText.slice(0, pos) + ins + docFinalText.slice(pos + delLen);
    }
    return docFinalText;
}

function getPasteChars(sessions) {
    // deprecated
    // let pasteIns = [];

    const initText = sessions[0].init;
    let textSeg = [];
    textSeg.push({
        text: initText,
        type: "init"
    });

    for (let session of sessions) {
        const ev = session.ev;

        if (ev.length > 0) {
            for (let j = 0; j < ev.length; j++) {
                const ins = ev[j][3];
                const delLen= ev[j][2];
                if (ins.length > 15 && delLen === 0) { // Heuristic: if inserted text is longer than 15 chars, consider it a paste
                    editTextSeg(textSeg, ev[j][1], ins, delLen, "paste");
                    // pasteIns.push(ins);
                }
                else {
                    editTextSeg(textSeg, ev[j][1], ins, delLen, "normal");
                }
            }
        }
    }

    let pasteInsChars = 0;

    for (let seg of textSeg) {
        if (seg.type === "paste") {
            pasteInsChars += seg.text.length;
        }
    }

    return pasteInsChars;
}

function sessionInsGraph(sessions) {
    let sid = [];
    let sessionInsChars = [];
    for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i];
        sid.push(i + 1);
        let sessionIns = 0;
        const ev = session.ev;
        for (let j = 0; j < ev.length; j++) {
            const ins = ev[j][3];
            sessionIns += ins.length;
        }
        sessionInsChars.push(sessionIns);
    }

    return {
        x: sid,
        y: sessionInsChars
    };
}

/**
 * @param {object} sessions
 * @param {Set<string>} activeDays
* @returns heatmap data for edit time, 2D array of shape (24, activeDays)
 */
function editHeatmap(sessions, activeDays) {
    const data = Array.from({ length: 24 }, () => Array(activeDays.size).fill(0)); // 24 hours x activeDays

    for (let session of sessions) {
        const ev = session.ev;
        let ts = session.t0; // session start timestamp

        if (ev.length === 0) continue; // skip sessions with no events

        let prevTs = 0;
        for (let e of ev) {
            prevTs = ts;
            ts += e[0]; // event timestamp is relative to session start

            const time = new Date(ts);
            const day = `${time.getFullYear()}-${time.getMonth() + 1}-${time.getDate()}`;
            if (activeDays.has(day)) {
                const hour = time.getHours();
                const dayIndex = Array.from(activeDays).indexOf(day);
                data[hour][dayIndex] += (ts - prevTs) / 1000 / 60; // convert to minutes
            }
        }
    }
    return data;
}
