import { useState } from "react";
import { Separator } from "@/components/ui/separator";

export async function handleReport(
  statsPayload,
  path,
  setStatus,
  setError,
  setResult,
  onDone,
) {
  try {
    setStatus("generating");
    setError("");
    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(statsPayload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.detail || `HTTP ${res.status}`);
    }
    setResult(data);
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
