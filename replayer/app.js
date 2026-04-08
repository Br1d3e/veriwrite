
import { loadRecord, startPlaying, stopPlaying, resetStatus, changeSpeed, updateDOM, seekToSession, seekNextSession, seekPrevSession, getSession, seekToEvent, getDocText } from "./modules/player.js"
import { cursorDOM, restoreCursor } from "./modules/renderer.js";
import { checkStruct, processData } from "./modules/loader.js";
import { calSession } from "./modules/stats/session/index.js";

import { Chart } from "chart.js/auto";


// HTML Elements
const fileEl = document.getElementById("file");
const screenEl = document.getElementById("screen");
const inputErrTxt = document.getElementById("invalidInput");
// Meta
const titleEl = document.getElementById("title");
const sessionsEl = document.getElementById("sessions");
const eventsEl = document.getElementById("events");
const durationEl = document.getElementById("duration");
const progressEl = document.getElementById("replayProg");
// Buttons
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const speedLbl = document.getElementById("speedLbl");
const speedSlider = document.getElementById("speedSlider");
const sessionBtns = document.getElementById("sessionBtns");
// Cursors
const caretEl = document.getElementById("caret");
const beforeEl = document.getElementById("before");
const afterEl = document.getElementById("after");
// Stats
const sessionStatsEl = document.getElementById("sessionStats");

const overviewEl = document.getElementById("overview");
const overviewLblsEl = document.getElementsByClassName("metric-label");
const sessionStartEl = document.getElementById("sessionStart");
const sessionEndEl = document.getElementById("sessionEnd");
const sesDurationEl = document.getElementById("sessionDuration");
const insCharsEl = document.getElementById("insChars");
const delCharsEl = document.getElementById("delChars");
const netCharsEl = document.getElementById("netChars");

const pasteEvEl = document.getElementById("pasteEv");

const flowEl = document.getElementById("flow");
const linearityValEl = document.getElementById("linearityVal");
const smoothnessValEl = document.getElementById("smoothnessVal");
const lineGraphEl = document.getElementById("linearityGraph");
const interruptPieEl = document.getElementById("interruptPie");
const normDisplayCb = document.getElementById("norm-display");
const interruptShortEl = document.getElementById("interrupt-short");
const interruptMedEl = document.getElementById("interrupt-medium");
const interruptLongEl = document.getElementById("interrupt-long");

const revisionEl = document.getElementById("revision");
const delInsValEl = document.getElementById("delInsVal");
const revRatioValEl = document.getElementById("revRatioVal");
const intensityPieEl = document.getElementById("intensity-pie");
const earlyGainValEl = document.getElementById("earlyGainVal");
const lateGainValEl = document.getElementById("lateGainVal");
const progGraphEl = document.getElementById("prog-graph");


// DOM Object transferred to recorder & player
const DOM = {
  caretEl: caretEl,
  beforeEl: beforeEl,
  afterEl: afterEl,
  eventsEl: eventsEl,
  durationEl: durationEl,
  progressEl: progressEl,
  speedLbl: speedLbl,
  titleEl: titleEl, 
  screenEl: screenEl,
  speedLbl: speedLbl,
  speedSlider: speedSlider,
  sessionsEl: sessionsEl,
  sessionBtns: sessionBtns
}


// Do not display metadata before file is uploaded
function initializeUpload() {
    inputErrTxt.hidden = true;
    titleEl.textContent = "";
    eventsEl.textContent = "";
    sessionsEl.textContent = "";
    durationEl.textContent = "";
    beforeEl.textContent = "";
    afterEl.textContent = "";
    caretEl.hidden = true;
    progressEl.value = 0;
}

function enableButtons() {
    playBtn.disabled = false;
    pauseBtn.disabled = false;
    resetBtn.disabled = false;
    speedSlider.disabled = false;
}

