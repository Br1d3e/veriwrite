import { Chart } from "chart.js/auto";
import { calSession } from "./stats/session/index.js";
import { calDocStats } from "./stats/doc/index.js";
import { getDocText, seekToEvent, seekToSession, stopPlaying } from "./player.js";
import { restoreCursor } from "./renderer.js";

const screenEl = document.getElementById("screen");
const docStatsEl = document.getElementById("document-stats");
const docStartEl = document.getElementById("docStart");
const docEndEl = document.getElementById("docEnd");
const docSpanEl = document.getElementById("docSpan");
const docDurationEl = document.getElementById("docDuration");
const docActiveDaysEl = document.getElementById("docActiveDays");
const docSessionCountEl = document.getElementById("docSessionCount");
const docDurationsGraphBoxEl = document.getElementById("docDurationsGraphBox");
const docDurationsGraphEl = document.getElementById("docDurationsGraph");
const docInsertedCharsEl = document.getElementById("docInsertedChars");
const docDeletedCharsEl = document.getElementById("docDeletedChars");
const docNetCharsEl = document.getElementById("docNetChars");
const docWordCountEl = document.getElementById("docWordCount");
const docPasteOriginRatioEl = document.getElementById("docPasteOriginRatio");
const docEditHeatmapEl = document.getElementById("docEditHeatmap");
const docInsertCharsGraphBoxEl = document.getElementById("docInsertCharsGraphBox");
const docInsertCharsGraphEl = document.getElementById("docInsertCharsGraph");
const docOfflineTextRatioEl = document.getElementById("docOfflineTextRatio");
const docGapsEl = document.getElementById("docGaps");
const docStatsToggleEl = document.getElementById("docStatsToggle");
const docStatsBodyEl = document.getElementById("docStatsBody");
const docReportEl = document.getElementById("docReport");
const genDocReportBtn = document.getElementById("genDocReport");

const sessionStatsEl = document.getElementById("sessionStats");
const sessionStatsToggleEl = document.getElementById("sessionStatsToggle");
const sessionStatsBodyEl = document.getElementById("sessionStatsBody");
const sesReportEl = document.getElementById("sesReport");
const genSesReportBtn = document.getElementById("genSesReport");

const overviewEl = document.getElementById("overview");
const overviewLblsEl = overviewEl.getElementsByClassName("metric-label");
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
const linearityAdvCb = document.getElementById("linearity-adv-cb");
const linearityAdvEl = document.getElementById("linearity-adv");
const madValEl = document.getElementById("madVal");
const rmseValEl = document.getElementById("rmseVal");
const maxDevValEl = document.getElementById("maxDevVal");
const mad1stValEl = document.getElementById("mad1stVal");
const mse2ndValEl = document.getElementById("mse2ndVal");

const lineGraphEl = document.getElementById("linearityGraph");
const interruptPieEl = document.getElementById("interruptPie");
const normDisplayCb = document.getElementById("norm-display");
const interruptShortEl = document.getElementById("interrupt-short");
const interruptMedEl = document.getElementById("interrupt-medium");
const interruptLongEl = document.getElementById("interrupt-long");

const revisionEl = document.getElementById("revision");
const delInsValEl = document.getElementById("delInsVal");
const revRatioValEl = document.getElementById("revRatioVal");
const revIntPieEl = document.getElementById("intensity-pie");
const revOpTypesPieEl = document.getElementById("rev-op-types-pie");
const earlyGainValEl = document.getElementById("earlyGainVal");
const lateGainValEl = document.getElementById("lateGainVal");
const progDipEl = document.getElementById("prog-dip");
const totalDipValEl = document.getElementById("totalDipVal");
const maxDipValEl = document.getElementById("maxDipVal");
const dropRatioValEl = document.getElementById("dropRatioVal");

const progAdvCb = document.getElementById("prog-adv-cb");
const progAdvEl = document.getElementById("prog-adv");
const initFinalValEl = document.getElementById("initFinalVal");
const simP10ValEl = document.getElementById("simP10Val");
const simP30ValEl = document.getElementById("simP30Val");
const simMedValEl = document.getElementById("simMedVal");

const progGraphEl = document.getElementById("prog-graph");

