import { Progress } from "@/components/ui/progress";

export default function ProgressBars({ snapshot, className = "" }) {
  const sessionValue = Math.min(Math.max(snapshot.sesProg || 0, 0), 100);
  const documentValue = Math.min(Math.max(snapshot.docProg || 0, 0), 100);

  return (
    <div className={`grid w-full gap-2 ${className}`}>
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_2rem] items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Session
        </span>
        <Progress value={sessionValue} />
      </div>
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_2rem] items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Document
        </span>
        <Progress value={documentValue} />
      </div>
    </div>
  );
}
