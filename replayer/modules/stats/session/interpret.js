// stats_layer2
// Tentatively interprets session data from desc.js



/**
 * Calculates session interpretation stats, returns an interpretStats object
 * @param {object} session
 */
export function calSessionInterpret(session, descStats) {
    if (!session) return;

    let interpretStats = {
        pasteIns: calPasteIns(session),
        temporalLinearity: calLinearity(session, descStats),
        revisionIntensity: null
    }
    return interpretStats;
}


/**
 * Interprets paste-like insertion events
 * @param {object} session 
 * @returns pasteIns array of evDesc object: {lvl, evIdx, ins, dt, rate, tags}
 */
function calPasteIns(session) {
    if (!session) return;

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


/**
 * Interprets linearity stats, including progress shape, smoothness, and relative interruption
 * @param {object} session 
 * @param {object} descStats
 * @returns {object} 
 */
function calLinearity(session, descStats) {
    if (!session) return;

    let shape = {
        mad: 0,
        rmse: 0,
        maxDeviation: 0
    }

    let smoothness =  {
        mad1stDeri: 0,
        mse2ndDeri: 0
    }

    let interruptRel = {
        ratio1x: 0,
        ratio2x: 0,
        ratio5x: 0,
        p95Score: 0
    }

    let linearity = {
        shape : shape,
        smoothness: smoothness,
        interruptRel: interruptRel
    }

    const ev = session.ev;
    const dt = ev.map(e => e[0]);
    const ins = ev.map(e => e[3]);
    const insLen = ins.map(i => i.length);

    // Calculate cumulative insLen and continuous time
    let y = new Uint32Array(insLen.length);     // Y-axis: insert length
    let totalLen = 0;
    for (let i = 0; i < insLen.length; i++) {
        totalLen += insLen[i];
        y[i] = totalLen;
    }
    
    let x = new Uint32Array(dt.length);         // X-axis: continuous time
    let totalTime = 0;
    for (let i = 0; i < dt.length; i++) {
        totalTime += dt[i];
        x[i] = totalTime;
    }

    // Normalize x, y 
    const xMax = arrayMax(x);
    const xMin = arrayMin(x);
    const yMax = arrayMax(y);
    const yMin = arrayMin(y);

    let xNorm = new Float64Array(x.length);
    let yNorm = new Float64Array(y.length);

    for (let i = 0; i < x.length; i++) {
        xNorm[i] = (x[i] - xMin) / (xMax - xMin);
        yNorm[i] = (y[i] - yMin) / (yMax - yMin); 
    }

    // A. Shape of progress: mean absolute deviation, RMSE, max absolute deviation
    let ad = 0;      // absolute deviation
    for (let i = 0; i < xNorm.length; i++) {
        ad = Math.abs(xNorm[i] - yNorm[i]);
        shape.mad += ad;
        shape.rmse += ad * ad;
        shape.maxDeviation = Math.max(shape.maxDeviation, ad);
    }
    shape.mad /= xNorm.length;
    shape.rmse = Math.sqrt(shape.rmse / xNorm.length);

    // Graph...

    // B. Smoothness of progress: 1st & 2nd derivatives
    // sample x, y
    const SAMPLE_SIZE = 0.002;
    let xBin = []
    let yBin = [];

    // Step sampling
    let j = 0;
    for (let target = 0; target <= 1 + 1e-10; target += SAMPLE_SIZE) {
        xBin.push(target);

        while (j < xNorm.length - 1 && xNorm[j + 1] <= target) {
            j++;
        }
        yBin.push(yNorm[j]);
    }


    // 1st derivative MAD
    const deri1st = derivativeHelper(yBin, xBin);
    for (let i = 0; i < deri1st.length; i++) {
        smoothness.mad1stDeri += Math.abs(deri1st[i] - 1);     // 1 is ideal rate
    }
    smoothness.mad1stDeri /= deri1st.length;

    // 2nd deravative MSE
    const deri2nd = diffHelper(deri1st);
    for (let i = 0; i < deri2nd.length; i++) {
        smoothness.mse2ndDeri += deri2nd[i] * deri2nd[i];
    }
    smoothness.mse2ndDeri /= deri2nd.length;

    
    // Relative Interruption
    const dtMed = descStats.rhythm.dtMedian;
    const score = dt.map(t => Math.log(t / dtMed));   // s = log(dt / dtMed)
    interruptRel.ratio1x = score.filter(s => s > 1).length / score.length;
    interruptRel.ratio2x = score.filter(s => s > 2).length / score.length;
    interruptRel.ratio5x = score.filter(s => s > 5).length / score.length;
    // Find score percentiles
    interruptRel.p95Score = percentileHelper(score, 95);

    return linearity;
}


// np.diff
function diffHelper(x) {
    let dx = [];

    for (let i = 1; i < x.length; i++) {
        dx.push(x[i] - x[i-1]);
    }
    return dx;
}


function derivativeHelper(y, x) {
    if (y.length !== x.length) return;

    let dy = diffHelper(y);
    let dx = diffHelper(x);
    
    let r = [];
    for (let i = 0; i < dy.length; i++) {
        r.push(dy[i] / dx[i]);
    } 
    return r;
}


function percentileHelper(arr, per) {
    const arr_sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil(per / 100 * arr_sorted.length) - 1;
    return arr_sorted[idx];
}


function arrayMax(arr) {
    return arr.reduce((a, b) => Math.max(a, b), -Infinity);
}

function arrayMin(arr) {
    return arr.reduce((a, b) => Math.min(a, b), Infinity);
}