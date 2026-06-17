import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { ENABLE_LLM_REPORTS } from "@/lib/apiConfig";
import { getLLMReport, refreshLLMToken } from "@/lib/recordApi";
import { hashRecord } from "@/lib/utils";

function isTokenExpired(response) {
  return response?.status === 401 && response?.detail === "TOKEN_EXPIRED";
}

function isTokenInvalid(response) {
  const errs = [
    "INVALID_SIGNATURE",
    "INVALID_TOKEN",
    "DOCUMENT_NOT_FOUND",
    "VW_HASH_NOT_FOUND",
    "INVALID_VW_HASH",
  ];
  return response?.status === 401 && errs.includes(response?.detail);
}

function isReportError(response) {
  return response?.status && response.status !== "OK";
}

export async function handleReport(
  statsPayload,
  type,
  docId,
  record,
  online,
  setStatus,
  setError,
  setResult,
  onDone,
) {
  if (!ENABLE_LLM_REPORTS) {
    setError("AI report is currently unavailable.");
    setStatus("idle");
    return;
  }
  try {
    const vwHash = await hashRecord(record);
    const tokenKey = `${online ? "llm" : "offline_llm"}:${docId}:${vwHash}`;
    let token = getTokenById(tokenKey);
    if (!token) {
      token = await refreshLLMToken(docId, record, vwHash, online);
      storeTokenById(tokenKey, token);
    }
    setStatus("generating");
    setError("");
    let res = await getLLMReport(statsPayload, type, token);
    if (isTokenInvalid(res)) {
      setError("Server rejected LLM token. Please retry later.");
      setStatus("idle");
      return;
    }
    if (isTokenExpired(res)) {
      setError("LLM token expired. Refreshing a new one...");
      const newToken = await refreshLLMToken(docId, record, vwHash, online);
      storeTokenById(tokenKey, newToken);
      res = await getLLMReport(statsPayload, type, newToken);
    }
    if (isReportError(res)) {
      setError(res.detail || "Failed to generate report.");
      setStatus("idle");
      return;
    }
    setError("");
    setResult(res.result || res);
    onDone?.();
    setStatus("done");
  } catch (err) {
    setError(err.message || "Failed to generate report.");
    setStatus("idle");
  }
}

export function genReportSection(sectionTitle, section) {
  const title = section?.title ? section?.title : sectionTitle;
  const content = section?.analysis || section?.observation || "";

  return (
    <section className="grid gap-1">
      <h3 className="font-semibold mx-1">{title}</h3>
      <Separator />
      <p className="mx-1 font-serif leading-loose text-muted-foreground">
        {content}
      </p>
    </section>
  );
}

let docReports = {};
export function storeDocReportById(docId, report) {
  docReports[docId] = report;
}

export function getDocReportById(docId) {
  return docReports[docId];
}

let sessionReports = {};
export function storeSessionReportById(sid, report) {
  sessionReports[sid] = report;
}

export function getSessionReportById(sid) {
  return sessionReports[sid];
}

let tokens = {};
export function storeTokenById(docId, token) {
  tokens[docId] = token;
}

export function getTokenById(docId) {
  return tokens[docId];
}
