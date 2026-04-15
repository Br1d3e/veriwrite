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
    const ins = eventArr[3];
    
    const prev = state.docText;
    state.docText = prev.slice(0, pos) + ins + prev.slice(pos + delLen);

    // Caret/cursor
    if (ins === "" && delLen > 0) {    // Delete but no inserts
      state.caretPos = pos;   
    } else {
      state.caretPos = pos + ins.length;
    }

    renderCursor();
}

export function renderCursor() {
    caretEl.hidden = false;
    beforeEl.textContent = state.docText.slice(0, state.caretPos);
    afterEl.textContent = state.docText.slice(state.caretPos);
    caretEl.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center"
    })
}


export function restoreCursor(screenEl) {
    screenEl.replaceChildren(beforeEl, caretEl, afterEl);
    renderCursor();
}


// test
export function seekCaretTo(pos) {
    state.caretPos = pos;
    renderCursor();
}
