import { Chart } from "chart.js/auto";
import { calDocStats } from "../doc/index.js";
import { getDocText } from "../../player.js";

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

let docStats = null;
let docReportLoading = false;
let docReportRequestId = 0;
let inspectMode = false;
let highlightSpan = null;
let onDocGapSelected = null;

export function getDocStats() {
  return docStats;
}

export function setDocGapSelectedHandler(handler) {
  onDocGapSelected = handler;
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

export function renderDocGapHighlight(gap) {
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
  inspectMode = true;
}

export function resetDocReport() {
  const statusEl = document.getElementById("docReportStatus");
  docReportRequestId++;
  docReportLoading = false;
  statusEl.textContent = "";
  genDocReportBtn.disabled = false;
  renderDocReport(null);
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

docStatsToggleEl.addEventListener("click", () => {
  setStatsCollapsed(docStatsBodyEl, docStatsToggleEl, !docStatsBodyEl.hidden);
})

genDocReportBtn.addEventListener("click", () => {
  getDocReport(docStats);
})

docGapsEl.addEventListener("click", (e) => {
  const card = e.target.closest(".doc-gap-card");
  if (!card || !docStats) return;

  const gap = docStats.continuity.gaps[Number(card.id)];
  if (!gap) return;

  if (onDocGapSelected) onDocGapSelected(gap);
})
