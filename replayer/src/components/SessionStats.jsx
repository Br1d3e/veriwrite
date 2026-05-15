import StatsHeading from "./StatsHeading";
import { MetricBox } from "./MetricBox";

function formatTime(ms) {
  const date = new Date(ms);
  return date.toLocaleString();
}

function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  if (totalMinutes < 1) {
    return `${Math.floor(ms / 1000)}s`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

export default function SessionStatsPanel({ sessionStats, className = "" }) {
  if (!sessionStats) {
    return (
      <div
        className={`rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground ${className}`}
      >
        No active session stats available.
      </div>
    );
  }

  const overview = sessionStats.desc.overview;

  return (
    <div className={`grid gap-2 ${className}`}>
      <StatsHeading text="Overview" />
      <div className="grid grid-cols-2 gap-2">
        <MetricBox
          label={"Session Duration"}
          value={formatDuration(overview.durationMs)}
        />
        <MetricBox label={"Session Start"} value={formatTime(overview.start)} />
        <MetricBox label={"Session End"} value={formatTime(overview.end)} />
        <MetricBox label={"Insert Chars"} value={overview.insChars} />
        <MetricBox label={"Delete Chars"} value={overview.delChars} />
        <MetricBox label={"Net Chars"} value={overview.netChars} />
      </div>
    </div>
  );
}