// Generate session buttons according to record.sessions
function genSessionBtns(sessions) {
  resetSessionBtns();

  // Prev button
  const prev = document.createElement("button");
  prev.id = "prev";
  prev.textContent = "Prev";
  sessionBtns.appendChild(prev)

  for (let i = 0; i < sessions.length; i++) {
    const btn = document.createElement("button");
    btn.id = i;
    btn.textContent = `Session ${i + 1}`;
    // Hover text: session start time and duration
    const start = new Date(sessions[i].t0);
    const end = new Date(sessions[i].tn);
    const duration = new Date(sessions[i].tn - sessions[i].t0);
    btn.title = `Start: ${start.toLocaleString()}\nEnd: ${end.toLocaleString()}`;
    sessionBtns.appendChild(btn);
  }

  // Next button
  const next = document.createElement("button");
  next.id = "next";
  next.textContent = "Next";
  sessionBtns.appendChild(next);
}

function resetSessionBtns() {
  while (sessionBtns.firstChild) {
    sessionBtns.removeChild(sessionBtns.firstChild);
  }
}

function genOverviewUI(desc) {
  overviewEl.hidden = false;
  // labels
  const [startLbl, endLbl, durationLbl, insLbl, delLbl, netLbl] = overviewLblsEl;
  startLbl.textContent = "Start Time";
  endLbl.textContent = "End Time";
  durationLbl.textContent = "Duration";
  insLbl.textContent = "Insert Characters";
  delLbl.textContent = "Delete Characters";
  netLbl.textContent = "Net Characters";
  // values
  const overview = desc.overview;
  sessionStartEl.textContent = new Date(overview.start).toLocaleString();
  const duration = new Date(overview.durationMs);
  sesDurationEl.textContent = duration.getUTCHours() + " Hours " + duration.getMinutes() + " Minutes";
  sessionEndEl.textContent = new Date(overview.end).toLocaleString();
  insCharsEl.textContent = overview.insChars;
  delCharsEl.textContent = overview.delChars;
  netCharsEl.textContent = overview.netChars;
}


function genMetricBox(label, value, id, color="black") {
  const box = document.createElement("div");
  box.className = "paste-box";
  box.id = id;
  const labelEl = document.createElement("span");
  labelEl.className = "paste-label";
  labelEl.id = id;
  const valueEl = document.createElement("span");
  valueEl.className = "paste-value";
  valueEl.id = id;
  labelEl.textContent = label;
  valueEl.textContent = value;
  valueEl.style = `color: ${color}`;
  box.appendChild(labelEl);
  box.appendChild(valueEl);
  return box;
}

function genPasteCards(pasteIns) {
  pasteEvEl.hidden = false;
  for (let i = 0; i < pasteIns.length; i++) {
    const evIdx = pasteIns[i].evIdx;
    const ins = pasteIns[i].ins;
    const rate = pasteIns[i].rate;
    const tags = pasteIns[i].tags;
    const lvl = pasteIns[i].lvl;

    const text = ins.length <= 80 ? ins : ins.slice(0, 80) + "...";   // Omit excessive texts
    const textBox = genMetricBox("Text", text, i);

    const lvlColor = lvl === "high" ? "red" : "rgb(255, 191, 0)";
    const lvlBox = genMetricBox("Level", lvl, i, lvlColor);
    const rateBox = genMetricBox("Rate (CPS)", rate, i);
    const metaCard = document.createElement("div");
    metaCard.className = "paste-meta";
    metaCard.id = i;
    metaCard.appendChild(lvlBox);
    metaCard.appendChild(rateBox);

    const tagsBox = genMetricBox("Tags", tags.join(", "), i);

    const cards = document.createElement("div");
    cards.id = i;
    cards.className = "paste-card";
    cards.appendChild(textBox);
    cards.appendChild(metaCard);
    cards.appendChild(tagsBox);

    pasteEvEl.appendChild(cards);
  }
}

