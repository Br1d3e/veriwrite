import Screen from "@/components/Screen";
import DocMeta from "@/components/DocMeta";
import PlaybackControls from "@/components/PlaybackControls";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
      <CardContent className="mx-auto w-full h-150">
        <Screen docText={snapshot.docText} caretPos={snapshot.caretPos} />
      </CardContent>
      <CardFooter className="w-full">
        <PlaybackControls snapshot={snapshot} actions={actions} />
      </CardFooter>
    </Card>
  );
}
