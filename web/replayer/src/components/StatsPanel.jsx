import { memo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import DocStatsPanel from "@/components/DocStats";
import SessionStatsPanel from "@/components/SessionStats";
import IntegrityStatsPanel from "@/components/IntegrityStats";
import { ChevronRightIcon } from "lucide-react";

function StatsPanel({
  docStats,
  sessionStats,
  record,
  actions,
  online,
  evIdx,
  currentSession,
  onGapHighlight,
  onCollapse,
}) {
  const sessions = record?.sessions || record?.s || [];

  return (
    <aside className={`h-full min-h-0 overflow-hidden relative`}>
      <button
        className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        type="button"
        onClick={onCollapse}
      >
        <ChevronRightIcon className="size-5" />
      </button>
      <Tabs
        defaultValue="doc"
        className="flex h-full min-h-0 w-full flex-col bg-background"
      >
        <h2 className="font-heading mt-2 mx-4 text-xl">Analysis</h2>
        <TabsList className="mx-4 mt-1 grid grid-cols-3" variant="line">
          <TabsTrigger value="doc">Document</TabsTrigger>
          <TabsTrigger value="session">Session</TabsTrigger>
          <TabsTrigger value="integrity">Integrity</TabsTrigger>
        </TabsList>

        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full min-h-0 pl-6 pr-2 py-2">
            <TabsContent value="doc">
              <DocStatsPanel
                docStats={docStats}
                sessions={sessions}
                actions={actions}
                record={record}
                online={online}
                onGapHighlight={onGapHighlight}
                docId={record.m?.docId || record.m?.d_id || record.m?.dId}
              />
            </TabsContent>
            <TabsContent value="session">
              <SessionStatsPanel
                docId={record.m?.docId || record.m?.d_id || record.m?.dId}
                record={record}
                online={online}
                sid={
                  sessions[currentSession]?.sid || sessions[currentSession]?.id
                }
                sessionStats={sessionStats}
                actions={actions}
                onPasteHighlight={onGapHighlight}
              />
            </TabsContent>
            <TabsContent value="integrity">
              <IntegrityStatsPanel
                record={record}
                online={online}
                evIdx={evIdx}
                actions={actions}
                currentSession={currentSession}
              />
            </TabsContent>
          </ScrollArea>
        </div>
      </Tabs>
    </aside>
  );
}

export default memo(StatsPanel, (prev, next) => {
  return (
    prev.docStats === next.docStats &&
    prev.sessionStats === next.sessionStats &&
    prev.record === next.record &&
    prev.online === next.online &&
    prev.currentSession === next.currentSession &&
    prev.actions === next.actions &&
    prev.evIdx === next.evIdx &&
    prev.onCollapse === next.onCollapse
  );
});
