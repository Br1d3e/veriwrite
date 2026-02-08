// HTML Elements
const fileEl = document.getElementById("file");
const screenEl = document.getElementById("screen");
const inputErrTxt = document.getElementById("invalidInput");
// Meta
const titleEl = document.getElementById("title");
const eventsEl = document.getElementById("events");
const durationEl = document.getElementById("duration");
const progressEl = document.getElementById("replayProg");
// Buttons
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const speedLbl = document.getElementById("speedLbl");
const speedSlider = document.getElementById("speedSlider");


// Global Variables & State Machine
let i = 0;    // Event index
let playing = false;
let speed = 1;
let budget = 0;
let lastFrameTs = 0;
let playTs = 0;     // Playback timestamp in ms
let ev = null;
let init = null;
let record = null;


// Do not display metadata before file is uploaded
function initializeUpload() {
    inputErrTxt.hidden = true;
    titleEl.textContent = "";
    eventsEl.textContent = "";
    durationEl.textContent = "";
    screenEl.textContent = "";
    progressEl.value = 0;
}


// Upload file & Data Check 
fileEl.addEventListener("change", async () => {
  initializeUpload();

  const f = fileEl.files?.[0];
  if (!f) return;
  const fileText = await f.text();
  record = JSON.parse(fileText);
  init = record?.init ?? "";
  ev = record?.ev ?? [];

  // Check Data Structure
  if ((record?.v ?? 0) !== 1 || 
  typeof init !== "string" || 
  !Array.isArray(ev) ||
  ev.some(e => 
    !Array.isArray(e) ||
    typeof e[0] !== "number" || 
    typeof e[1] !== "number" || 
    typeof e[2] !== "number" || 
    typeof e[3] !== "string"
  )) {
      // console.log("hide")
      inputErrTxt.hidden = false;
      setTimeout(() => {
          inputErrTxt.hidden = true;
      }, 3000);
      return;
  }
  // Update HTML
  resetStatus();
});

function resetStatus() {
      console.log("reset status");
      i = 0;
      playing = false;
      budget = 0;
      lastFrameTs = 0;
      playTs = 0;
      titleEl.textContent = `Title: ${record.m.title}`;
      eventsEl.textContent = `Events: 0 /${ev.length}`;
      screenEl.textContent = normalizeLines(init);
      durationEl.textContent = "00:00:00";
      progressEl.value = 0;
  }

function normalizeLines(s) {
    return String(s).replace(/\r\n/g, "\n").replace(/\r/g, "\n")
}

function step() {
  if (playing === false) return;
  
  const now = Date.now();
  const frameMs = now - lastFrameTs;
  budget += frameMs * speed;
  // Replay
  while (i < ev.length && budget >= ev[i][0]) {
    applyPatch(ev[i]);
    playTs += ev[i][0];
    budget -= ev[i][0];
    i++;    // forwards to next event
  }
  lastFrameTs = Date.now();


  eventsEl.textContent = `Events: ${i} /${ev.length}`;
  convertTs()
  progressEl.value = i / ev.length * 100;

  if (i >= ev.length) {
    console.log("Replay Finished")
    playing = false;
    return;
  }

  requestAnimationFrame(step)   // Next frame
}

/**
 * Processes each change to the document. Display them on the screen.
 * @param {Array | null} eventArr - an array of each event in [dt, pos, delLen, ins] 
 */
function applyPatch(eventArr) {
    const pos = eventArr[1];
    const delLen = eventArr[2]
    const ins = normalizeLines(eventArr[3]);
    
    const prev = screenEl.textContent;
    screenEl.textContent = prev.slice(0, pos) + ins + prev.slice(pos + delLen);
}

function convertTs() {
    const totalSec = playTs / 1000;
    const tsHr = Math.floor(totalSec / 3600);
    const tsMin = Math.floor((totalSec % 3600) / 60);
    const tsSec = Math.floor(totalSec % 60);
    const textHr = tsHr.toString().padStart(2, '0');
    const textMin = tsMin.toString().padStart(2, '0');
    const textSec = tsSec.toString().padStart(2, '0');
    durationEl.textContent = `${textHr}:${textMin}:${textSec}`;
}


function startPlaying() {
    if (playing === true) return;

    playing = true;
    console.log("Started Playing");

    // Finished playing, reset then play
    if (i >= ev.length) {
        resetStatus()
    }

    lastFrameTs = Date.now();
    requestAnimationFrame(step);
}


function stopPlaying() {
    if (playing === false) return;

    playing = false;
    console.log("Stopped Playing");
}


function changeSpeed() {
    speed = Number(speedSlider.value);
    speedLbl.textContent = `Speed: ${speed}x`
}


playBtn.addEventListener("click", startPlaying);
pauseBtn.addEventListener("click", stopPlaying);
resetBtn.addEventListener("click", resetStatus);
speedSlider.addEventListener("change", changeSpeed);