// Session Replayer
// Input: flightRecorder (normalized)
// Output: Player Class used by app.js


// import { processData } from "./loader.js";
import { applyPatch, updateState, renderCursor } from "./renderer.js";
import { resetStatsPanel } from "../app.js";


// Global Variables & State Machine
let state = {
  i: 0,       // Event index
  evCount: 0,    // event count for progress bar
  evTotal: 0,    // number of events in total
  playing: false,
  speed: 1.0,
  budget: 0,
  lastFrameTs: 0,
  playTs: 0,     // Playback timestamp in ms
  record: null,      // Normalized flightRecorder
  sessions: null,     // Sessions Array
  currentSession: 0,    // index in session
  caretPos: 0,
  docText: ""
}


// DOM
let eventsEl = null;
let durationEl = null;
let progressEl = null;
let speedLbl = null;
let titleEl = null;
let caretEl = null;
let sessionsEl = null;



// Interface with app.js
// Load record from app.js
export function loadRecord(flightRecord) {
    state.record = flightRecord
    state.sessions = flightRecord.sessions;

    return flightRecord; 
}

export function startPlaying() {
    if (state.playing === true || !state.record) return;

    state.playing = true;
    console.log("Started Playing");

    state.lastFrameTs = performance.now();
    requestAnimationFrame(runSessions);
}


export function stopPlaying() {
    if (state.playing === false || !state.record) return;

    state.playing = false;
    console.log("Stopped Playing");
}

export function changeSpeed(newSpeed) {
    state.speed = newSpeed;
    speedLbl.textContent = `Speed: ${state.speed}x`;
}

export function getSession() {
  return state.sessions[state.currentSession];
}

export function getDocText() {
  return state.docText;
}

// Transfer necessary UI DOM from app.js
export function updateDOM(DOM) {    // an object
  eventsEl = DOM.eventsEl;
  durationEl = DOM.durationEl;
  progressEl = DOM.progressEl;
  speedLbl = DOM.speedLbl;
  titleEl = DOM.titleEl;
  caretEl = DOM.caretEl;
  sessionsEl = DOM.sessionsEl;
}

export function resetStatus() {
      if (!state.record) return;
      console.log("reset status");
      state.i = 0;
      state.playing = false;
      state.budget = 0;
      state.lastFrameTs = 0;
      state.playTs = 0;
      state.currentSession = 0;
      state.evCount = 0;
      titleEl.textContent = `Title: ${state.record.m.title}`;
      sessionsEl.textContent = `Session: ${state.currentSession + 1} / ${state.sessions.length}`;
      eventsEl.textContent = `Events: 0 /${state.sessions[0].ev.length}`;
      state.docText = state.sessions[0].init;   // Start with first session's init text
      durationEl.textContent = "Session Time: 00:00:00";
      state.evTotal = calculateTotalEv(state.sessions.length);
      progressEl.value = calculateProgress();
      // Reset caret
      state.caretPos = state.docText.length;
      caretEl.hidden = false;

      updateState(state);
      renderCursor();

      resetStatsPanel();
  }


function calculateTotalEv(totalS) {     // Total session numbers
  let total = 0;
  for (let i = 0; i < totalS; i++) {
    total += state.sessions[i].ev.length;
  }
  return total;
}

function calculateProgress() {
  return state.evCount / state.evTotal * 100;
}

function calculateTs(eventIdx) {
  let totalTs = 0;
  for (let i = 0; i < eventIdx; i++) {
    totalTs += state.sessions[state.currentSession].ev[i][0];
  }
  return totalTs;
}


/**
 * Runs through sessions in order
 */
function runSessions() {
  if (state.playing === false) return;

  const ev = state.sessions[state.currentSession].ev;

  step(ev);

  // Forward to next session
  if (state.i >= ev.length) {

    // Stop playing when finished all
    if (state.currentSession >= state.sessions.length - 1) {
      console.log(`Finished All Sessions`);
      // resetStatus();
      return;
    }

    seekNextSession();
  }

  requestAnimationFrame(runSessions);
}

/**
 * Switch to destinated session with sid
 * @param {number} sid session id starting from 0
 * @returns current session
 */
export function seekToSession(sid) {
    // validate sid
    if (typeof sid !== "number" || sid < 0 || sid >= state.sessions.length) return;

    state.currentSession = sid;
    state.i = 0;
    state.evCount = calculateTotalEv(state.currentSession);
    progressEl.value = calculateProgress();
    state.playTs = 0;
    eventsEl.textContent = `Events: ${state.i} /${state.sessions[state.currentSession].ev.length}`;
    durationEl.textContent = `Session Time: ${convertTs()}`;
    sessionsEl.textContent = `Session: ${state.currentSession + 1} / ${state.sessions.length}`;
    const init = state.sessions[state.currentSession].init ?? "";
    state.docText = init;
    state.caretPos = state.docText.length;
    renderCursor();

    return state.sessions[state.currentSession];   
}

export function seekNextSession() {
  if (state.currentSession >= state.sessions.length - 1) return;
  return seekToSession(state.currentSession + 1);
}

export function seekPrevSession() {
  if (state.currentSession <= 0) return;
  return seekToSession(state.currentSession - 1);
}


export function seekToEvent(eventIdx) {
  if (eventIdx < 0 || eventIdx >= state.sessions[state.currentSession].ev.length) return;

  state.i = 0;
  // (falsely) skip events to eventIdx
  const sessions = state.sessions[state.currentSession];
  const ev = sessions.ev;
  state.docText = sessions.init;
  for (; state.i <= eventIdx; state.i++) {
    const pos = ev[state.i][1];
    const delLen = ev[state.i][2];
    const ins = ev[state.i][3];

    state.docText = state.docText.slice(0, pos) + ins + state.docText.slice(pos + delLen);
  }

  state.playTs = calculateTs(eventIdx);
  state.playing = false;
  state.evCount = eventIdx;
  progressEl.value = calculateProgress();
  eventsEl.textContent = `Events: ${state.i} /${state.sessions[state.currentSession].ev.length}`;
  durationEl.textContent = `Session Time: ${convertTs()}`;

  renderCursor();
}


// let onRender = null;
// export function regOnRender(callback) {
//   onRender = callback;
// }

/**
 * Runs events in a single session
 * @param {Array} ev event array: sessions[currentSession].ev
 */
function step(ev) {
  if (state.playing === false) return;
  
  const now = performance.now();
  const frameMs = now - state.lastFrameTs;
  state.budget += frameMs * state.speed;

  updateState(state);

  // Replay
  while (state.i < ev.length && state.budget >= ev[state.i][0]) {
    applyPatch(ev[state.i]);
    state.playTs += ev[state.i][0];
    state.budget -= ev[state.i][0];
    state.i++;    // forwards to next event
    state.evCount++
  }
  state.lastFrameTs = performance.now();

  // if (onRender) {
  //   onRender();
  // } 

  // Update meta & progress bar
  eventsEl.textContent = `Events: ${state.i} /${ev.length}`;
  durationEl.textContent = `Session Time: ${convertTs()}`;
  progressEl.value = calculateProgress();
}


function convertTs() {
    const totalSec = state.playTs / 1000;
    const tsHr = Math.floor(totalSec / 3600);
    const tsMin = Math.floor((totalSec % 3600) / 60);
    const tsSec = Math.floor(totalSec % 60);
    const textHr = tsHr.toString().padStart(2, '0');
    const textMin = tsMin.toString().padStart(2, '0');
    const textSec = tsSec.toString().padStart(2, '0');

    return `${textHr}:${textMin}:${textSec}`;
}
