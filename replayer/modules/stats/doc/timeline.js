/**
 * @fileoverview Document-level timeline metrics: 
 * document start
 * document end
 * document span
 * active writing time
 * active writing days
 * session count
 * session durations graph
 */


/**
 * Calculate document-level timeline metrics
 * @param {object} record flightRecord json
 * @returns {object} timeline metrics
 */
export function calTimeline(record) {
    const sessions = record.sessions;
    
    const sessionCount = sessions.length;

    const docStartTs = record.m.created || record.m.t0;
    const docEndTs = record.m.lastModified || record.m.tn;
    const docSpanTs = docEndTs - docStartTs;

    let durationTs = 0;
    let activeDays = new Set();
    for (let session of sessions) {
        const sessionStartTs = session.t0
        const sessionEndTs = session.tn;
        durationTs += (sessionEndTs - sessionStartTs);
        if (session.ev.length > 0) {
            const sessionStart = new Date(sessionStartTs);
            const day = sessionStart.getFullYear() + '-' + (sessionStart.getMonth() + 1) + '-' + sessionStart.getDate();
            activeDays.add(day); 
        }
    }

    // Session durations graph
    const durationsGraph = sessionDurationsGraph(sessions);
    
    const timeline = {
        sessionCount: sessionCount,
        docStartTs: docStartTs,
        docEndTs: docEndTs,
        docSpanTs: docSpanTs,
        durationTs: durationTs,
        activeDays: activeDays,
        durationsGraph: durationsGraph
    }
    return timeline;
}


function sessionDurationsGraph(sessions) {
    let sid = [];
    let sessionTimes = [];
    for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i];
        sid.push(i + 1);
        sessionTimes.push(session.tn - session.t0);
    }

    return {
        x: sid,
        y: sessionTimes
    };
}