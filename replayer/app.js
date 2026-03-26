
import { loadRecord, startPlaying, stopPlaying, resetStatus, changeSpeed, updateDOM } from "./modules/player.js"
import { cursorDOM } from "./modules/renderer.js";
import { checkStruct } from "./modules/loader.js";


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
        progressEl: progressEl,
        speedLbl: speedLbl,
        titleEl: titleEl, 
        screenEl: screenEl,
        speedLbl: speedLbl,
        speedSlider: speedSlider,
        sessionsEl: sessionsEl
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


updateDOM(DOM);

// Upload file & Data Check 
fileEl.addEventListener("change", async () => {
  const f = fileEl.files?.[0];
  if (!f) return;
  const fileText = await f.text();
  const record = JSON.parse(fileText);

  initializeUpload();

  // Check Data Structure
//   if ((record?.v ?? 0) !== 1 || 
//   typeof init !== "string" || 
//   !Array.isArray(ev) ||
//   ev.some(e => 
//     !Array.isArray(e) ||
//     typeof e[0] !== "number" || 
//     typeof e[1] !== "number" || 
//     typeof e[2] !== "number" || 
//     typeof e[3] !== "string"
//   )) {
//       // console.log("hide")
//       inputErrTxt.hidden = false;
//       setTimeout(() => {
//           inputErrTxt.hidden = true;
//       }, 3000);
//       return;
//   }

  if (!checkStruct(record)) {
    inputErrTxt.hidden = false;
    setTimeout(() => {
        inputErrTxt.hidden = true;
    }, 3000);
    return;
  }

  enableButtons();

  updateDOM(DOM);
  cursorDOM(DOM);

  // Pass record to player.js
  loadRecord(record);

  // Update HTML
  resetStatus();
});


// Event Listeners
playBtn.addEventListener("click", startPlaying);
pauseBtn.addEventListener("click", stopPlaying);
resetBtn.addEventListener("click", resetStatus);
speedSlider.addEventListener("change", () => {
  changeSpeed(Number(speedSlider.value))
  });

