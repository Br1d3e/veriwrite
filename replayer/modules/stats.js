// Analyzes flightRecord data from player.js


/** Session stats
 * 
 * 
 * 1. Overview
 * durationMs
 * evCount
 * insChars
 * delChars
 * netChars
 * replaceEv
 * 
 * 
 * 2. Time / Rhythm
 * dtMedian：相邻事件时间差中位数
 * dtP90：相邻事件时间差 90 分位数
 * dtP95：相邻事件时间差 95 分位数
 * dtMax：最大相邻事件时间差
 * pause5sCount：dt ≥ 5s 的次数
 * 
 * 
 * 3. Edit Size
 * maxInsertLen
 * insertLenP90
 * insertLenP95
 * maxDeleteLen
 * deleteLenP90
 * deleteLenP95
 * 
 * 
 * 4. Edit Position
 * endEdit：发生在文末附近的编辑次数
 * frontEdit：发生在文本前段的编辑次数
 * midEdit：发生在文本中部的编辑次数
 * backtrack：编辑位置明显向前跳回的次数
 * editPosMean：编辑绝对位置平均值
 * editPosStd：编辑绝对位置离散程度
/*/



let flightRecord = null;
let sessions = null;


export function initializeStats(record) {
    flightRecord = record;
    sessions = flightRecord.sessions;
}


/**
 * 
 * @param {number} sid session index starting from 0
 */
export function calSession(sid) {
    if (sid < 0 || sid >= sessions.length) return;

    // Stats object
    let sessionStats = {
        overview: calOverview(sid),
        rhythm: calRhythm(sid),
        editSize: calEditSize(sid),
        editPos: calEditPos(sid)
    }

    return sessionStats;
}


/**
 * Calculates overview stats, returns an overview object
 * @param {number} sid session index starting from 0
 */
function calOverview(sid) {
    if (sid < 0 || sid >= sessions.length) return;

    let overview = {
    durationMs: 0,
    evCount: 0,
    insChars: 0,
    delChars: 0,
    netChars: 0,
    replaceEv: 0,
    }

    const session = sessions[sid];
    const ev = session.ev;
    
    overview.durationMs = session.tn - session.t0;
    overview.evCount = ev.length;
    
    // Compute replace events, insert, delete, and net chars
    for (let i = 0; i < ev.length; i++){
        const event = ev[i];
        const delLen = event[2];
        const ins = event[3];

        overview.insChars += ins.length;
        overview.delChars += delLen;
        overview.netChars += ins.length - delLen;
        if (delLen > 0 && ins.length > 0) {
            overview.replaceEv++;
        }
    }

    return overview;
}


function histHelper(hist, pos) {
   let count = 0;
    for (let i = 0; i < hist.length; i++) {
        count += hist[i];
        if (count >= pos) {
            return i;
        }
    }
    return hist.length - 1;    
}


/**
 * Calculates rhythm stats, returns a rhythm object
 * @param {number} sid session index starting from 0
 */
function calRhythm(sid) {
    if (sid < 0 || sid >= sessions.length) return;

    let rhythm = {
        dtMedian: 0,
        dtP90: 0,
        dtP95: 0,
        dtMax: 0,
        pause5sCount: 0,
    }

    const session = sessions[sid];
    const ev = session.ev;

    // Histogram counting every dt
    const maxMs = 60000;    // dt overflows, discard
    let hist = new Uint32Array(maxMs + 5);


    for (let i = 1; i < ev.length; i++) {       // Remove first event (dt is always 0)
        const dt = ev[i][0];

        rhythm.dtMax = Math.max(rhythm.dtMax, dt);
        rhythm.pause5sCount += dt >= 5000 ? 1 : 0;

        // Update histogram
        const b = dt <= maxMs ? dt : maxMs + 1;   // Overflow bucket placed at 60001
        hist[b]++;
    }

    
    const medPos= Math.ceil((ev.length - 1) / 2);
    const p90Pos= Math.ceil((ev.length - 1) * 0.9);
    const p95Pos= Math.ceil((ev.length - 1)* 0.95);   

    rhythm.dtMedian = histHelper(hist, medPos);
    rhythm.dtP90 = histHelper(hist, p90Pos);
    rhythm.dtP95 = histHelper(hist, p95Pos);

    return rhythm;
}


