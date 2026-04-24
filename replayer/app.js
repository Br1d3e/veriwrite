
import { loadRecord, startPlaying, stopPlaying, resetStatus, changeSpeed, updateDOM, seekToSession, seekNextSession, seekPrevSession, getSession, seekToEvent, getDocText } from "./modules/player.js"
import { cursorDOM, renderCursor, restoreCursor, seekCaretTo} from "./modules/renderer.js";
import { checkStructV2, processData } from "./modules/loader.js";
import {
  getDocStats,
  getSessionStats,
  resetDocReport,
  resetDocUI,
  resetSesReport,
  resetStatsPanel,
  updateDocumentStats,
  updateSessionStats,
} from "./modules/statsPanel.js";


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
const pasteEvEl = document.getElementById("pasteEv");
const docGapsEl = document.getElementById("docGaps");


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

updateDOM(DOM);
let inspectMode = false;    // inspecting paste-like insertion

// Upload file & Data Check 
fileEl.addEventListener("change", async () => {
  const f = fileEl.files?.[0];
  if (!f) return;
  const fileText = await f.text();
  let flightRecord = JSON.parse(fileText);

  initializeUpload();

  if (!checkStructV2(flightRecord)) {
    inputErrTxt.hidden = false;
    setTimeout(() => {
        inputErrTxt.hidden = true;
    }, 3000);
    return;
  }

  enableButtons();
  resetSessionBtns();
  resetStatsPanel();
  resetDocUI();
  resetDocReport();
  resetSesReport();

  updateDOM(DOM);
  cursorDOM(DOM);

  // Normalize data using loader.js
  flightRecord = processData(flightRecord);
  // Pass record to player.js
  loadRecord(flightRecord);

  // Generate session buttons
  genSessionBtns(flightRecord.sessions);

  updateDocumentStats(flightRecord);
  updateSessionStats(getSession());

  // Update HTML
  resetStatus();
});


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
  resetSesReport();
  resetStatsPanel();
  updateSessionStats(session);
  restoreCursor(screenEl);

})
pasteEvEl.addEventListener("click", (e) => {
  const sessionStats = getSessionStats();
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

  // Auto scroll after highlighting text
  highlightSpan.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center"
  })
})

docGapsEl.addEventListener("click", (e) => {
  const docStats = getDocStats();
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
