/**
 * @fileoverview Display ev block integrity stats using data from record server
 */


const integrityEl = document.getElementById("integrity-stats");
const integrityToggleEl = document.getElementById("integrity-stats-toggle");
const integrityBodyEl = document.getElementById("integrity-stats-body");
const blockIntegrityEl = document.getElementById("block-integrity-section");
const blockIconEl = document.getElementById("block-status-icon");
const blockDescEl = document.getElementById("block-integrity-desc");
const blockInfoEl = document.getElementById("block-integrity-info");
const bSeqEl = document.getElementById("b-seq");
const freshnessEl = document.getElementById("freshness");
const hashChainEl = document.getElementById("hash-chain");
const hashEl = document.getElementById("hash");
const docStateEl = document.getElementById("doc-state");
const receivedTimeEl = document.getElementById("received-time");
const receiptEl = document.getElementById("receipt");
const sessionIntegrityEl = document.getElementById("session-integrity-section");
const sessionIconEl = document.getElementById("session-status-icon");
const sessionDescEl = document.getElementById("session-integrity-desc");
const sessionInfoEl = document.getElementById("session-integrity-info");
const sidEl = document.getElementById("sid");
const bCountEl = document.getElementById("b-count");
const continuityEl = document.getElementById("s-continuity");
const closedTsEl = document.getElementById("closed-ts");
const finalReceiptEl = document.getElementById("final-receipt");


export function renderIntegrityPanel(session, block) {
    integrityEl.hidden = false;
    setStatsCollapsed(integrityBodyEl, integrityToggleEl, false);

    if (block) {
        genBlockIntegrityUI(block);
    }
    if (session) {
        genSessionIntegrityUI(session);
    }
} 

export function resetIntegrityPanel() {
    integrityEl.hidden = true;
    blockIntegrityEl.hidden = true;
    blockIconEl.style.backgroundColor = "";
    blockIconEl.style.boxShadow = "";
    blockInfoEl.textContent = "";
    blockDescEl.textContent = "";
    freshnessEl.textContent = "";
    hashChainEl.textContent = "";
    hashEl.textContent = "";
    docStateEl.textContent = "";
    receivedTimeEl.textContent = "";
    receiptEl.textContent = "";
    bSeqEl.textContent = "";
    sessionIntegrityEl.hidden = true;
    sessionInfoEl.textContent = "";
    sessionDescEl.textContent = "";
    sidEl.textContent = "";
    bCountEl.textContent = "";
    continuityEl.textContent = "";
    closedTsEl.textContent = "";
    finalReceiptEl.textContent = "";
    setStatsCollapsed(integrityBodyEl, integrityToggleEl, true);
}

function genBlockIntegrityUI(block) {
    if (!block || !block.status) {
        return;
    }

    blockIntegrityEl.hidden = false;

    const status = Array.isArray(block.status) ? block.status : [block.status];

    let color = "#666";
    let bgColor = "#eee";
    let state = "Unverified";
    let message = "Server integrity status is unavailable.";

    if (status.includes("INVALID_Q")) {
        color = "#c62828";
        bgColor = "#f8ced2";
        state = "Invalid";
        message = "Block sequence verification failed.";
    } else if (status.includes("INVALID_HASH_CHAIN")) {
        color = "#c62828";
        bgColor = "#f8ced2";
        state = "Invalid";
        message = "Hash chain verification failed.";
    } else if (status.includes("INVALID_STATE")) {
        color = "#c62828";
        bgColor = "#f8ced2";
        state = "Invalid";
        message = "Document state verification failed.";
    } else if (status.includes("INVALID_COMMITMENT")) {
        color = "#c62828";
        bgColor = "#f8ced2";
        state = "Invalid";
        message = "Block Commitment is not verified by server.";
    } else if (status.includes("INVALID_FRESHNESS")) {
        color = "#dfb601";
        bgColor = "#fef1c4";
        state = "Delayed";
        message = "Server did not receive this writing period in the fresh window.";
    } else if (status.includes("VALID")) {
        color = "#0bc847";
        bgColor = "#b6f4aa";
        state = "Verified";
        message = "Server authenticated this writing period.";
    }
    blockIconEl.style.backgroundColor = color;
    blockIconEl.style.boxShadow = `0 0 0 3px ${bgColor}`;
    blockInfoEl.textContent = `${state}`;
    blockInfoEl.style.color = color;
    blockInfoEl.style.backgroundColor = bgColor;
    blockDescEl.textContent = message;

    bSeqEl.textContent = `#${block.q ?? "?"}`
    freshnessEl.textContent = status.includes("INVALID_FRESHNESS") ? "Delayed" : "Fresh";
    freshnessEl.style.color = block.freshness_status === "FRESH" ? "#0bc847" : "#ffa200";
    hashChainEl.textContent = block.valid_h === false || status.includes("INVALID_HASH") ? "Invalid" : "Valid";
    hashChainEl.style.color = block.valid_h === false ? "#c62828" : "#0bc847";
    hashEl.textContent = block.valid_ch === false ? "Invalid" : "Valid";
    hashEl.style.color = block.valid_ch === false ? "#c62828" : "#0bc847";
    docStateEl.textContent = block.valid_dsh === false ? "Invalid" : "Valid";
    docStateEl.style.color = block.valid_dsh === false ? "#c62828" : "#0bc847";
    receivedTimeEl.textContent = block.received_server_ts ? new Date(block.received_server_ts).toLocaleString() : "Unknown";
    receiptEl.textContent = block.receipt ? "Signed" : "Missing";
    receiptEl.style.color = block.receipt ? "#03a2f1" : "#c62828";
}

function genSessionIntegrityUI(session) {
    if (!session || !session.status) {
        return;
    }

    sessionIntegrityEl.hidden = false;

    let color = "#666";
    let bgColor = "#eee";
    let state = "Unverified";
    let message = "Server integrity status is unavailable."; 

    if (session.status === true) {
        color = "#0bc847";
        bgColor = "#b6f4aa";
        state = "Verified";
        message = "Server authenticated this session.";
    } else {
        color = "#c62828";
        bgColor = "#f8ced2";
        state = "Invalid";
        message = "This session is not authorized by the server.";
    }
    sessionIconEl.style.backgroundColor = color;
    sessionIconEl.style.boxShadow = `0 0 0 3px ${bgColor}`;
    sessionInfoEl.textContent = state;
    sessionInfoEl.style.color = color;
    sessionInfoEl.style.backgroundColor = bgColor;
    sessionDescEl.textContent = message;

    sidEl.textContent = `${(session.sid.length <= 30 ? session.sid : session.sid.slice(0, 30) + "...") ?? "?"}`;
    bCountEl.textContent = `${session.bc}`;
    continuityEl.textContent = session.cs ? "Valid" : "Invalid";
    continuityEl.style.color = session.cs ? "#0bc847" : "#c62828";
    closedTsEl.textContent = session.ct ? new Date(session.ct).toLocaleString() : "Unknown";
    finalReceiptEl.textContent = session.fr ? "Signed" : "Missing";
    finalReceiptEl.style.color = session.fr ? "#03a2f1" : "#c62828";
}

function setStatsCollapsed(bodyEl, toggleEl, collapsed) {
  bodyEl.hidden = collapsed;
  toggleEl.textContent = collapsed ? "+" : "-";
  toggleEl.setAttribute("aria-expanded", String(!collapsed));
}


integrityToggleEl.addEventListener("click", () => {
    setStatsCollapsed(integrityBodyEl, integrityToggleEl, !integrityBodyEl.hidden)
})