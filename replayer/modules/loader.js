// Data pre-process
// Input: Raw flightRecord.json
// Outputs a normalized flightRecord.json document



function dedupe(sessions) {
    // Remove duplicates by session ID
    for (var i = 1; i < sessions.length; i++) {
        if (sessions[i].id === sessions[i-1].id
            // || sessions[i].t0 === sessions[i-1].t0
            // || sessions[i].tn === sessions[i-1].tn
            // || sessions[i].init === sessions[i-1].init
            // || sessions[i].ev === sessions[i-1].ev
        ) {
            sessions.splice(i, 1);
            i--;
        }
    }
    return sessions;
}

function sort(sessions) {
    // Sort sessions by t0
    sessions.sort((a, b) => a.t0 - b.t0);
    return sessions;
}

export function processData(flightRecord) {
    const newRecord = flightRecord;
    let sessions = newRecord.sessions;
    sessions = dedupe(sessions);
    sessions = sort(sessions);
    return newRecord;
}


export function checkStruct(flightRecord) {
    const v = flightRecord.v ?? null;
    const m = flightRecord.m ?? null;
    const sessions = flightRecord.sessions ?? null
    
    return flightRecord && v === 2 && m && sessions && typeof sessions === "object";
}