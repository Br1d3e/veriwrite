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
        flow: calFlow(session, descStats),
        revisionIntensity: calRevisionIntensity(session) 
    }
    return interpretStats;
}


/**
 * Interprets paste-like insertion events
 * @param {object} session 
 * @returns pasteIns array of evDesc object: {lvl, evIdx, ins, dt, startPos, endPos, rate, tags}
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
            startPos: pos,
            endPos: pos + insLen,
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

        if (insLen >= medThreshold) {
            pasteIns.push(evDesc);
        }
    }

    return pasteIns;
}


/**
 * Interprets writing flow, including progress linearity, smoothness, relative interruption, and time-chars graph statistics
 * @param {object} session 
 * @param {object} descStats
 * @returns {object} flow
 */
function calFlow(session, descStats) {
    if (!session) return;

    let linearity = {
        score: 0,
        mad: 0,
        rmse: 0,
        maxDeviation: 0
    }

    let smoothness =  {
        score: 0,
        mad1stDeri: 0,
        mse2ndDeri: 0
    }

    let interruptProfile = {
        ratio1x: 0,
        ratio2x: 0,
        ratio5x: 0,
        p95Score: 0
    }

    let flow = {
        linearity : linearity,
        smoothness: smoothness,
        interruptProfile: interruptProfile,
        graph: null
    }

    const ev = session.ev;
    const dt = ev.map(e => e[0]);
    const ins = ev.map(e => e[3]);
    const insLen = ins.map(i => i.length);

    // Calculate cumulative insLen and continuous time
    let y = new Float64Array(insLen.length);     // Y-axis: insert length
    let totalLen = 0;
    for (let i = 0; i < insLen.length; i++) {
        totalLen += insLen[i];
        y[i] = totalLen;
    }
    
    let x = new Float64Array(dt.length);         // X-axis: continuous time
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

    // A. Linearity of progress: mean absolute deviation, RMSE, max absolute deviation
    let ad = 0;      // absolute deviation
    for (let i = 0; i < xNorm.length; i++) {
        ad = Math.abs(xNorm[i] - yNorm[i]);
        linearity.mad += ad;
        linearity.rmse += ad * ad;
        linearity.maxDeviation = Math.max(linearity.maxDeviation, ad);
    }
    linearity.mad /= xNorm.length;
    linearity.rmse = Math.sqrt(linearity.rmse / xNorm.length);

    // Linearity score
    const k = 5;
    linearity.score = Math.exp(-k * linearity.rmse) * 100;


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
    // Smoothness score / 100
    smoothness.score = 1 / (1 + (Math.log(1 + smoothness.mse2ndDeri))) * 100;
    

    // Relative Interruption
    const dtMed = Math.max(descStats.rhythm.dtMedian, 1);
    const score = dt.filter(t => t > 0).map(t => Math.log(t / dtMed));   // s = log(dt / dtMed)
    interruptProfile.ratio1x = score.filter(s => s > 1).length / score.length;
    interruptProfile.ratio2x = score.filter(s => s > 2).length / score.length;
    interruptProfile.ratio5x = score.filter(s => s > 5).length / score.length;
    // Find score percentiles
    interruptProfile.p95Score = percentileHelper(score, 95);

    
    // Graph
    flow.graph = {
        raw: {
            x: x.map(t => Math.round(t / 1000)),
            y: y
        },
        normalized: {
            x: xNorm,
            y: yNorm
        }
    }

    return flow;
}

/**
 * Analyzes revision intensity data
 * @param {object} session 
 * @returns a RevisionIntensity object of revision ratios and product-process similarity metric
 */
