import { memo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import DocStatsPanel from "@/components/DocStats";

function StatsPanel({
  docStats,
  sessionStats,
  integrityStats,
  sessions,
  actions,
  onGapHighlight,
}) {
  return (
    <aside className="h-full min-h-0 overflow-hidden">
      <Tabs
        defaultValue="stats"
        className="flex h-full min-h-0 w-full flex-col bg-background"
      >
        <h2 className="font-heading mt-2 mx-3">Stats</h2>
        <TabsList className="mx-4 mt-1 grid grid-cols-3">
          <TabsTrigger value="doc">Document</TabsTrigger>
          <TabsTrigger value="session">Session</TabsTrigger>
          <TabsTrigger value="integrity">Integrity</TabsTrigger>
        </TabsList>

        <ScrollArea className="min-h-0 flex-1 p-4">
          <TabsContent value="doc">
            <DocStatsPanel
              docStats={docStats}
              sessions={sessions}
              actions={actions}
              onGapHighlight={onGapHighlight}
            />
          </TabsContent>
          <TabsContent value="session"></TabsContent>

          <TabsContent value="integrity"></TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  );
}

export default memo(StatsPanel, (prev, next) => {
  return (
    prev.docStats === next.docStats &&
    prev.sessionStats === next.sessionStats &&
    prev.integrityStats === next.integrityStats &&
    prev.sessions === next.sessions
  );
});
