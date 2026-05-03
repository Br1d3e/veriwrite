import Screen from "@/components/Screen";
import DocMeta from "@/components/DocMeta";
import PlaybackControls from "@/components/PlaybackControls";
import ProgressBars from "@/components/ProgressBars";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import useReplay from "@/hooks/useReplay";

export default function Workspace({ record }) {
  const [snapshot, actions] = useReplay(record);

  return (
    <Card className="mx-auto my-5 grid h-190 w-full max-w-3xl">
      <DocMeta snapshot={snapshot} className="mx-auto w-full px-5" />
      <CardContent className="mx-auto w-full h-130">
        <Screen docText={snapshot.docText} caretPos={snapshot.caretPos} />
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-4">
        <ProgressBars snapshot={snapshot} className="px-1" />
        <PlaybackControls snapshot={snapshot} actions={actions} />
      </CardFooter>
    </Card>
  );
}
