import { Card, CardTitle, CardContent, CardFooter } from "./ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Undo2 } from "lucide-react";
import DocMeta from "@/components/DocMeta";
import Screen from "./Screen";
import ProgressBars from "./ProgressBars";
import PlaybackControls from "./PlaybackControls";
import { Separator } from "./ui/separator";

export default function ReplayCard({
  snapshot,
  onSwitchSession,
  onReturn,
  screenHighlight,
  setScreenHighlight,
  actions,
  className = "",
}) {
  return (
    <Card
      className={`mx-auto grid h-full min-h-0 w-full max-w-3xl border-0 ring-0 border-slate-200 shadow-[0_5px_10px_rgba(15,23,42,0.08)] ${className}`}
    >
      <CardTitle>
        <Tooltip delayDuration={1000}>
          <TooltipTrigger asChild>
            <Undo2
              className="mr-5 size-4 text-muted-foreground justify-self-end cursor-pointer hover:text-accent-foreground"
              onClick={onReturn}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>Load another record</p>
          </TooltipContent>
        </Tooltip>
        <DocMeta snapshot={snapshot} className="mx-auto w-full px-5" />
      </CardTitle>
      <Separator />
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
  );
}
