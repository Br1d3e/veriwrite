
import { loadRecord, startPlaying, stopPlaying, resetStatus, changeSpeed, updateDOM } from "./modules/player.js"
import { cursorDOM } from "./modules/renderer.js";


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
        speedSlider: speedSlider
    }



// Do not display metadata before file is uploaded
function initializeUpload() {
    inputErrTxt.hidden = true;
    titleEl.textContent = "";
    eventsEl.textContent = "";
    durationEl.textContent = "";
    beforeEl.textContent = "";
    afterEl.textContent = "";
    caretEl.hidden = true;
    // docText = "";
    // caretPos = 0;
    progressEl.value = 0;
}



updateDOM(DOM);

// Upload file & Data Check 
fileEl.addEventListener("change", async () => {
  initializeUpload();
  updateDOM(DOM);
  cursorDOM(DOM);

  const f = fileEl.files?.[0];
  if (!f) return;
  const fileText = await f.text();
  const record = JSON.parse(fileText);
  // Pass record to player.js
  loadRecord(record);

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
  // Update HTML
  resetStatus();
});

// function resetStatus() {
//       console.log("reset status");
//       i = 0;
//       playing = false;
//       budget = 0;
//       lastFrameTs = 0;
//       playTs = 0;
//       titleEl.textContent = `Title: ${record.m.title}`;
//       eventsEl.textContent = `Events: 0 /${ev.length}`;
//       docText = normalizeLines(init);
//       durationEl.textContent = "00:00:00";
//       progressEl.value = 0;
//       // Reset caret
//       caretPos = docText.length;
//       caretEl.hidden = false;
//       renderCursor();
//   }


// function step() {
//   if (playing === false) return;
  
//   const now = performance.now();
//   const frameMs = now - lastFrameTs;
//   budget += frameMs * speed;
//   // Replay
//   while (i < ev.length && budget >= ev[i][0]) {
//     applyPatch(ev[i]);
//     playTs += ev[i][0];
//     budget -= ev[i][0];
//     i++;    // forwards to next event
//   }
//   lastFrameTs = performance.now();


//   eventsEl.textContent = `Events: ${i} /${ev.length}`;
//   convertTs()
//   progressEl.value = i / ev.length * 100;

//   if (i >= ev.length) {
//     console.log("Replay Finished")
//     playing = false;
//     return;
//   }

//   // console.log(caretPos);
//   // console.log(docText.length);
//   // console.log(docText.slice(caretPos-5, caretPos+5))

//   requestAnimationFrame(step)   // Next frame
// }


// function convertTs() {
//     const totalSec = playTs / 1000;
//     const tsHr = Math.floor(totalSec / 3600);
//     const tsMin = Math.floor((totalSec % 3600) / 60);
//     const tsSec = Math.floor(totalSec % 60);
//     const textHr = tsHr.toString().padStart(2, '0');
//     const textMin = tsMin.toString().padStart(2, '0');
//     const textSec = tsSec.toString().padStart(2, '0');
//     durationEl.textContent = `${textHr}:${textMin}:${textSec}`;
// }


// function startPlaying() {
//     if (playing === true) return;

//     playing = true;
//     console.log("Started Playing");

//     // Finished playing, reset then play
//     if (i >= ev.length) {
//         resetStatus()
//     }

//     lastFrameTs = performance.now();
//     requestAnimationFrame(step);
// }


// function stopPlaying() {
//     if (playing === false) return;

//     playing = false;
//     console.log("Stopped Playing");
// }


// function changeSpeed() {
//     speed = Number(speedSlider.value);
//     speedLbl.textContent = `Speed: ${speed}x`
// }


playBtn.addEventListener("click", startPlaying);
pauseBtn.addEventListener("click", stopPlaying);
resetBtn.addEventListener("click", resetStatus);
speedSlider.addEventListener("change", () => {
    changeSpeed(Number(speedSlider.value))
    });