function linearityGraph(flow, norm=false) {
  const x = flow.graph.raw.x;
  const y = flow.graph.raw.y;
  const xNorm = flow.graph.normalized.x;
  const yNorm = flow.graph.normalized.y;

  const line = [];
  const lineNorm = [];
  for (let i = 0; i < x.length; i++) {
    line.push({x: x[i], y: y[i]});
    lineNorm.push({x: xNorm[i], y: yNorm[i]});
  }


  const data = {
    datasets: [{
      data: line,
      fill: false,
      borderColor: 'rgb(6, 149, 221)',
      pointStyle: false,
      tension: 0.1
    }]
  }

  const plugins = {
    title: {
      display: true,
      text: 'Writing Progress',
      font: {
        size: 20,
        weight: "bold"
      },
      padding: {
        top: 10,
        bottom: 10
      }
    },
    legend: {
      display: false
    }
  }

  const xScale = {
    type: 'linear',
    position: 'bottom',
    title: {
      display: true,
      text: 'Writing Time (s)'
    }
  }

  const xScaleNorm = {
    type: 'linear',
    position: 'bottom',
    title: {
      display: true,
      text: 'Writing Time'
    }
  }  

  const yScale = {
    type: 'linear',
    position: 'left',
    title: {
      display: true,
      text: 'Total Inserted Characters'
    }
  }

  const scales = {
    x: xScale,
    y: yScale
  }

  // y = x reference line
  const refLine = {
    data: [
      {x: 0, y: 0}, 
      {x: 1, y: 1}
    ], 
    fill: false,
    borderColor: 'rgb(255, 21, 0)',
    borderWidth: 2,
    borderDash: [5, 5],
    tension: 0.1
  }

  if (norm) {
    data.datasets[0].data = lineNorm;
    data.datasets.push(refLine);
    scales.x = xScaleNorm;
    plugins.title.text = 'Normalized Writing Progress';
  }

  new Chart(lineGraphEl, {
    type: 'line',
    data: data,
    options: {
      plugins: plugins,
      scales: scales,
    }
  })
}
  

function pausePieChart(interrupt) {
  const ratios = [interrupt.pause2sRatio, interrupt.pause5sRatio, interrupt.pause10sRatio];
  const data = {
    labels: ["Short Pauses", "Extended Pauses", "Long Interrupts"],
    datasets: [{
      data: ratios,
      backgroundColor: ["rgba(29, 231, 7, 0.66)", "rgba(255, 191, 0, 0.69)", "rgba(255, 21, 0, 0.71)"],
    }]
  }
  const plugins = {
    title: {
      display: true,
      text: 'Writing Progress',
      font: {
        size: 20,
        weight: "bold"
      },
      padding: {
        bottom: 10
      }
    },
  }

  new Chart(interruptPieEl, {
    type: 'pie',
    data: data,
    options: {
      plugins: plugins,
    }
  })
}

function genFlowUI(flow) {
  const linearity = flow.linearity;
  const smoothness = flow.smoothness;
  const interrupt = flow.interruptProfile;

  flowEl.hidden = false;

  // Linearity
  linearityValEl.textContent = `${Math.round(linearity.score)} / 100`;

  // Smoothness
  smoothnessValEl.textContent = `${Math.round(smoothness.score)} / 100`;

  // Line Graph: Total Characters - Time
  linearityGraph(flow, normDisplayCb.checked);

  // Interrupt
  interruptShortEl.textContent = `${(interrupt.pause2sRatio * 100).toFixed(2)}%`;
  interruptMedEl.textContent = `${(interrupt.pause5sRatio * 100).toFixed(2)}%`;
  interruptLongEl.textContent = `${(interrupt.pause10sRatio * 100).toFixed(2)}%`;

  pausePieChart(interrupt);
} 

function revIntPieChart(revRatios) {
  const ratios = [revRatios.replace, revRatios.pureDel, revRatios.btIns];
  const data = {
    labels: ["Replace", "Pure Deletes", "Backtrack Inserts"],
    datasets: [{
      data: ratios,
      backgroundColor: ["rgba(7, 164, 231, 0.66)", "rgba(255, 191, 0, 0.69)", "rgba(255, 21, 0, 0.71)"]
    }]
  }

  const plugins = {
    title: {
      display: true,
      text: 'Revision Operation Types',
      font: {
        size: 20,
        weight: "bold"
      },
      padding: {
        bottom: 10
      }
    },
  }

  new Chart(intensityPieEl, {
    type: 'pie',
    data: data,
    options: {
      plugins: plugins,
      cutout: '40%'
    }
  });
}

