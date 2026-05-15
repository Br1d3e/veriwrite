import StatsHeading from "./StatsHeading";
import { MetricBox } from "./MetricBox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clipboard } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatTime, wordCount } from "@/lib/utils";

function LargeInsertionBadge() {
  return (
    <Badge className="bg-destructive/10 [a&]:hover:bg-destructive/5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive border-none focus-visible:outline-none">
      Large Insertion
    </Badge>
  );
}

function HighRateBadge() {
  return (
    <Badge className="border-none bg-amber-600/10 text-amber-600 focus-visible:ring-amber-600/20 focus-visible:outline-none dark:bg-amber-400/10 dark:text-amber-400 dark:focus-visible:ring-amber-400/40 [a&]:hover:bg-amber-600/5 dark:[a&]:hover:bg-amber-400/5">
      High Rate
    </Badge>
  );
}

function InDocPasteBadge() {
  return (
    <Badge className="border-none bg-green-600/10 text-green-600 focus-visible:ring-green-600/20 focus-visible:outline-none dark:bg-green-400/10 dark:text-green-400 dark:focus-visible:ring-green-400/40 [a&]:hover:bg-green-600/5 dark:[a&]:hover:bg-green-400/5">
      In-doc Paste
    </Badge>
  );
}

function LongPauseBadge() {
  return (
    <Badge className="border-none bg-primary/10 text-primary focus-visible:ring-primary/20 focus-visible:outline-none dark:bg-primary/10 dark:text-primary dark:focus-visible:ring-primary/40 [a&]:hover:bg-primary/5 dark:[a&]:hover:bg-primary-400/5">
      Long Pause
    </Badge>
  );
}

function ReplacementBadge() {
  return (
    <Badge className="border-none" variant="secondary">
      Replacement
    </Badge>
  );
}

function PasteInsertionCards({
  pasteIns = [],
  actions,
  onPasteHighlight,
  className = "",
}) {
  if (pasteIns.length === 0) {
    return (
      <div className={`grid gap-2 ${className}`}>
        <StatsHeading text="Paste-like Insertions" />
        <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
          No paste-like insertions detected.
        </p>
      </div>
    );
  }

  return (
    <div className={`grid gap-2 ${className}`}>
      <StatsHeading text="Paste-like Insertions" />
      <h2 className="font-medium text-muted-foreground pb-2">
        {pasteIns.length} paste-like insertions detected.
      </h2>
      {pasteIns.map((paste, index) => {
        const text =
          paste.ins.length <= 160 ? paste.ins : paste.ins.slice(0, 160) + "...";
        const isHigh = paste.lvl === "high";

        return (
          <Card
            className="cursor-pointer gap-1 ring-0 hover:bg-accent"
            key={`${paste.evIdx}-${index}`}
            onClick={() => {
              actions?.pause();
              actions?.seekToEvent(paste.evIdx + 1);
              let color;
              color = isHigh ? "red" : "yellow";
              if (paste.tags.includes("in-doc paste")) {
                color = "green";
              }
              onPasteHighlight?.({
                start: paste.startPos,
                end: paste.endPos,
                color: color,
              });
            }}
          >
            <CardHeader className="grid grid-cols-[50px_80px_90px] gap-20">
              <div
                className={`flex items-center justify-center gap-1 rounded-2xl bg-secondary`}
              >
                <Clipboard className="size-3" />
                <span className="text-foreground">#{index + 1}</span>
              </div>

              <span className="text-muted-foreground">
                {wordCount(paste.ins)} words
              </span>
              <span className="text-muted-foreground">{paste.rate} cps</span>
            </CardHeader>
            <Separator className="my-1" />
            <CardContent className="grid gap-2 text-sm text-foreground">
              <div>
                <span className="wrap-break-word">{text}</span>
              </div>
              <div className="flex gap-2">
                {paste.tags.map((tag) => {
                  switch (tag) {
                    case "large insertion":
                      return <LargeInsertionBadge />;
                    case "high rate":
                      return <HighRateBadge />;
                    case "long pause":
                      return <LongPauseBadge />;
                    case "in-doc paste":
                      return <InDocPasteBadge />;
                    case "replacement":
                      return <ReplacementBadge />;
                  }
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function SessionStatsPanel({
  sessionStats,
  actions,
  onPasteHighlight,
  className = "",
}) {
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
  const pasteIns = sessionStats.interpret?.pasteIns || [];

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
      <PasteInsertionCards
        pasteIns={pasteIns}
        actions={actions}
        onPasteHighlight={onPasteHighlight}
        className="mt-4"
      />
    </div>
  );
}
