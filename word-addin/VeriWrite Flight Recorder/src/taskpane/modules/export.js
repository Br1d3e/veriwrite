import { wrapVwContainer } from "./vwContainer.js";

export function downloadJSON(flightRecord) {
  if (!flightRecord) return;

  const blob = new Blob([JSON.stringify(flightRecord, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  const safeTitle = (flightRecord.m.title || "untitled").replace(/[^\w-]+/g, "_");
  link.href = URL.createObjectURL(blob);
  link.download = `${safeTitle}.flightrecord.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function downloadVwContainer(flightRecord) {
  if (!flightRecord) return;
  if (!Array.isArray(flightRecord.sessions)) {
    throw new Error("Cannot export: flight record sessions are not loaded.");
  }

  const bytes = await wrapVwContainer(flightRecord);
  const safeTitle = (flightRecord?.m?.title || "untitled").replace(/[^\w-]+/g, "_");
  downloadBytes(bytes, `${safeTitle}.vw`);
}