function progSimGraph(progGraphData) {
  const prog = progGraphData.prog;
  const sim = progGraphData.sim;
  const line = [];
  for (let i = 0; i < prog.length; i++) {
    line.push({x: Math.round(prog[i] * 100), y: Math.round(sim[i] * 100)});
  }

  const data = {
    datasets: [{
      data: line,
      fill: false,
      borderColor: 'rgb(6, 149, 221)',
      pointStyle: false,
      tension: 0.1
    }]
  }

    const plugins = {
    title: {
      display: true,
      text: 'Product-process Similarity',
      font: {
        size: 20,
        weight: "bold"
      },
      padding: {
        top: 10,
        bottom: 10
      }
    },
    legend: {
      display: false
    }
  }

  const xScale = {
    type: 'linear',
    position: 'bottom',
    title: {
      display: true,
      text: 'Writing Process (%)'
    }
  }

  const yScale = {
    type: 'linear',
    position: 'left',
    title: {
      display: true,
      text: 'Similarity (%)'
    }
  }

  const scales = {
    x: xScale,
    y: yScale
  }

  new Chart(progGraphEl, {
    type: 'line',
    data: data,
    options: {
      plugins: plugins,
      scales: scales,
    }
  })
}

function genRevisionUI(revInt) {
  revisionEl.hidden = false;

  // intensity metrics
  const revRatios = revInt.revRatios;
  const progSim = revInt.productProcessSim;
  delInsValEl.textContent = `${(revRatios.delIns * 100).toFixed(2)}%`;
  revRatioValEl.textContent = `${(revRatios.total * 100).toFixed(2)}%`;
  // Donut chart for revision operation types
  revIntPieChart(revRatios);

  // product process similarity
  const progMetrics = progSim.metrics;
  const progGraphData = progSim.graph;
  earlyGainValEl.textContent = `${(progMetrics.earlyGain * 100).toFixed(2)}%`;
  lateGainValEl.textContent = `${(progMetrics.medianGain * 100).toFixed(2)}%`;
  // Line graph for product-process similarity
  progSimGraph(progGraphData);
}


function updateStatsPanel(sessionStats) {
  sessionStatsEl.hidden = false;
  const desc = sessionStats.desc;
  const interpret = sessionStats.interpret;

  // Overview
  genOverviewUI(desc);
  // Auto-scroll to stats panel
  overviewEl.scrollIntoView({
    behavior: "smooth",
    block: "end",
    inline: "end"
  })

  // Paste-like insertions
  genPasteCards(interpret.pasteIns);

  // Writing flow
  genFlowUI(interpret.flow);

  // Revision Intensity
  genRevisionUI(interpret.revisionIntensity);

}

export function resetStatsPanel() {
  sessionStatsEl.hidden = true;

  // Overview
  // for (let label of overviewLblsEl) {
  //   label.textContent = "";
  // }
  // for (let val of [sessionStartEl, sesDurationEl, sessionEndEl, insCharsEl, delCharsEl, netCharsEl]) {
  //   val.textContent = "";
  // }
  overviewEl.hidden = true;
  // Paste-like insertions
  while (pasteEvEl.firstChild) {
    pasteEvEl.removeChild(pasteEvEl.firstChild);
  }
  pasteEvEl.hidden = true;

  // Writing flow
  flowEl.hidden = true;
  const lineChart = Chart.getChart("linearityGraph");
  if (lineChart) {
    lineChart.destroy();
  }
  const pieChart = Chart.getChart("interruptPie");
  if (pieChart) {
    pieChart.destroy();
  }

  // Revision Intensity
  revisionEl.hidden = true;
  const intensityPie = Chart.getChart("intensity-pie");
  if (intensityPie) {
    intensityPie.destroy();
  }
  const progGraph = Chart.getChart("prog-graph");
  if (progGraph) {
    progGraph.destroy();
  }
}

