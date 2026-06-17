import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import canonicalize from "canonicalize";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatTime(ms) {
  const date = new Date(ms);
  return date.toLocaleString();
}

export function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  if (totalMinutes < 1) {
    return `${Math.floor(ms / 1000)}s`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

export function wordCount(text) {
  if (typeof text != "string") return;
  return text.split(" ").length;
}

export function formatDateLabel(dateText) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return dateText;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export async function hashRecord(record) {
  const record_str = canonicalize(record);
  const record_bytes = new TextEncoder().encode(record_str);
  const digest = await crypto.subtle.digest("SHA-256", record_bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
