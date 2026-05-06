import { MetricBox } from "@/components/MetricBox";

function formatTime(ms) {
  const date = new Date(ms);
  return date.toLocaleString();
}

function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} Hours ${minutes} Minutes`;
}

export default function DocStatsPanel({ docStats }) {
  const { timeline, edit, continuity } = docStats;
  const durationsGraph = timeline.durationsGraph;
  const timelineMetrics = timeline;
  delete timelineMetrics.durationsGraph;

  return (
    <div className="grid">
      <h2 className="font-semibold">Timeline</h2>
      <div className="grid grid-cols-2">
        <MetricBox label={"Session Count"} value={timeline.sessionCount} />
        <MetricBox
          label={"Document Start"}
          value={formatTime(timeline.docStartTs)}
        />
        <MetricBox
          label={"Document End"}
          value={formatTime(timeline.docEndTs)}
        />
        <MetricBox
          label={"Document Span"}
          value={formatDuration(timeline.docSpanTs)}
        />
        <MetricBox label={"Active Writing days"} value={timeline.activeDays} />
      </div>
    </div>
  );
}