let highlightSpan = null;
// Display highlighted text in screen container
function renderPasteHl (activePaste, text) {
  if (!inspectMode || !activePaste) return;
  const currentPos = text.length;
  const startPos = activePaste.startPos;
  const endPos = activePaste.endPos;
  const lvl = activePaste.lvl;
  const tags = activePaste.tags;

  if (currentPos >= startPos && currentPos >= endPos) {
    const start = text.slice(0, startPos);
    const highlight = text.slice(startPos, endPos);
    const end = text.slice(endPos);

    screenEl.replaceChildren();
    screenEl.append(document.createTextNode(start));

    const span = document.createElement("span");
    // Different display color for different levels/tags
    if (tags.includes("in-doc paste")) {
      span.className = "hl-low";
    }
    else if (lvl === "high") {
      span.className = "hl";
    } else if (lvl === "medium") {
      span.className = "hl-med";
    }

    span.title = "highlighted";
    span.textContent = highlight;
    screenEl.append(span);

    highlightSpan = span;

    screenEl.append(document.createTextNode(end));
  }
}

let sessionStats = null;
updateDOM(DOM);
let inspectMode = false;    // inspecting paste-like insertion

// Upload file & Data Check 
fileEl.addEventListener("change", async () => {
  const f = fileEl.files?.[0];
  if (!f) return;
  const fileText = await f.text();
  let flightRecord = JSON.parse(fileText);

  initializeUpload();

  if (!checkStruct(flightRecord)) {
    inputErrTxt.hidden = false;
    setTimeout(() => {
        inputErrTxt.hidden = true;
    }, 3000);
    return;
  }

  enableButtons();
  resetSessionBtns();
  resetStatsPanel();

  updateDOM(DOM);
  cursorDOM(DOM);

  // Normalize data using loader.js
  flightRecord = processData(flightRecord);
  // Pass record to player.js
  loadRecord(flightRecord);

  // Generate session buttons
  genSessionBtns(flightRecord.sessions);

  // Update session-level stats
  sessionStats = calSession(getSession());
  console.log(sessionStats);

  // Update HTML
  resetStatus();
});


// Event Listeners
playBtn.addEventListener("click", () => {
  if (inspectMode) {
    inspectMode = false;
    restoreCursor(screenEl);
  }
  startPlaying();
});
pauseBtn.addEventListener("click", stopPlaying);
resetBtn.addEventListener("click", resetStatus);
speedSlider.addEventListener("change", () => {
  changeSpeed(Number(speedSlider.value))
  });
// Switch sessions and show session stats details
sessionBtns.addEventListener("click", (e) => {
  if (e.target === null) return;
  const btnId = e.target.id;

  stopPlaying();
  let session = null;
  switch (btnId) {
    case "prev":
      session = seekPrevSession();
      break;
    case "next":
      session = seekNextSession();
      break
    default:
      const sid = Number(btnId);
      session = seekToSession(sid);
  }
  // test
  sessionStats = calSession(session);
  console.log(sessionStats);
  // Update HTML
  resetStatsPanel();
  updateStatsPanel(sessionStats);
  restoreCursor(screenEl);

})
pasteEvEl.addEventListener("click", (e) => {
  if (e.target.className === "paste" || e.target.className === null || e.target.id === null) return;
  const pasteIdx = Number(e.target.id);

  stopPlaying();
  restoreCursor(screenEl);

  const pasteIns = sessionStats.interpret.pasteIns;
  const activePaste = pasteIns[pasteIdx];
  const evIdx = activePaste.evIdx;
  seekToEvent(evIdx);

  inspectMode = true;

  const text = getDocText();
  renderPasteHl(activePaste, text);

  // Auto scroll after highlighting text
  highlightSpan.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center"
  })
})

normDisplayCb.addEventListener("change", () => {
  const flow = sessionStats.interpret.flow;
  // Remove previous graph
  const prevGraph = Chart.getChart("linearityGraph");
  if (prevGraph) {
    prevGraph.destroy();
  }

  linearityGraph(flow, normDisplayCb.checked);
})

