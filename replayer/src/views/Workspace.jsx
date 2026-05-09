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
  integrityStats,
}) {
  const [snapshot, actions] = useReplay(record);

  return (
    <div className="grid h-screen min-h-0 grid-cols-[minmax(0,1fr)_600px] gap-2 overflow-hidden p-5">
      <Card className="mx-auto grid h-full min-h-0 w-full max-w-3xl">
        <DocMeta snapshot={snapshot} className="mx-auto w-full px-5" />
        <CardContent className="mx-auto w-full h-130">
          <Screen docText={snapshot.docText} caretPos={snapshot.caretPos} />
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-4">
          <ProgressBars snapshot={snapshot} className="px-1" />
          <PlaybackControls snapshot={snapshot} actions={actions} />
        </CardFooter>
      </Card>
      <StatsPanel
        docStats={docStats}
        sessionStats={sessionStats}
        integrityStats={integrityStats}
      />
    </div>
  );
}
