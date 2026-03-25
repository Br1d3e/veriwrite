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
const ev = null;
const init = null;
const caretPos = 0;
const docText = "";
let state = {
  i: i,
  playing: playing,
  speed: speed,
  budget: budget,
  lastFrameTs: lastFrameTs,
  playTs: playTs,
  record: record,
  sessions: sessions,
  ev: ev,
  init: init,
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
// let speedSlider = null;



// Interface with app.js
// Load record from app.js
export function loadRecord(flightRecord) {
    state.record = flightRecord; 
    // sessions = flightRecord.sessions;
    // for testing single-session
    state.ev = flightRecord.ev;    
    state.init = flightRecord.init;
}

export function startPlaying() {
    if (state.playing === true) return;

    state.playing = true;
    console.log("Started Playing");

    // Finished playing, reset then play
    if (state.i >= state.ev.length) {
        resetStatus()
    }

    state.lastFrameTs = performance.now();
    requestAnimationFrame(step);
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
  // speedSlider = DOM.speedSlider;
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
      eventsEl.textContent = `Events: 0 /${state.ev.length}`;
      state.docText = normalizeLines(state.init);
      durationEl.textContent = "00:00:00";
      progressEl.value = 0;
      // Reset caret
      state.caretPos = state.docText.length;
      caretEl.hidden = false;
      renderCursor();
  }


function step() {
  if (state.playing === false) return;
  
  const now = performance.now();
  const frameMs = now - state.lastFrameTs;
  state.budget += frameMs * state.speed;

  updateState(state);

  // Replay
  while (state.i < state.ev.length && state.budget >= state.ev[state.i][0]) {
    applyPatch(state.ev[state.i]);
    state.playTs += state.ev[state.i][0];
    state.budget -= state.ev[state.i][0];
    state.i++;    // forwards to next event
  }
  state.lastFrameTs = performance.now();


  eventsEl.textContent = `Events: ${state.i} /${state.ev.length}`;
  durationEl.textContent = convertTs()
  progressEl.value = state.i / state.ev.length * 100;


  if (state.i >= state.ev.length) {
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
