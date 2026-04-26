/**
 * @fileoverview Display ev block integrity stats using data from record server
 */


const integrityEl = document.getElementById("integrity-stats");
const integrityToggleEl = document.getElementById("integrity-stats-toggle");
const integrityBodyEl = document.getElementById("integrity-stats-body");
const blockIntegrityEl = document.getElementById("block-integrity-card");
const iconEl = document.getElementById("status-icon");
const descEl = document.getElementById("block-integrity-desc");
const infoEl = document.getElementById("block-integrity-info");
const bSeqEl = document.getElementById("b-seq");
const freshnessEl = document.getElementById("freshness");
const hashChainEl = document.getElementById("hash-chain");
const docStateEl = document.getElementById("doc-state");
const receivedTimeEl = document.getElementById("received-time");
const receiptEl = document.getElementById("receipt");

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
    iconEl.textContent = "";
    iconEl.style.backgroundColor = "";
    iconEl.style.boxShadow = "";
    infoEl.textContent = "";
    descEl.textContent = "";
    freshnessEl.textContent = "";
    hashChainEl.textContent = "";
    docStateEl.textContent = "";
    receivedTimeEl.textContent = "";
    receiptEl.textContent = "";
    bSeqEl.textContent = "";
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

    if (status.includes("INVALID_HASH") || status.includes("INVALID_Q")) {
        color = "#c62828";
        bgColor = "#f8ced2";
        // icon = "!";
        state = "Invalid";
        message = "Hash chain or block sequence verification failed.";
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

    iconEl.style.backgroundColor = color;
    iconEl.style.boxShadow = `0 0 0 3px ${bgColor}`;
    infoEl.textContent = `Block #${block.q ?? "?"}: ${state}`;
    infoEl.style.color = color;
    infoEl.style.backgroundColor = bgColor;
    descEl.textContent = message;

    bSeqEl.textContent = `Block #${block.q ?? "?"}`
    freshnessEl.textContent = status.includes("INVALID_FRESHNESS") ? "Delayed" : "Fresh";
    freshnessEl.style.color = block.freshness_status === "FRESH" ? "#0bc847" : "#ffa200";
    hashChainEl.textContent = block.valid_h === false || status.includes("INVALID_HASH") ? "Invalid" : "Valid";
    hashChainEl.style.color = block.valid_h === false ? "#c62828" : "#0bc847";
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

}

function setStatsCollapsed(bodyEl, toggleEl, collapsed) {
  bodyEl.hidden = collapsed;
  toggleEl.textContent = collapsed ? "+" : "-";
  toggleEl.setAttribute("aria-expanded", String(!collapsed));
}


integrityToggleEl.addEventListener("click", () => {
    setStatsCollapsed(integrityBodyEl, integrityToggleEl, !integrityBodyEl.hidden)
})