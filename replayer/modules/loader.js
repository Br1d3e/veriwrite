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
            console.log(`Repeating Session ${sessions[i].id}`)
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
    let sessions = flightRecord.sessions;
    sessions = dedupe(sessions);
    sessions = sort(sessions);
    flightRecord.sessions = sessions;
    return flightRecord;
}
