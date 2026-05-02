import Screen from "@/components/Screen";
import DocMeta from "@/components/DocMeta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import useReplay from "@/hooks/useReplay";

export default function Workspace({ record }) {
  const [snapshot, actions] = useReplay(record);

  return (
    <Card className="mx-auto my-5 grid h-190 w-full max-w-3xl">
      <DocMeta
        record={record}
        currentSession={snapshot.currentSession}
        evIdx={snapshot.i}
        evTotal={snapshot.sesTotalEv}
        className="mx-auto w-full px-5"
      />
      <CardContent className="mx-auto w-full h-160">
        <Screen docText={snapshot.docText} caretPos={snapshot.caretPos} />
      </CardContent>
      <Button
        className="border-card mt-1"
        onClick={() => {
          if (snapshot.playing) {
            actions.pause();
          } else {
            actions.play();
          }
        }}
      >
        {snapshot.playing ? "Pause" : "Play"}
      </Button>
    </Card>
  );
}
