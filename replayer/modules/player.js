// Session Replayer
// Input: flightRecorder (normalized)
// Output: Player Class used by app.js


import { processData } from "./loader.js";
import { applyPatch, normalizeLines, updateState, renderCursor } from "./renderer.js";


// Global Variables & State Machine
const i = 0;    // Event index
const playing = false;
const speed = 1;
const budget = 0;
const lastFrameTs = 0;
const playTs = 0;     // Playback timestamp in ms
const record = null;      // Normalized flightRecorder
const sessions = null;     // Sessions Array
// const ev = null;
// const init = null;
const caretPos = 0;
const docText = "";
let state = {
  i: i,       // event index
  evCount: 0,    // event count for progress bar
  evTotal: 0,    // number of events in total
  playing: playing,
  speed: speed,
  budget: budget,
  lastFrameTs: lastFrameTs,
  playTs: playTs,
  record: record,
  sessions: sessions,
  currentSession: 0,    // index in session
  // ev: ev,
  // init: init,
  caretPos: caretPos,
  docText: docText
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
    state.record = flightRecord; 

    // // testing
    // state.ev = flightRecord.ev;
    // state.init = flightRecord.init;

    // Normalize data using loading.js
    processData(flightRecord);
    state.sessions = flightRecord.sessions;
}

export function startPlaying() {
    if (state.playing === true) return;

    state.playing = true;
    console.log("Started Playing");

    // // Finished playing, reset then play
    // if (state.i >= state.ev.length) {
    //     resetStatus()
    // }

    state.lastFrameTs = performance.now();
    requestAnimationFrame(runSessions);
}


export function stopPlaying() {
    if (state.playing === false) return;

    state.playing = false;
    console.log("Stopped Playing");
}

export function changeSpeed(newSpeed) {
    state.speed = newSpeed;
    speedLbl.textContent = `Speed: ${state.speed}x`;
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
      console.log("reset status");
      updateState(state);
      state.i = 0;
      state.playing = false;
      state.budget = 0;
      state.lastFrameTs = 0;
      state.playTs = 0;
      titleEl.textContent = `Title: ${state.record.m.title}`;
      sessionsEl.textContent = `Session: ${state.currentSession + 1} / ${state.sessions.length}`;
      eventsEl.textContent = `Events: 0 /${state.sessions[0].ev.length}`;
      state.docText = normalizeLines(state.sessions[0].init);   // Start with first session's init text
      durationEl.textContent = "00:00:00";
      progressEl.value = 0;
      calculateTotalEv();
      // Reset caret
      state.caretPos = state.docText.length;
      caretEl.hidden = false;
      renderCursor();
  }


function calculateTotalEv() {
  let total = 0;
  for (let i = 0; i < state.sessions.length; i++) {
    total += state.sessions[i].ev.length;
  }
  state.evTotal = total;
}


/**
 * Runs through sessions in order
 */
function runSessions() {
  if (state.playing === false) return;

  // Stop playing when finished all
  if (state.currentSession >= state.sessions.length) {
    resetStatus();
    return;
  }

  const ev = state.sessions[state.currentSession].ev;
  const init = state.sessions[state.currentSession].init;

  step(ev);

  // Forward to next session
  if (state.i >= ev.length) {
    state.currentSession++;
    state.i = 0;
    sessionsEl.textContent = `Session: ${state.currentSession + 1} / ${state.sessions.length}`;
    // progressEl.value = (state.currentSession + 1) / state.sessions.length * 100;
  }

  requestAnimationFrame(runSessions);
}


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


  eventsEl.textContent = `Events: ${state.i} /${ev.length}`;
  durationEl.textContent = convertTs()
  progressEl.value = state.evCount / state.evTotal * 100;


  if (state.i >= ev.length) {
    console.log("Replay Finished")
    state.playing = false;
    return;
  }

  requestAnimationFrame(step)   // Next frame
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