/**
 * Calculates edit size stats, returns an edit obejct
 * @param {number} sid session id starting from 0
 */
function calEditSize(sid) {
    if (sid < 0 || sid >= sessions.length) return;

    let editSize = {
        maxInsertLen: 0,
        insertLenP90: 0,
        insertLenP95: 0,
        maxDeleteLen: 0,
        deleteLenP90: 0,
        deleteLenP95: 0,
    }

    const session = sessions[sid];
    const ev = session.ev;

    // Histogram counting every insert and deletion
    const threshold = 5000;     // Insert/delete threshold
    let histIns = new Uint16Array(threshold + 2);
    let histDel = new Uint16Array(threshold + 2);

    for (let i = 0; i < ev.length; i++) {
        const delLen = ev[i][2];
        const ins = ev[i][3];
        const insLen = ins.length;

        editSize.maxInsertLen = Math.max(editSize.maxInsertLen, insLen);
        editSize.maxDeleteLen = Math.max(editSize.maxDeleteLen, delLen);

        // Update histogram
        let bIns = insLen <= threshold ? insLen : threshold + 1;
        let bDel = delLen <= threshold ? delLen : threshold + 1;
        histIns[bIns]++;
        histDel[bDel]++;
    }

    const p90Pos= Math.ceil(ev.length * 0.9);
    const p95Pos= Math.ceil(ev.length * 0.95); 

    // Remove insLen or delLen = 0
    histIns[0] = 0;
    histDel[0] = 0;

    editSize.insertLenP90 = histHelper(histIns, p90Pos);
    editSize.insertLenP95 = histHelper(histIns, p95Pos);
    editSize.deleteLenP90 = histHelper(histDel, p90Pos);
    editSize.deleteLenP95 = histHelper(histDel, p95Pos);

    return editSize;
}


/**
 * Calculates edit position stats, returns an editPos object
 * @param {number} sid session id starting from 0
 */
function calEditPos(sid) {
    if (sid < 0 || sid >= sessions.length) return;

    const posThresRel = 0.2;    // relative position threshold - front: 0~20%, mid: 20%~80%, apd: 80%~100%

    let editPos = {
        // endEdit: 0,        
        // frontEdit: 0,
        // midEdit: 0,
        backtrack: 0,
        editPosMean: 0,
        editPosStd: 0,
    }

    const session = sessions[sid];
    const ev = session.ev;
    const init = session.init;


    let totalPos = 0; 
    let endPos = 0;   // the largest pos value

    // Calculate mean edit position (absolute) and ending position
    for (let i = 0; i < ev.length; i++) {
        const pos = ev[i][1];

        totalPos += pos;
        endPos = Math.max(endPos, pos);
    }

    editPos.editPosMean = totalPos / ev.length;

    // Current text length
    let currentLen = endPos - init.length;
    
    for (let i = 0; i < ev.length; i++) {
        const pos = ev[i][1];
        const posRel = pos / currentLen;

        // // Count editing distribution using relative position
        // if (posRel <= posThresRel && posRel >= 0) {
        //     editPos.frontEdit++;
        // } else if (posRel <= 1 && posRel >= 1 - posThresRel) {
        //     editPos.endEdit++;
        // } else {
        //     editPos.midEdit++;
        // }

        // Compute std
        editPos.editPosStd += (pos - editPos.editPosMean) ** 2 / ev.length;
    }


    // Backtrack detection
    const btThres = 10;     // Backtrack threshold (position/characters)

    for (let i = 1; i < ev.length; i++) {
        const pos = ev[i][1];
        const delLen = ev[i][2];
        const prev = ev[i-1][1];

        if (prev - pos - delLen >= btThres) {
            editPos.backtrack++;
        }
    }

    return editPos;
}

