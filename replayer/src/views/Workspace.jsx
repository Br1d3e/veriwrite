import { useState } from "react";
import useReplay from "@/hooks/useReplay";
import StatsPanel from "@/components/StatsPanel";
import { ChevronLeftIcon } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import ReplayCard from "@/components/ReplayCard";

function StatsRail({ onShow }) {
  return (
    <aside className="relative h-full min-h-0">
      <button
        aria-label="Show stats panel"
        className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={onShow}
        type="button"
      >
        <ChevronLeftIcon className="size-5" />
      </button>
    </aside>
  );
}

export default function Workspace({
  record,
  docStats,
  sessionStats,
  online,
  onSwitchSession,
  onReturn,
}) {
  const [snapshot, actions] = useReplay(record);
  const [screenHighlight, setScreenHighlight] = useState(null);
  const [view, setView] = useState("split");

  if (view === "split") {
    return (
      <div className="h-screen min-h-0 max-h-10/12">
        <ResizablePanelGroup
          direction="horizontal"
          className="overflow-hidden p-2"
        >
          <ResizablePanel defaultSize={65}>
            <ReplayCard
              snapshot={snapshot}
              actions={actions}
              onSwitchSession={onSwitchSession}
              onReturn={onReturn}
              screenHighlight={screenHighlight}
              setScreenHighlight={setScreenHighlight}
              className="min-w-0"
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={32} minSize={20}>
            <StatsPanel
              docStats={docStats}
              sessionStats={sessionStats}
              record={snapshot.record}
              evIdx={snapshot.i}
              currentSession={snapshot.currentSession}
              online={online}
              actions={actions}
              onGapHighlight={setScreenHighlight}
              onCollapse={() => setView("focus")}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  } else if (view === "focus") {
    return (
      <div className="grid h-screen min-h-0 max-h-10/12 grid-cols-[minmax(0,1fr)_3rem] gap-0 overflow-hidden p-2">
        <ReplayCard
          snapshot={snapshot}
          actions={actions}
          onSwitchSession={onSwitchSession}
          onReturn={onReturn}
          screenHighlight={screenHighlight}
          setScreenHighlight={setScreenHighlight}
          className="max-w-5xl min-w-0"
        />
        <StatsRail onShow={() => setView("split")} />
      </div>
    );
  }
}
