import { Fragment } from "react";
import { MetricBox } from "@/components/MetricBox";
import { BarChartCard } from "./BarChartCard";
import { CircleQuestionMark } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

function formatTime(ms) {
  const date = new Date(ms);
  return date.toLocaleString();
}

function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatDateLabel(dateText) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return dateText;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getDurationsData(durationsGraph) {
  const x = durationsGraph.x;
  const y = durationsGraph.y;

  let chartData = [];
  for (let i = 0; i < x.length; i++) {
    chartData.push({
      name: x[i],
      desktop: (y[i] / 1000).toFixed(1),
    });
  }
  return chartData;
}

function getInsertData(insCharsGraph) {
  const x = insCharsGraph.x;
  const y = insCharsGraph.y;

  let chartData = [];
  for (let i = 0; i < x.length; i++) {
    chartData.push({
      name: x[i],
      desktop: y[i],
    });
  }
  return chartData;
}

function StatsHeading({ text }) {
  return <h2 className="text-sm font-semibold text-foreground">{text}</h2>;
}

function ActiveDaysValue({ activeDays }) {
  const days = Array.from(activeDays || []);
  const previewDays = days.slice(0, 10);

  return (
    <div className="grid gap-2">
      <span>{days.length} days</span>
      <div className="flex flex-wrap gap-1">
        {previewDays.map((day) => (
          <span
            className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
            key={day}
          >
            {formatDateLabel(day)}
          </span>
        ))}
        {days.length > previewDays.length ? (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            +{days.length - previewDays.length}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function DaysHeatmapCard({ activeDays, heatmap }) {
  const days = Array.from(activeDays || []);
  const heatmapRows = Array.isArray(heatmap) ? heatmap : [];
  const maxValue = Math.max(0, ...heatmapRows.flat());
  const hourLabels = new Set([0, 6, 12, 18, 23]);

  return (
    <Card>
      <CardHeader className="gap-0.5">
        <CardTitle>Writing Heatmap</CardTitle>
        <CardDescription>
          Active writing minutes by day and hour.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {days.length === 0 ? (
          <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            No active writing days.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="grid min-w-max gap-1"
              style={{
                gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(3.25rem, 1fr))`,
              }}
            >
              <div />
              <div
                className="pb-2 text-center text-xs font-medium text-muted-foreground"
                style={{ gridColumn: `span ${days.length}` }}
              >
                Writing Days
              </div>
              <div className="text-xs font-medium text-muted-foreground mx-1">
                Hour
              </div>
              {days.map((day) => (
                <div
                  className="truncate pb-1 text-center text-[0.65rem] text-muted-foreground"
                  key={day}
                  title={day}
                >
                  {formatDateLabel(day)}
                </div>
              ))}
              {heatmapRows.map((row, hour) => (
                <Fragment key={hour}>
                  <div className="pr-5 text-right text-[0.65rem] leading-4 text-muted-foreground">
                    {hourLabels.has(hour) ? `${hour}:00` : ""}
                  </div>
                  {row.map((value, dayIndex) => {
                    const intensity = maxValue > 0 ? value / maxValue : 0;
                    const alpha = value > 0 ? 0.12 + intensity * 0.78 : 0.04;

                    return (
                      <div
                        aria-label={`${days[dayIndex]} ${hour}:00, ${value.toFixed(1)} active minutes`}
                        className="h-4 rounded-[3px] border border-border/50"
                        key={`${hour}-${days[dayIndex]}`}
                        style={{
                          backgroundColor: `rgba(37, 99, 235, ${alpha})`,
                        }}
                        title={`${days[dayIndex]} ${hour}:00 - ${value.toFixed(1)} min`}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DocStatsPanel({ docStats }) {
  if (!docStats) return null;

  const { timeline, edit, continuity } = docStats;
  const durationsGraph = timeline.durationsGraph;
  const insCharsGraph = edit.insCharsGraph;

  return (
    <div className="grid gap-5">
      <StatsHeading text="Timeline" />
      <div className="grid grid-cols-2 gap-2">
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
        <MetricBox
          className="col-span-2"
          label={"Active Writing Days"}
          value={<ActiveDaysValue activeDays={timeline.activeDays} />}
        />
      </div>
      <div className="grid gap-3 px-1">
        <BarChartCard
          title={"Session Durations"}
          desc={"How long each session took."}
          chartData={getDurationsData(durationsGraph)}
          xLabel="Session"
          yLabel="Duration (s)"
          chartClassName="h-64 aspect-auto"
        />
        <DaysHeatmapCard
          activeDays={timeline.activeDays}
          heatmap={edit.heatmap}
        />
      </div>
      <StatsHeading text="Edit" />
      <div className="grid grid-cols-2 gap-2">
        <MetricBox label={"Inserted Chars"} value={edit.insertedChars} />
        <MetricBox label={"Deleted Chars"} value={edit.deletedChars} />
        <MetricBox label={"Net Chars"} value={edit.netChars} />
        <MetricBox label={"Word Count"} value={edit.wordCount} />
        <div className="relative col-span-2">
          <MetricBox
            label="Paste Origin Ratio"
            value={(100 * edit.pasteOriginRatio).toFixed(1) + "%"}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label="Paste origin ratio explanation"
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                type="button"
              >
                <CircleQuestionMark className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-secondary font-light">
              Ratio of possibly pasted characters / original characters in the
              document.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="px-1">
        <BarChartCard
          title={"Session Inserted Characters"}
          desc={"Writing contribution per session."}
          chartData={getInsertData(insCharsGraph)}
          xLabel="Session"
          yLabel="Insertion (characters)"
          chartClassName="h-64 aspect-auto"
        />
      </div>
    </div>
  );
}
