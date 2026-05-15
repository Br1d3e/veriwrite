import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
