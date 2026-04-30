import Screen from "@/components/Screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import useReplay from "@/hooks/useReplay";

export default function Workspace({ record }) {
  const [snapshot, actions] = useReplay(record);

  return (
    <Card className="mx-auto my-5 grid h-190 w-full max-w-3xl">
      <CardContent className="mx-auto mt-20 w-full h-80 items-center justify-center">
        <Screen docText={snapshot.docText} caretPos={snapshot.caretPos} />
      </CardContent>
      <Button
        className="border-card mt-20"
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
