
import { loadRecord, startPlaying, stopPlaying, resetStatus, changeSpeed, updateDOM, seekToSession, seekNextSession, seekPrevSession, getSession } from "./modules/player.js"
import { cursorDOM, restoreCursor } from "./modules/renderer.js";
import { checkStruct, processData } from "./modules/loader.js";
import {
  renderDocGapHighlight,
  resetDocReport, 
  resetDocUI,
  setDocGapSelectedHandler,
  updateDocumentStats
} from "./modules/stats/ui/docStatsPanel.js";
import {
  resetSesReport,
  resetSessionStatsPanel,
  updateSessionStats
} from "./modules/stats/ui/sessionStatsPanel.js"
import { queryTitle, queryAuthor, getRecordById } from "./modules/recordApi.js";
import { renderIntegrityPanel, resetIntegrityPanel } from "./modules/stats/ui/integrityPanel.js";


// HTML Elements
const fileEl = document.getElementById("file");
const screenEl = document.getElementById("screen");
const inputErrTxt = document.getElementById("invalidInput");
// Search
const searchBarEl = document.getElementById("search-bar");
const searchOptEl = document.getElementById("search-options");
const searchResultsEl = document.getElementById("search-results");
// Meta
const titleEl = document.getElementById("title");
const sessionsEl = document.getElementById("sessions");
const eventsEl = document.getElementById("events");
const durationEl = document.getElementById("duration");
const sessionProgEl = document.getElementById("session-prog");
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


// DOM Object transferred to recorder & player
const DOM = {
  caretEl: caretEl,
  beforeEl: beforeEl,
  afterEl: afterEl,
  eventsEl: eventsEl,
  durationEl: durationEl,
  sessionProgEl: sessionProgEl,
  progressEl: progressEl,
  speedLbl: speedLbl,
  titleEl: titleEl, 
  screenEl: screenEl,
  speedLbl: speedLbl,
  speedSlider: speedSlider,
  sessionsEl: sessionsEl,
  sessionBtns: sessionBtns
}

// Current active flightRecord
let flightRecord;

// Do not display metadata before file is uploaded
function initializeApp() {
  inputErrTxt.hidden = true;
  titleEl.textContent = "";
  eventsEl.textContent = "";
  sessionsEl.textContent = "";
  durationEl.textContent = "";
  beforeEl.textContent = "";
  afterEl.textContent = "";
  caretEl.hidden = true;
  sessionProgEl.value = 0;
  progressEl.value = 0;
}

function startReplayer(flightRecord, v = 3) {
  initializeApp();

  if (!checkStruct(flightRecord, v)) {
    inputErrTxt.hidden = false;
    setTimeout(() => {
        inputErrTxt.hidden = true;
    }, 3000);
    return;
  }

  enableButtons();
  resetSessionBtns();
  resetSessionStatsPanel();
  resetDocUI();
  resetDocReport();
  resetSesReport();
  resetIntegrityPanel();

  updateDOM(DOM);
  cursorDOM(DOM);

  // Normalize data using loader.js
  flightRecord = processData(flightRecord);
  // Pass record to player.js
  loadRecord(flightRecord);
  console.log(flightRecord);

  // Generate session buttons
  const sessions = flightRecord.sessions || flightRecord.s;
  genSessionBtns(sessions);

  updateDocumentStats(flightRecord);
  updateSessionStats(getSession());

  // Update HTML
  resetStatus();
  firstBlockIntegrity(getSession());
}

function getFirstBlock(session) {
  const blocks = session?.b || session?.blocks;
  return Array.isArray(blocks) && blocks.length > 0 ? blocks[0] : null;
}

function firstBlockIntegrity(session) {
  const block = getFirstBlock(session);
  if (block) {
    renderIntegrityPanel(session, block);
  } else {
    resetIntegrityPanel();
  }
}

async function updateSearch() {
  const input = searchBarEl.value.trim();
  const op = searchOptEl.value;

  if (!input || !op) {
    genSearchResultsUI([]);
    return [];
  }

  let results;
  if (op === "title") {
    results = await queryTitle(input);
  } else if (op === "author") {
    results = await queryAuthor(input);
  }
  genSearchResultsUI(results);
  
  return results;
}

function genSearchResultsUI(results) {
  searchResultsEl.replaceChildren();

  if (!results || results.length === 0) {
    const span = document.createElement("span");
    span.className = "search-empty";
    span.textContent = "No Results";
    searchResultsEl.appendChild(span);
  } else {
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      const title = row.title;
      const author = row.author;
      
      const searchCard = document.createElement("div");
      searchCard.className = "search-card";
      searchCard.id = i;
      searchCard.tabIndex = 0;
      searchCard.role = "button";
      const titleEl = document.createElement("span");
      titleEl.className = "search-title";
      titleEl.textContent = title;
      const metaEl = document.createElement("span");
      metaEl.className = "search-meta";
      const docStart = new Date(row.t0);
      const docEnd = new Date(row.tn);
      metaEl.textContent = `Author: ${author || "Unknown"} · ${docStart.toLocaleDateString()}`;
      searchCard.appendChild(titleEl);
      searchCard.appendChild(metaEl);
      searchResultsEl.appendChild(searchCard);
    }
  }
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

updateDOM(DOM);


fileEl.addEventListener("change", async () => {
  const f = fileEl.files?.[0];
  if (!f) return;
  const fileText = await f.text();
  flightRecord = JSON.parse(fileText);

  startReplayer(flightRecord, 2);
});

let searchResults;
searchBarEl.addEventListener("input", async () => {
  searchResults = await updateSearch();
})

searchResultsEl.addEventListener("click", async (e) => {
  if (!searchResults) return;
  const searchCard = e.target.closest(".search-card");
  if (!searchCard) return;

  const docId = searchResults[Number(searchCard.id)].d_id;
  flightRecord = await getRecordById(docId);

  startReplayer(flightRecord);
})

playBtn.addEventListener("click", () => {
  restoreCursor(screenEl);
  startPlaying();
});
pauseBtn.addEventListener("click", stopPlaying);
resetBtn.addEventListener("click", () => {
  resetStatus();
  resetSessionStatsPanel();
});
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
  resetSessionStatsPanel();
  updateSessionStats(session);
  firstBlockIntegrity(session);
  restoreCursor(screenEl);
})

setDocGapSelectedHandler((gap) => {
  stopPlaying();
  restoreCursor(screenEl);
  const session = seekToSession(gap.nextSession - 1);
  resetSesReport();
  resetSessionStatsPanel();
  updateSessionStats(session);
  renderDocGapHighlight(gap);
});
