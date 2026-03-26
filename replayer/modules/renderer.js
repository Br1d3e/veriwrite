// Renders session texts to screen
// Input: docText, caretPos, 
// Updates screenEL DOM


// Necessary states
let state = null;

// Cursors
let caretEl = null;
let beforeEl = null;
let afterEl = null;


// Interface with app.js for DOM objects
export function cursorDOM(DOM) {
    caretEl = DOM.caretEl;
    beforeEl = DOM.beforeEl;
    afterEl = DOM.afterEl;
}

// Interface with replayer.js for state machines
export function updateState(newState) {
    state = newState;
}


/**
 * Processes each change to the document. Display them on the screen.
 * @param {Array | null} eventArr - an array of each event in [dt, pos, delLen, ins] 
 * @param {String} docText
 * @param {Number} caretPos
 */
export function applyPatch(eventArr) {
    const pos = eventArr[1];
    const delLen = eventArr[2]
    const ins = normalizeLines(eventArr[3]);
    
    const prev = state.docText;
    state.docText = prev.slice(0, pos) + ins + prev.slice(pos + delLen);

    // Caret/cursor
    if (ins === "" && delLen > 0) {    // Delete but no inserts
      state.caretPos = pos;   
    } else {
      state.caretPos = pos + ins.length;
    }

    // docText = text.slice(0, caretPos) + caretEl.textContent + text.slice(caretPos);  // Animate cursor
    // screenEl.textContent = docText;
    renderCursor();
}

export function renderCursor() {
    caretEl.hidden = false;
    beforeEl.textContent = state.docText.slice(0, state.caretPos);
    afterEl.textContent = state.docText.slice(state.caretPos);
}

// Escape Microsoft Word Chars
export function normalizeLines(s) {
    return String(s)
    .replace(/\r\n/g, "\n")  
    .replace(/\r/g, '\n')   // Hard Break
    .replace(/\u000b/g, '\n')   // Soft Break

    // .replace(/&/g, '&amp;')
    // .replace(/</g, '&lt;')
    // .replace(/>/g, '&gt;')
    // .replace(/"/g, '&quot;')
    // .replace(/'/g, '&#39;')
}