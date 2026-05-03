import { CardTitle, CardDescription } from "@/components/ui/card";
import IntegrityBadge from "@/components/IntegrityBadge";
import { IntegrityHoverCard } from "@/components/IntegrityBadge";
import { convertTs } from "@/lib/replayEngine";

export default function DocMeta({ snapshot, className = "" }) {
  const record = snapshot.record;
  const currentSession = snapshot.currentSession;
  const evIdx = snapshot.i;
  const evTotal = snapshot.sesTotalEv;
  const playTime = convertTs(snapshot);
  const title = record?.m?.title || record?.title || "Untitled";
  const author = record?.m?.author || record?.author || "Unknown author";
  const integrityStatus = record?.status || "UNVERIFIED";
  const sessionNum = currentSession !== null ? currentSession + 1 : "NaN";
  const sessionTotalNum = record?.sessions?.length || record?.s.length || "NaN";
  const evTotalNum = evTotal !== null ? evTotal : "NaN";
  const evNum = evIdx !== null ? Math.min(evIdx, evTotalNum) : "NaN";
  const metaText = `${author}  ·  Session ${sessionNum}/${sessionTotalNum}  ·  Event ${evNum}/${evTotalNum}`;

  return (
    <section className={`${className}`}>
      <CardTitle className="grid w-full grid-cols-[minmax(0,1fr)_9.5rem_1rem] items-center gap-4 text-accent-foreground font-sans">
        <span className="min-w-0 space-y-1">
          <span className="block truncate font-semibold text-xl">{title}</span>
          <span className="block overflow-hidden whitespace-nowrap text-xs leading-5 text-muted-foreground">
            {metaText}
          </span>
          <span className="block text-xs text-muted-foreground overflow-hidden gap-2">
            Session time: {playTime}
          </span>
        </span>
        <span className="justify-self-end">
          <IntegrityHoverCard
            status={integrityStatus}
            trigger={<IntegrityBadge status={integrityStatus} />}
          />
        </span>
      </CardTitle>
    </section>
  );
}
