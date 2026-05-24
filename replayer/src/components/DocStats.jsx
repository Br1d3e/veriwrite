import { Fragment, memo } from "react";
import { MetricBox } from "@/components/MetricBox";
import BarChartCard from "./BarChartCard";
import MetricTooltip from "./MetricTooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import StatsHeading from "./StatsHeading";
import { formatDuration, formatTime, formatDateLabel } from "@/lib/utils";
import DocReport from "./DocReport";

function getDurationsData(durationsGraph) {
  const x = durationsGraph.x;
  const y = durationsGraph.y;

  let chartData = [];
  for (let i = 0; i < x.length; i++) {
    chartData.push({
      name: x[i],
      desktop: (y[i] / 1000 / 60).toFixed(1),
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

function DaysHeatmapCard({ activeDays, heatmap, className = "" }) {
  const days = Array.from(activeDays || []);
  const heatmapRows = Array.isArray(heatmap) ? heatmap : [];
  const maxValue = Math.max(0, ...heatmapRows.flat());
  const hourLabels = new Set([0, 6, 12, 18, 23]);

  return (
    <Card className={className}>
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

function getPatchHighlightRange(textPatch, textLength) {
  for (let patch of textPatch) {
    let pos = patch.start2;
    let start = null;
    let end = pos;

    for (let [op, text] of patch.diffs) {
      if (op === 0) {
        pos += text.length;
        continue;
      }

      if (start === null) start = pos;

      if (op === 1) {
        pos += text.length;
        end = pos;
      } else {
        end = Math.max(end, pos);
      }
    }

    if (start !== null) {
      start = Math.max(0, Math.min(start, textLength));
      end = Math.max(start, Math.min(end, textLength));
      return { start, end };
    }
  }
  return { start: 0, end: 0 };
}

function getPatchLengths(textPatch) {
  let del = 0;
  let ins = 0;
  for (let patch of textPatch) {
    for (let diff of patch.diffs) {
      const [op, text] = diff;

      if (op === 1) {
        ins += text.length;
      }

      if (op === -1) {
        del += text.length;
      }
    }
  }

  return { del, ins };
}

function getPatchHighlightParts(textPatch, textLength, color) {
  const parts = [];

  for (let patchIndex = 0; patchIndex < textPatch.length; patchIndex++) {
    const patch = textPatch[patchIndex];
    let pos = patch.start2;

    for (let diffIndex = 0; diffIndex < patch.diffs.length; diffIndex++) {
      const [op, text] = patch.diffs[diffIndex];

      if (op === 0) {
        pos += text.length;
        continue;
      }

      const safePos = Math.max(0, Math.min(pos, textLength));

      if (op === 1) {
        const end = Math.max(
          safePos,
          Math.min(safePos + text.length, textLength),
        );
        parts.push({
          color,
          end,
          key: `${patchIndex}-${diffIndex}`,
          start: safePos,
          type: "insert",
        });
        pos += text.length;
        continue;
      }

      parts.push({
        color: "red",
        key: `${patchIndex}-${diffIndex}`,
        pos: safePos,
        text,
        type: "delete",
      });
    }
  }

  return parts;
}

function GapCards({ gaps, sessions, actions, onGapHighlight, className = "" }) {
  return (
    <div className="grid p-1 gap-1">
      <h2 className="font-medium text-muted-foreground pb-2">
        {gaps.length} gaps detected between writing sessions.
      </h2>
      {gaps.map((gap) => {
        const prevSession = gap.prevSession;
        const nextSession = gap.nextSession;
        const gapDuration = formatDuration(gap.gapMs);
        const textPatch = gap.textPatch;
        const charsDiff = gap.charsDiff;
        const majorDiff = gap.majorDiff;

        const { del: delLen, ins: insLen } = getPatchLengths(textPatch);
        let diffDisplay;
        if (delLen > 0 && insLen > 0) {
          diffDisplay = (
            <div className="gap-3">
              <span className="text-green-500">+{insLen}</span>
              <span className="text-muted-foreground"> {"/"}</span>
              <span className="text-red-500">-{delLen}</span>
            </div>
          );
        } else if (delLen > 0) {
          diffDisplay = <span className="text-red-500">-{delLen}</span>;
        } else if (insLen > 0) {
          diffDisplay = <span className="text-green-500">+{insLen}</span>;
        }

        const maxChars = 240;
        let charCount = 0;
        return (
          <Card
            className={`cursor-pointer ring-0 hover:bg-accent gap-1${className}`}
            key={prevSession}
            onClick={() => {
              const targetSessionIndex = nextSession - 1;
              const targetText = sessions?.[targetSessionIndex]?.init || "";
              const { start, end } = getPatchHighlightRange(
                gap.textPatch,
                targetText.length,
              );
              const color = majorDiff ? "red" : "green";

              actions.seekToSession(targetSessionIndex);
              onGapHighlight?.({
                parts: getPatchHighlightParts(
                  gap.textPatch,
                  targetText.length,
                  color,
                ),
                start,
                end,
                color,
              });
            }}
          >
            <CardHeader className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_60px]">
              <span className="text-muted-foreground">
                {"["}Session {prevSession} {"->"} {nextSession}
                {"]"}
              </span>
              <span className="font-medium">{gapDuration} gap</span>
              <span className="font-medium">{diffDisplay}</span>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}

function DocStatsPanel({
  docStats,
  sessions,
  actions,
  docId,
  onGapHighlight,
}) {
  if (!docStats) return null;

  const { timeline, edit, continuity } = docStats;
  const durationsGraph = timeline.durationsGraph;
  const insCharsGraph = edit.insCharsGraph;

  return (
    <div className="grid gap-2">
      <DocReport docStats={docStats} docId={docId} />
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
      <div className="grid gap-3 px-1 my-2">
        <BarChartCard
          title={"Session Durations"}
          desc={"How long each session took."}
          chartData={getDurationsData(durationsGraph)}
          xLabel="Session"
          yLabel="Duration (min) "
          chartClassName="h-64 aspect-auto"
        />
        <DaysHeatmapCard
          activeDays={timeline.activeDays}
          heatmap={edit.heatmap}
          className="my-2"
        />
      </div>

      <br />
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
          <MetricTooltip
            tooltip={
              "Ratio of possibly pasted characters / original characters in the document."
            }
          />
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
          className="gap-3"
        />
      </div>
      <br />
      <StatsHeading text="Continuity" />
      <div className="relative">
        <MetricBox
          label="Offline Text Ratio"
          value={(100 * continuity.offlineTextRatio).toFixed(1) + "%"}
        />
        <MetricTooltip
          tooltip={
            "Ratio of offline or unrecorded characters / recorded characters in the document."
          }
        />
      </div>
      <GapCards
        gaps={continuity.gaps}
        sessions={sessions}
        actions={actions}
        onGapHighlight={onGapHighlight}
      />
    </div>
  );
}

export default memo(DocStatsPanel, (prev, next) => {
  return (
    prev.docStats === next.docStats &&
    prev.sessions === next.sessions &&
    prev.actions === next.actions &&
    prev.docId === next.docId &&
    prev.onGapHighlight === next.onGapHighlight
  );
});
