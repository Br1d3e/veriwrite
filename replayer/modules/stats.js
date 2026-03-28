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
 * editPosMean：编辑相对位置平均值
 * editPosStd：编辑相对位置离散程度
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
    let histIns = new Uint32Array(threshold + 2);
    let histDel = new Uint32Array(threshold + 2);
    let insCount = 0;        // event count where ins.length > 0
    let delCount = 0;        // event count where del.length > 0

    for (let i = 0; i < ev.length; i++) {
        const delLen = ev[i][2];
        const ins = ev[i][3];
        const insLen = ins.length;

        editSize.maxInsertLen = Math.max(editSize.maxInsertLen, insLen);
        editSize.maxDeleteLen = Math.max(editSize.maxDeleteLen, delLen);

        // Update histogram
        if (insLen > 0) insCount++;
        if (delLen > 0) delCount++;
        let bIns = insLen <= threshold ? insLen : threshold + 1;
        let bDel = delLen <= threshold ? delLen : threshold + 1;
        histIns[bIns]++;
        histDel[bDel]++;
    }

    const insP90Pos= Math.ceil(insCount * 0.9);
    const insP95Pos= Math.ceil(insCount * 0.95); 
    const delP90Pos= Math.ceil(delCount * 0.9);
    const delP95Pos= Math.ceil(delCount * 0.95); 

    // Remove insLen or delLen = 0
    histIns[0] = 0;
    histDel[0] = 0;

    editSize.insertLenP90 = histHelper(histIns, insP90Pos);
    editSize.insertLenP95 = histHelper(histIns, insP95Pos);
    editSize.deleteLenP90 = histHelper(histDel, delP90Pos);
    editSize.deleteLenP95 = histHelper(histDel, delP95Pos);

    return editSize;
}


/**
 * Calculates edit position stats, returns an editPos object
 * @param {number} sid session id starting from 0
 */
function calEditPos(sid) {
    if (sid < 0 || sid >= sessions.length) return;

    let editPos = {
        backtrack: 0,
        editPosMean: 0,
        editPosStd: 0,
    }

    const session = sessions[sid];
    const ev = session.ev;
    const init = session.init;


    let totalPos = 0;     
    // Current text length
    let currentLen = init.length;

    // Calculate mean edit position (relative) and ending position
    for (let i = 0; i < ev.length; i++) {
        const pos = ev[i][1];
        const delLen = ev[i][2];
        const ins = ev[i][3];
        const insLen = ins.length;

        const posRel = pos / Math.max(currentLen, 0);
        currentLen = currentLen + insLen - delLen;      // Dynamic update session document length
        totalPos += posRel;
    }

    editPos.editPosMean = totalPos / ev.length;
    
    // Calculate std value using relative position
    currentLen = init.length;
    for (let i = 0; i < ev.length; i++) {
        const pos = ev[i][1];
        const delLen = ev[i][2];
        const ins = ev[i][3];
        const insLen = ins.length;

        const posRel = pos / Math.max(currentLen, 0);
        currentLen = currentLen + insLen - delLen;
        // Compute std
        editPos.editPosStd += (posRel - editPos.editPosMean) ** 2 / ev.length;
    }

    editPos.editPosStd = Math.sqrt(editPos.editPosStd);

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