let sessionStats = null;
let docStats = null;
let docReportLoading = false;
let docReportRequestId = 0;
let sesReportLoading = false;
let sesReportRequestId = 0;
let inspectMode = false;
let highlightSpan = null;

export function getSessionStats() {
  return sessionStats;
}

export function getDocStats() {
  return docStats;
}

function genOverviewUI(desc) {
  overviewEl.hidden = false;
  const [startLbl, endLbl, durationLbl, insLbl, delLbl, netLbl] = overviewLblsEl;
  startLbl.textContent = "Start Time";
  endLbl.textContent = "End Time";
  durationLbl.textContent = "Duration";
  insLbl.textContent = "Insert Characters";
  delLbl.textContent = "Delete Characters";
  netLbl.textContent = "Net Characters";

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

function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} Hours ${minutes} Minutes`;
}

function resetChart(canvasId) {
  const chart = Chart.getChart(canvasId);
  if (chart) chart.destroy();
}

function setStatsCollapsed(bodyEl, toggleEl, collapsed) {
  bodyEl.hidden = collapsed;
  toggleEl.textContent = collapsed ? "+" : "-";
  toggleEl.setAttribute("aria-expanded", String(!collapsed));
}

function genReportSection(sectionName, section) {
  const wrapper = document.createElement("section");
  wrapper.className = "docReport-section";

  const title = document.createElement("h4");
  title.textContent = section?.title || sectionName;

  const analysis = document.createElement("p");
  analysis.textContent = section?.observation || section?.analysis || "";

  wrapper.append(title, analysis);
  return wrapper;
}

function renderDocReport(report) {
  if (!report) {
    docReportEl.hidden = true;
    docReportEl.replaceChildren();
    return;
  }

  docReportEl.replaceChildren(
    genReportSection("Overview", report.overview),
    genReportSection("Timeline", report.timeline),
    genReportSection("Edit", report.edit),
    genReportSection("Continuity", report.continuity)
  );
  docReportEl.hidden = false;
}

function renderSesReport(report) {
  if (!report) {
    sesReportEl.hidden = true;
    sesReportEl.replaceChildren();
    return;
  }

  sesReportEl.replaceChildren(
    genReportSection("Overview", report.overview),
    genReportSection("Writing Flow", report.writingFlow),
    genReportSection("Paste-like Insertions", report.pasteIns),
    genReportSection("Revision Intensity", report.revisionIntensity)
  )
  sesReportEl.hidden = false;
}

function barChart(canvasEl, title, labels, values, yLabel) {
  resetChart(canvasEl.id);
  new Chart(canvasEl, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: 'rgba(6, 149, 221, 0.66)'
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 20, weight: "bold" },
          padding: { top: 10, bottom: 10 }
        },
        legend: { display: false }
      },
      scales: {
        y: {
          title: {
            display: true,
            text: yLabel
          }
        }
      }
    }
  });
}

function genPatchBox(textPatch, id) {
  const box = document.createElement("div");
  box.className = "paste-box doc-patch-preview";
  box.id = id;

  const labelEl = document.createElement("span");
  labelEl.className = "paste-label";
  labelEl.textContent = "Text Patch";

  const valueEl = document.createElement("span");
  valueEl.className = "paste-value";
  valueEl.id = id;

  let charCount = 0;
  const maxChars = 240;
  for (let patch of textPatch) {
    for (let [op, text] of patch.diffs) {
      if (op === 0) continue;

      const normalized = text.replace(/\s+/g, " ").trim();
      if (!normalized) continue;

      const prefix = op === 1 ? "+ " : "- ";
      const patchLine = prefix + normalized;
      const remaining = maxChars - charCount;
      if (remaining <= 0) break;

      const span = document.createElement("span");
      span.className = op === 1 ? "doc-patch-add" : "doc-patch-del";
      span.textContent = patchLine.length <= remaining ? patchLine : patchLine.slice(0, remaining) + "...";
      valueEl.appendChild(span);
      valueEl.appendChild(document.createElement("br"));
      charCount += span.textContent.length;
    }
  }

  if (valueEl.childNodes.length === 0) {
    valueEl.textContent = "No visible text patch";
  }

  box.append(labelEl, valueEl);
  return box;
}

function getPatchHighlightRange(textPatch, textLength) {
  for (let patch of textPatch) {
    let pos = patch.start2;
    let start = null;
    let end = pos;

    for (let [op, text] of patch.diffs) {
      if (op === 0) {
        pos += text.length;
        continue;
      }

      if (start === null) start = pos;

      if (op === 1) {
        pos += text.length;
        end = pos;
      } else {
        end = Math.max(end, pos);
      }
    }

    if (start !== null) {
      start = Math.max(0, Math.min(start, textLength));
      end = Math.max(start, Math.min(end, textLength));
      return { start, end };
    }
  }
  return { start: 0, end: 0 };
}

function renderGapHl(gap) {
  const text = getDocText();
  const { start, end } = getPatchHighlightRange(gap.textPatch, text.length);
  const before = text.slice(0, start);
  const highlight = text.slice(start, end);
  const after = text.slice(end);

  screenEl.replaceChildren();
  screenEl.append(document.createTextNode(before));

  const span = document.createElement("span");
  span.className = gap.majorDiff ? "hl" : "hl-med";
  span.title = "offline text patch";
  span.textContent = highlight || "[offline deletion]";
  screenEl.append(span);

  highlightSpan = span;
  screenEl.append(document.createTextNode(after));

  highlightSpan.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center"
  });
}

function renderPasteHl(activePaste, text) {
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
    if (tags.includes("in-doc paste") || tags.includes("replacement")) {
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

function genPasteCards(pasteIns) {
  pasteEvEl.hidden = false;
  for (let i = 0; i < pasteIns.length; i++) {
    const evIdx = pasteIns[i].evIdx;
    const ins = pasteIns[i].ins;
    const rate = pasteIns[i].rate;
    const tags = pasteIns[i].tags;
    const lvl = pasteIns[i].lvl;

    const text = ins.length <= 80 ? ins : ins.slice(0, 80) + "...";
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
  resetChart("linearityGraph");
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
      font: { size: 20, weight: "bold" },
      padding: { top: 10, bottom: 10 }
    },
    legend: { display: false }
  }

  const scales = {
    x: {
      type: 'linear',
      position: 'bottom',
      title: { display: true, text: 'Writing Time (s)' }
    },
    y: {
      type: 'linear',
      position: 'left',
      title: { display: true, text: 'Total Inserted Characters' }
    }
  }

  if (norm) {
    data.datasets[0].data = lineNorm;
    data.datasets.push({
      data: [{x: 0, y: 0}, {x: 1, y: 1}],
      fill: false,
      borderColor: 'rgb(255, 21, 0)',
      borderWidth: 2,
      borderDash: [5, 5],
      tension: 0.1
    });
    scales.x.title.text = 'Writing Time';
    plugins.title.text = 'Normalized Writing Progress';
  }

  new Chart(lineGraphEl, {
    type: 'line',
    data: data,
    options: { plugins, scales }
  })
}

function pausePieChart(interrupt) {
  resetChart("interruptPie");
  new Chart(interruptPieEl, {
    type: 'pie',
    data: {
      labels: ["Short Pauses", "Extended Pauses", "Long Interrupts"],
      datasets: [{
        data: [interrupt.pause2sRatio, interrupt.pause5sRatio, interrupt.pause10sRatio],
        backgroundColor: ["rgba(29, 231, 7, 0.66)", "rgba(255, 191, 0, 0.69)", "rgba(255, 21, 0, 0.71)"],
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Writing Progress',
          font: { size: 20, weight: "bold" },
          padding: { bottom: 10 }
        }
      }
    }
  })
}

function genFlowUI(flow) {
  const linearity = flow.linearity;
  const smoothness = flow.smoothness;
  const interrupt = flow.interruptProfile;

  flowEl.hidden = false;
  linearityValEl.textContent = `${Math.round(linearity.score)} / 100`;
  smoothnessValEl.textContent = `${Math.round(smoothness.score)} / 100`;

  if (linearityAdvCb.checked) {
    madValEl.textContent = `${linearity.mad.toFixed(4)}s`;
    rmseValEl.textContent = `${linearity.rmse.toFixed(4)}s`;
    maxDevValEl.textContent = `${linearity.maxDeviation.toFixed(4)}s`;
    mad1stValEl.textContent = `${smoothness.mad1stDeri.toFixed(4)}s`;
    mse2ndValEl.textContent = `${smoothness.mse2ndDeri.toFixed(4)}s`;
  }

  linearityGraph(flow, normDisplayCb.checked);

  interruptShortEl.textContent = `${(interrupt.pause2sRatio * 100).toFixed(2)}%`;
  interruptMedEl.textContent = `${(interrupt.pause5sRatio * 100).toFixed(2)}%`;
  interruptLongEl.textContent = `${(interrupt.pause10sRatio * 100).toFixed(2)}%`;

  pausePieChart(interrupt);
}

function revIntPieChart(revRatios) {
  resetChart("intensity-pie");
  new Chart(revIntPieEl, {
    type: 'pie',
    data: {
      labels: ["Revision", "Normal Flow"],
      datasets: [{
        data: [revRatios.total, 1 - revRatios.total],
        backgroundColor: ["rgba(7, 164, 231, 0.66)", "rgba(0, 255, 208, 0.66)"]
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Revision Intensity',
          font: { size: 20, weight: "bold" },
          padding: { bottom: 10 }
        }
      }
    }
  });
}

function revOpTypesPieChart(revRatios) {
  resetChart("rev-op-types-pie");
  new Chart(revOpTypesPieEl, {
    type: 'pie',
    data: {
      labels: ["Replace", "Pure Deletes", "Backtrack Inserts"],
      datasets: [{
        data: [revRatios.replace, revRatios.pureDel, revRatios.btIns],
        backgroundColor: ["rgba(7, 164, 231, 0.66)", "rgba(255, 191, 0, 0.69)", "rgba(255, 21, 0, 0.71)"]
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Revision Operation Types',
          font: { size: 20, weight: "bold" },
          padding: { bottom: 10 }
        }
      },
      cutout: '40%'
    }
  });
}

function progSimGraph(progGraphData) {
  resetChart("prog-graph");
  const line = [];
  for (let i = 0; i < progGraphData.prog.length; i++) {
    line.push({x: Math.round(progGraphData.prog[i] * 100), y: Math.round(progGraphData.sim[i] * 100)});
  }

  new Chart(progGraphEl, {
    type: 'line',
    data: {
      datasets: [{
        data: line,
        fill: false,
        borderColor: 'rgb(6, 149, 221)',
        pointStyle: false,
        tension: 0.1
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Product-process Similarity',
          font: { size: 20, weight: "bold" },
          padding: { top: 10, bottom: 10 }
        },
        legend: { display: false }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: { display: true, text: 'Writing Process (%)' }
        },
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Similarity (%)' }
        }
      }
    }
  })
}

function genRevisionUI(revInt) {
  revisionEl.hidden = false;
  const revRatios = revInt.revRatios;
  const progSim = revInt.productProcessSim;
  delInsValEl.textContent = `${(revRatios.delIns * 100).toFixed(2)}%`;
  revRatioValEl.textContent = `${(revRatios.total * 100).toFixed(2)}%`;

  const progMetrics = progSim.metrics;
  earlyGainValEl.textContent = `${(progMetrics.earlyGain * 100).toFixed(2)}%`;
  lateGainValEl.textContent = `${(progMetrics.medianGain * 100).toFixed(2)}%`;

  if (progMetrics.totalDip > 0) {
    progDipEl.hidden = false;
    totalDipValEl.textContent = `${(progMetrics.totalDip * 100).toFixed(2)}%`;
    maxDipValEl.textContent = `${(progMetrics.maxDip * 100).toFixed(2)}%`;
    dropRatioValEl.textContent = `${(progMetrics.dropRatio * 100).toFixed(2)}%`;
  }

  if (progAdvCb.checked) {
    initFinalValEl.textContent = `${(progMetrics.initFinal * 100).toFixed(2)}%`;
    simP10ValEl.textContent = `${(progMetrics.p10 * 100).toFixed(2)}%`;
    simP30ValEl.textContent = `${(progMetrics.p30 * 100).toFixed(2)}%`;
    simMedValEl.textContent = `${(progMetrics.med * 100).toFixed(2)}%`;
  }

  revIntPieChart(revRatios);
  revOpTypesPieChart(revRatios);
  progSimGraph(progSim.graph);
}

function genTimelineUI(timeline) {
  docStartEl.textContent = new Date(timeline.docStartTs).toLocaleString();
  docEndEl.textContent = new Date(timeline.docEndTs).toLocaleString();
  docSpanEl.textContent = formatDuration(timeline.docSpanTs);
  docDurationEl.textContent = formatDuration(timeline.durationTs);
  docActiveDaysEl.textContent = timeline.activeDays.size;
  docSessionCountEl.textContent = timeline.sessionCount;

  if (timeline.sessionCount <= 1) {
    docDurationsGraphBoxEl.hidden = true;
    resetChart("docDurationsGraph");
    return;
  }

  docDurationsGraphBoxEl.hidden = false;
  barChart(
    docDurationsGraphEl,
    "Session Durations",
    timeline.durationsGraph.x,
    timeline.durationsGraph.y.map(ms => Math.round(ms / 60000)),
    "Minutes"
  );
}

function genEditHeatmapUI(heatmap, activeDays) {
  docEditHeatmapEl.replaceChildren();
  const days = Array.from(activeDays);
  docEditHeatmapEl.style.gridTemplateColumns = `repeat(${days.length + 1}, minmax(28px, 1fr))`;

  const empty = document.createElement("div");
  empty.className = "heatmap-label";
  docEditHeatmapEl.appendChild(empty);

  for (let day of days) {
    const label = document.createElement("div");
    label.className = "heatmap-label";
    label.textContent = day.slice(5);
    label.title = day;
    docEditHeatmapEl.appendChild(label);
  }

  let maxValue = 0;
  for (let hour = 0; hour < heatmap.length; hour++) {
    for (let dayIdx = 0; dayIdx < heatmap[hour].length; dayIdx++) {
      maxValue = Math.max(maxValue, heatmap[hour][dayIdx]);
    }
  }

  for (let hour = 0; hour < 24; hour++) {
    const hourLabel = document.createElement("div");
    hourLabel.className = "heatmap-label";
    hourLabel.textContent = `${hour}:00`;
    docEditHeatmapEl.appendChild(hourLabel);

    for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
      const value = heatmap[hour]?.[dayIdx] ?? 0;
      const intensity = maxValue > 0 ? value / maxValue : 0;
      const cell = document.createElement("div");
      cell.className = "heatmap-cell";
      cell.style.backgroundColor = `rgba(6, 149, 221, ${0.08 + intensity * 0.82})`;
      cell.textContent = value ? value.toFixed(1) : "";
      cell.title = `${days[dayIdx]} ${hour}:00 - ${value.toFixed(1)} minutes`;
      docEditHeatmapEl.appendChild(cell);
    }
  }
}

function genEditUI(edit, timeline) {
  docInsertedCharsEl.textContent = edit.insertedChars;
  docDeletedCharsEl.textContent = edit.deletedChars;
  docNetCharsEl.textContent = edit.netChars;
  docWordCountEl.textContent = edit.wordCount;
  docPasteOriginRatioEl.textContent = `${(edit.pasteOriginRatio * 100).toFixed(2)}%`;
  genEditHeatmapUI(edit.heatmap, timeline.activeDays);

  if (timeline.sessionCount <= 1) {
    docInsertCharsGraphBoxEl.hidden = true;
    resetChart("docInsertCharsGraph");
    return;
  }

  docInsertCharsGraphBoxEl.hidden = false;
  barChart(
    docInsertCharsGraphEl,
    "Inserted Characters by Session",
    edit.insCharsGraph.x,
    edit.insCharsGraph.y,
    "Characters"
  );
}

function genContinuityUI(continuity) {
  docOfflineTextRatioEl.textContent = `${(continuity.offlineTextRatio * 100).toFixed(2)}%`;
  docGapsEl.replaceChildren();

  if (continuity.gaps.length === 0) {
    const empty = document.createElement("div");
    empty.className = "metric-box";
    const label = document.createElement("span");
    label.className = "metric-label";
    label.textContent = "Gaps";
    const value = document.createElement("span");
    value.className = "metric-value";
    value.textContent = "No offline continuity gaps detected";
    empty.append(label, value);
    docGapsEl.appendChild(empty);
    return;
  }

  for (let i = 0; i < continuity.gaps.length; i++) {
    const gap = continuity.gaps[i];
    const card = document.createElement("div");
    card.className = "doc-gap-card";
    card.id = i;
    card.title = "Click to jump to the patch location";

    const content = document.createElement("div");
    content.className = "doc-gap-metrics";
    const title = document.createElement("div");
    title.className = "doc-gap-title";
    title.textContent = `Between session ${gap.prevSession} and ${gap.nextSession}`;

    const durationBox = genMetricBox("Gap Duration", formatDuration(gap.gapMs), i);
    const charsBox = genMetricBox("Chars Diff", gap.charsDiff, i, gap.majorDiff ? "red" : "black");
    if (gap.majorDiff) charsBox.classList.add("doc-gap-major");
    const patchBox = genPatchBox(gap.textPatch, i);

    content.append(title, durationBox, charsBox, patchBox);
    card.appendChild(content);
    docGapsEl.appendChild(card);
  }
}

async function getDocReport(docStats) {
  if (docReportLoading || !docStats) return;
  const statusEl = document.getElementById("docReportStatus");
  const requestId = ++docReportRequestId;
  docReportLoading = true;
  genDocReportBtn.disabled = true;

  try {
    statusEl.textContent = "Generating...";
    renderDocReport(null);
    const res = await fetch("/api/doc-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentStats: docStats })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (requestId !== docReportRequestId) return data;
    renderDocReport(data);
    statusEl.textContent = "Done";
    return data;
  } catch(e) {
    if (requestId !== docReportRequestId) return null;
    statusEl.textContent = "Error";
    renderDocReport({
      overview: {
        title: "Report Error",
        observation: e.message
      }
    });
    console.error(e);
  } finally {
    if (requestId === docReportRequestId) {
      docReportLoading = false;
      genDocReportBtn.disabled = false;
    }
  }
}

async function getSesReport(sessionStats) {
  if (sesReportLoading || !sessionStats) return;
  const sesStatusEl = document.getElementById("sesReportStatus");
  sesReportLoading = true;
  const requestId = ++sesReportRequestId;
  genSesReportBtn.disabled = true;

  try {
    sesStatusEl.textContent = "Generating...";
    renderSesReport(null);
    const res = await fetch("/api/ses-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionStats: sessionStats })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (requestId !== sesReportRequestId) return data;
    renderSesReport(data);
    sesStatusEl.textContent = "Done";
    return data;
  } catch(e) {
    if (requestId !== sesReportRequestId) return null;
    sesStatusEl.textContent = "Error";
    renderSesReport({
      overview: {
        title: "Report Error",
        observation: e.message
      }
    });
    console.error(e);
  } finally {
    if (requestId === sesReportRequestId) {
      sesReportLoading = false;
      setSessionReportEnabled(Boolean(sessionStats));
    }
  }
}

function setSessionReportEnabled(enabled) {
  genSesReportBtn.disabled = !enabled || sesReportLoading;
}

export function resetDocReport() {
  const statusEl = document.getElementById("docReportStatus");
  docReportRequestId++;
  docReportLoading = false;
  statusEl.textContent = "";
  genDocReportBtn.disabled = false;
  renderDocReport(null);
}

export function resetSesReport() {
  const sesStatusEl = document.getElementById("sesReportStatus");
  sesReportRequestId++;
  sesReportLoading = false;
  sesStatusEl.textContent = "";
  setSessionReportEnabled(Boolean(sessionStats));
  renderSesReport(null);
}

function updateDocUI(docStats) {
  docStatsEl.hidden = false;
  setStatsCollapsed(docStatsBodyEl, docStatsToggleEl, false);
  genTimelineUI(docStats.timeline);
  genEditUI(docStats.edit, docStats.timeline);
  genContinuityUI(docStats.continuity);
}

export function resetDocUI() {
  docStats = null;
  docStatsEl.hidden = true;
  setStatsCollapsed(docStatsBodyEl, docStatsToggleEl, false);
  for (let val of [
    docStartEl,
    docEndEl,
    docSpanEl,
    docDurationEl,
    docActiveDaysEl,
    docSessionCountEl,
    docInsertedCharsEl,
    docDeletedCharsEl,
    docNetCharsEl,
    docWordCountEl,
    docPasteOriginRatioEl,
    docOfflineTextRatioEl
  ]) {
    val.textContent = "";
  }

  docEditHeatmapEl.replaceChildren();
  docGapsEl.replaceChildren();
  renderDocReport(null);
  resetChart("docDurationsGraph");
  resetChart("docInsertCharsGraph");
  docDurationsGraphBoxEl.hidden = false;
  docInsertCharsGraphBoxEl.hidden = false;
}

export function updateDocumentStats(flightRecord) {
  docStats = calDocStats(flightRecord);
  updateDocUI(docStats);
  return docStats;
}

function updateSessionStatsPanel(sessionStats) {
  if (!sessionStats) {
    resetStatsPanel();
    resetSesReport();
    return;
  }

  sessionStatsEl.hidden = false;
  setStatsCollapsed(sessionStatsBodyEl, sessionStatsToggleEl, false);
  setSessionReportEnabled(true);
  const desc = sessionStats.desc;
  const interpret = sessionStats.interpret;
  genOverviewUI(desc);
  overviewEl.scrollIntoView({
    behavior: "smooth",
    block: "end",
    inline: "end"
  })
  genPasteCards(interpret.pasteIns);
  genFlowUI(interpret.flow);
  genRevisionUI(interpret.revisionIntensity);
}

export function updateSessionStats(session) {
  sessionStats = calSession(session);
  setSessionReportEnabled(Boolean(sessionStats));
  updateSessionStatsPanel(sessionStats);
  return sessionStats;
}

export function resetStatsPanel() {
  sessionStats = null;
  inspectMode = false;
  highlightSpan = null;
  sessionStatsEl.hidden = true;
  setStatsCollapsed(sessionStatsBodyEl, sessionStatsToggleEl, false);
  overviewEl.hidden = true;
  pasteEvEl.replaceChildren();
  pasteEvEl.hidden = true;
  flowEl.hidden = true;
  linearityAdvEl.hidden = true;
  resetChart("linearityGraph");
  resetChart("interruptPie");
  revisionEl.hidden = true;
  progDipEl.hidden = true;
  progAdvEl.hidden = true;
  resetChart("intensity-pie");
  resetChart("rev-op-types-pie");
  resetChart("prog-graph");
}

docStatsToggleEl.addEventListener("click", () => {
  setStatsCollapsed(docStatsBodyEl, docStatsToggleEl, !docStatsBodyEl.hidden);
})

sessionStatsToggleEl.addEventListener("click", () => {
  setStatsCollapsed(sessionStatsBodyEl, sessionStatsToggleEl, !sessionStatsBodyEl.hidden);
})

normDisplayCb.addEventListener("change", () => {
  if (!sessionStats) return;
  linearityGraph(sessionStats.interpret.flow, normDisplayCb.checked);
})

linearityAdvCb.addEventListener("change", () => {
  if (!sessionStats) return;
  linearityAdvEl.hidden = !linearityAdvCb.checked;
  genFlowUI(sessionStats.interpret.flow);
})

progAdvCb.addEventListener("change", () => {
  if (!sessionStats) return;
  progAdvEl.hidden = !progAdvCb.checked;
  genRevisionUI(sessionStats.interpret.revisionIntensity);
})

genDocReportBtn.addEventListener("click", () => {
  getDocReport(docStats);
})

genSesReportBtn.addEventListener("click", () => {
  getSesReport(sessionStats);
})

pasteEvEl.addEventListener("click", (e) => {
  if (!sessionStats) return;
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

  highlightSpan.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center"
  })
})

docGapsEl.addEventListener("click", (e) => {
  const card = e.target.closest(".doc-gap-card");
  if (!card || !docStats) return;

  const gap = docStats.continuity.gaps[Number(card.id)];
  if (!gap) return;

  stopPlaying();
  restoreCursor(screenEl);
  const session = seekToSession(gap.nextSession - 1);
  resetStatsPanel();
  updateSessionStats(session);
  renderGapHl(gap);
  inspectMode = true;
})
