/**
 * @fileoverview Display ev block integrity stats using data from record server
 */

import { seekToBlock } from "../../player.js";

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
const blockStripEl = document.getElementById("block-status-strip");


export function renderIntegrityPanel(session, block) {
    integrityEl.hidden = false;
    setStatsCollapsed(integrityBodyEl, integrityToggleEl, false);

    if (block) {
        genBlockIntegrityUI(block);
    }
    if (session) {
        genSessionIntegrityUI(session);
        renderBlockStrip(session.b || session.blocks);
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
    blockStripEl.hidden = true;
    blockStripEl.replaceChildren();
    setStatsCollapsed(integrityBodyEl, integrityToggleEl, true);
}

function getBlockStatusMsg(status) {
    let color = "#666";
    let bgColor = "#eee";
    let state = "Unverified";
    let message = "Server integrity status is unavailable.";
    let freshness = "Fresh";
    let hashChain = "Valid";
    let hash = "Valid";
    let docState = "Valid";
    let receipt = "Signed";

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
        hashChain = "Invalid";
    } else if (status.includes("INVALID_STATE")) {
        color = "#c62828";
        bgColor = "#f8ced2";
        state = "Invalid";
        message = "Document state verification failed.";
        docState = "Invalid";
    } else if (status.includes("INVALID_COMMITMENT")) {
        color = "#c62828";
        bgColor = "#f8ced2";
        state = "Invalid";
        message = "Block Commitment is not verified by server.";
        hash = "Invalid";
    } else if (status.includes("INVALID_FRESHNESS")) {
        color = "#dfb601";
        bgColor = "#fef1c4";
        state = "Delayed";
        message = "Server did not receive this writing period in the fresh window.";
        freshness = "Delayed";
    } else if (status.includes("VALID")) {
        color = "#0bc847";
        bgColor = "#b6f4aa";
        state = "Verified";
        message = "Server authenticated this writing period.";
    }
    return { color, bgColor, state, message, freshness, hashChain, hash, docState, receipt}; 
}

function genBlockIntegrityUI(block) {
    if (!block || !block.status) {
        return;
    }

    blockIntegrityEl.hidden = false;

    const status = Array.isArray(block.status) ? block.status : [block.status];

    const { color, bgColor, state, message, freshness, hashChain, hash, docState, receipt} = getBlockStatusMsg(status);

    blockIconEl.style.backgroundColor = color;
    blockIconEl.style.boxShadow = `0 0 0 3px ${bgColor}`;
    blockInfoEl.textContent = `${state}`;
    blockInfoEl.style.color = color;
    blockInfoEl.style.backgroundColor = bgColor;
    blockDescEl.textContent = message;

    bSeqEl.textContent = `#${block.q ?? "?"}`
    freshnessEl.textContent = freshness;
    freshnessEl.style.color = block.freshness_status === "FRESH" ? "#0bc847" : "#ffa200";
    hashChainEl.textContent = hashChain;
    hashChainEl.style.color = block.valid_h === false ? "#c62828" : "#0bc847";
    hashEl.textContent = hash;
    hashEl.style.color = block.valid_ch === false ? "#c62828" : "#0bc847";
    docStateEl.textContent = docState;
    docStateEl.style.color = block.valid_dsh === false ? "#c62828" : "#0bc847";
    receivedTimeEl.textContent = block.received_server_ts ? new Date(block.received_server_ts).toLocaleString() : "Unknown";
    receiptEl.textContent = receipt;
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

function renderBlockStrip(blocks) {
    if (!Array.isArray(blocks) || blocks.length === 0) {
        blockStripEl.hidden = true;
        blockStripEl.replaceChildren();
        return;
    }

    blockStripEl.hidden = false;
    blockStripEl.replaceChildren();

    const blockPercent = 100 / blocks.length;
    for (let block of blocks) {
        const status = block.status;
        const color = getBlockStatusMsg(status).color;
        const freshness = getBlockStatusMsg(status).freshness;
        const hashChain = getBlockStatusMsg(status).hashChain;
        const bar = document.createElement("div");
        bar.className = "block-strip-bar";
        bar.title = `Block #${block.q} · ${freshness} · ${hashChain}`;
        bar.dataset.blockSeq = String(block.q);
        bar.style.backgroundColor = color;
        bar.style.width = `${blockPercent}%`;
        blockStripEl.appendChild(bar);
    }
}

function setStatsCollapsed(bodyEl, toggleEl, collapsed) {
  bodyEl.hidden = collapsed;
  toggleEl.textContent = collapsed ? "+" : "-";
  toggleEl.setAttribute("aria-expanded", String(!collapsed));
}

integrityToggleEl.addEventListener("click", () => {
    setStatsCollapsed(integrityBodyEl, integrityToggleEl, !integrityBodyEl.hidden);
})

blockStripEl.addEventListener("click", (e) => {
    const bar = e.target.closest(".block-strip-bar");
    if (!bar || !blockStripEl.contains(bar)) return;

    const targetBlock = Number(bar.dataset.blockSeq);
    if (Number.isInteger(targetBlock)) seekToBlock(targetBlock);
})