function calRevisionIntensity(session) {
    if (!session) return;

    let revInt = {
        revRatios: null,
        productProcessSim: null
    }

    const ev = session.ev;
    const init = session.init;
    const pos = ev.map(e => e[1]);
    const ins = ev.map(e => e[3]);
    const insLen = ins.map(i => i.length);
    const delLen = ev.map(e => e[2]);
    
    // Revision quantities & ratios
    let insLenSum = 0;
    let delLenSum = 0;
    let replacedChars = 0;
    let btInsChars = 0;
    let pureDelChars = 0;

    for (let i = 0; i < ev.length; i++) {
        insLenSum += insLen[i];
        delLenSum += delLen[i];

        if (delLen[i] > 0 && insLen[i] > 0) {   // replace event
            replacedChars += insLen[i];            
        } else if (delLen[i] > 0 && insLen[i] == 0) {   // pure delete event
            pureDelChars += delLen[i];
        }
    }
    insLenSum = Math.max(insLenSum, 1);
    delLenSum = Math.max(delLenSum, 1)
    const totalEvSum = insLenSum + delLenSum;
    
    // del-ins, replace, pureDel
    const delInsRatio = delLenSum / insLenSum;
    const replaceRatio = replacedChars / insLenSum;
    const pureDelRatio = pureDelChars / (totalEvSum);

    // Count backtrack & pure insertion
    let currentText = init.slice(0, pos[0]) + ins[0] + init.slice(pos[0] + delLen[0]);
    for (let i = 1; i < ev.length; i++) {
        const btMask1 = (pos[i - 1] > pos[i]);     // backtrack1: current pos is before previous position
        const isPureIns = (delLen[i] === 0 && insLen[i] > 0);
        let btMask2 = false;
        if (btMask1) {
            btMask2 = textBoundary(currentText.slice(pos[i], pos[i - 1]));  // backtrack2: crossed part contains textual boundary
        }
        currentText = currentText.slice(0, pos[i]) + ins[i] + currentText.slice(pos[i] + delLen[i]);    // Update displayed text
        
        if (btMask1 && btMask2 && isPureIns) {
            btInsChars += insLen[i];
        }
    }
    const btInsRatio = btInsChars / insLenSum;

    // Total revision ratio 
    const revChars = replacedChars + pureDelChars + btInsChars;
    const revRatio = revChars / totalEvSum;

    revInt.revRatios = {
        delIns: delInsRatio,
        replace: replaceRatio,
        pureDel: pureDelRatio,
        btIns: btInsRatio,
        total: revRatio
    }

    // Product-process similarity using n-gram Jaccard distance
    let processTexts = [];  // Cumulative textual progress of every event
    currentText = init;
    // sample every 5%
    const SAMPLE_SIZE = 0.05;
    for (let i = 0; i < ev.length; i++) {
        if (i % Math.ceil(ev.length * SAMPLE_SIZE) === 0) {
            processTexts.push(currentText);
        }
        currentText = currentText.slice(0, pos[i]) + ins[i] + currentText.slice(pos[i] + delLen[i]);
    }
    let productText = currentText;  // End of session text

    let productProcessSims = [];
    let sampleText = ""
    const productGram = wordBigram(productText);
    for (let i = 0; i < processTexts.length; i++) {
        sampleText = processTexts[i];
        const sampleGram = wordBigram(sampleText);
        const sim = jaccardSim(sampleGram, productGram);
        productProcessSims.push(sim);
        // productProcessSims.push(1 - levenshtein(sampleText, productText) / (sampleText.length + productText.length));
    }
    productProcessSims.push(1.0);      // Final point

    // compute percentiles
    const simInitFinal = jaccardSim(wordBigram(init), productGram);
    const simP10 = percentileHelper(productProcessSims, 10);
    const simP30 = percentileHelper(productProcessSims, 30);
    const simMed = percentileHelper(productProcessSims, 50);

    const simDiff = diffHelper(productProcessSims);
    const simInc = simDiff.filter(d => d > 0);      // Increasing similarities
    const simDip = simDiff.filter(d => d < 0);      // Dipping sims
    const maxDip = simDip.length === 0 ? 0 :Math.abs(arrayMin(simDip));
    const totalDip = Math.abs(arraySum(simDip));
    const totalInc = arraySum(simInc);
    const dropRatio = totalDip / Math.max(totalInc, 1);


    // Progress-similarity graph
    let x = new Float64Array(productProcessSims.length);
    let y = new Float64Array(productProcessSims.length);
    for (let i = 0; i < productProcessSims.length; i++) {
        x[i] = i / (productProcessSims.length - 1);
        y[i] = productProcessSims[i];
    }

    revInt.productProcessSim = {
        metrics: {
            initFinal: simInitFinal,
            p10: simP10,
            p30: simP30,
            med: simMed,
            earlyGain: simP10 - simInitFinal,
            medianGain: simMed - simInitFinal,
            maxDip: maxDip,
            totalDip: totalDip,
            dropRatio: dropRatio
        },
        graph: {
            prog: x,
            sim: y
        }
    }

    return revInt;
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
    if (!arr.length) return null;
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

function arraySum(arr) {
    return arr.reduce((a, b) => a + b, 0);
}

// Helper function for backtrack detection
function textBoundary(text) {
    if (!text.length || text.length === 0) return null;
    // backtrack: backward cursor movement that crosses at least one textual boundary
    const BOUNDARY_CHARS = new Set(" \n\r,.?!@#$%^&*;:()[]{}\"'/-+~\\<>");
    for (let i = 0; i < text.length; i++) {
        if (BOUNDARY_CHARS.has(text[i])) return true;
    }
    return false;
}


// // Computes the levenshtein distance between two strings
// function levenshtein(a, b) {
//     if (a.length === 0) return b.length;
//     if (b.length === 0) return a.length;

//     let matrix = Array.from({length: a.length + 1}, () => Array(b.length + 1).fill(0));

//     // Initialize matrix (rightmost column and bottom row)
//     for (let i = 0; i <= a.length; i++) {
//         matrix[i][b.length] = a.length - i;
//     }
//     for (let j = 0; j <= b.length; j++) {
//         matrix[a.length][j] = b.length - j;
//     }

//     for (let i = a.length - 1; i >= 0; i--) {
//         for (let j = b.length - 1; j >= 0; j--) {
//             if (a[i] === b[j]) {
//                 matrix[i][j] = matrix[i + 1][j + 1];
//             } else {
//                 matrix[i][j] = 1 + Math.min(matrix[i + 1][j], matrix[i][j + 1], matrix[i + 1][j + 1]);
//             }        
//         }
//     }
    
//     return matrix[0][0];
// }


function wordBigram(text) {
    // Preprocess text
    text = text.toLowerCase();
    const punc = new Set("\n\r,.?!@#$%^&*;:()[]{}\"'/-+~\\<>");
    let newText = "";
    for (let ch of text) {
        if (punc.has(ch)) {
            newText += " ";
        } else {
            newText += ch;
        }
    }
    const textList = newText.trim().split(/\s+/);
    let bigram = [];
    for (let j = 0; j < textList.length - 1; j++) {
        bigram.push(textList[j] + " " + textList[j + 1]);
    }

    return new Set(bigram);
}


function jaccardSim(bigram1, bigram2) {
    const sim = bigram1.intersection(bigram2).size / Math.max(bigram1.union(bigram2).size, 1);
    return sim;
}