import { useState } from "react";
import Screen from "@/components/Screen";
import DocMeta from "@/components/DocMeta";
import PlaybackControls from "@/components/PlaybackControls";
import ProgressBars from "@/components/ProgressBars";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import useReplay from "@/hooks/useReplay";
import StatsPanel from "@/components/StatsPanel";

export default function Workspace({
  record,
  docStats,
  sessionStats,
  online,
  onSwitchSession,
}) {
  const [snapshot, actions] = useReplay(record);
  const [screenHighlight, setScreenHighlight] = useState(null);

  return (
    <div className="grid h-screen min-h-0 max-h-10/12 grid-cols-[minmax(0,1fr)_minmax(0,0.5fr)] gap-10 overflow-hidden p-2">
      <Card className="mx-auto grid h-full min-h-0 w-full max-w-3xl border-0 ring-0">
        <DocMeta snapshot={snapshot} className="mx-auto w-full px-5" />
        <CardContent className="mx-auto w-full h-130">
          <Screen
            docText={snapshot.docText}
            caretPos={snapshot.caretPos}
            highlight={screenHighlight}
          />
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-4">
          <ProgressBars snapshot={snapshot} className="px-1" />
          <PlaybackControls
            snapshot={snapshot}
            actions={actions}
            onClearHighlight={() => setScreenHighlight(null)}
            onSwitchSession={onSwitchSession}
          />
        </CardFooter>
      </Card>
      <StatsPanel
        docStats={docStats}
        sessionStats={sessionStats}
        record={snapshot.record}
        evIdx={snapshot.i}
        currentSession={snapshot.currentSession}
        online={online}
        actions={actions}
        onGapHighlight={setScreenHighlight}
      />
    </div>
  );
}
