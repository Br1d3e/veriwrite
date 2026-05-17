import StatsHeading from "./StatsHeading";
import MetricRow from "./MetricRow";
import {
  BadgeNeedsReview,
  BadgeRisk,
  BadgeUnverified,
  BadgeVerified,
} from "./IntegrityBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatTime } from "@/lib/utils";

function formatSid(sid) {
  if (!sid) return "Unknown";
  return sid.length <= 30 ? sid : `${sid.slice(0, 30)}...`;
}

function formatServerTime(ts) {
  return ts ? formatTime(ts) : "Unknown";
}

function getSessionIntegrityDisplay(session) {
  if (!session || session.status == null) {
    return {
      badge: <BadgeUnverified />,
      description: "Server integrity status is unavailable.",
    };
  }

  if (session.status === true) {
    return {
      badge: <BadgeVerified />,
      description: "Server authenticated this session.",
    };
  }

  return {
    badge: <BadgeRisk text="Invalid" />,
    description: "This session is not authorized by the server.",
  };
}

function getBlockStatuses(block) {
  if (!block?.status) return [];
  return Array.isArray(block.status) ? block.status : [block.status];
}

function getBlockIntegrityDisplay(block) {
  const status = getBlockStatuses(block);

  if (status.length === 0) {
    return {
      badge: <BadgeUnverified />,
      description: "Server integrity status is unavailable.",
      freshness: "Unknown",
      hashChain: "Unknown",
      hash: "Unknown",
      docState: "Unknown",
    };
  }

  let badge = <BadgeUnverified />;
  let description = "Server integrity status is unavailable.";
  let freshness = "Fresh";
  let hashChain = "Valid";
  let hash = "Valid";
  let docState = "Valid";
  let seq = "Valid";

  if (status.includes("INVALID_Q")) {
    badge = <BadgeRisk text="Invalid" />;
    description = "Block sequence verification failed.";
    seq = "Invalid";
  } else if (status.includes("INVALID_HASH_CHAIN")) {
    badge = <BadgeRisk text="Invalid" />;
    description = "Hash chain verification failed.";
    hashChain = "Invalid";
  } else if (status.includes("INVALID_STATE")) {
    badge = <BadgeRisk text="Invalid" />;
    description = "Document state verification failed.";
    docState = "Invalid";
  } else if (status.includes("INVALID_COMMITMENT")) {
    badge = <BadgeRisk text="Invalid" />;
    description = "Block commitment is not verified by server.";
    hash = "Invalid";
  } else if (status.includes("INVALID_FRESHNESS")) {
    badge = <BadgeNeedsReview text="Delayed" />;
    description =
      "Server did not receive this writing period in the fresh window.";
    freshness = "Delayed";
  } else if (status.includes("VALID")) {
    badge = <BadgeVerified />;
    description = "Server authenticated this writing period.";
  }

  if (block?.freshness_status && block.freshness_status !== "FRESH") {
    freshness = "Delayed";
  }
  if (block?.valid_h === false) hashChain = "Invalid";
  if (block?.valid_ch === false) hash = "Invalid";
  if (block?.valid_dsh === false) docState = "Invalid";

  return { badge, description, freshness, hashChain, hash, docState, seq };
}

function getBlockIndexForEvent(session, eventIdx = 0) {
  const blocks = session?.b || session?.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) return -1;

  let seen = 0;
  for (let index = 0; index < blocks.length; index++) {
    const count = Array.isArray(blocks[index].ev) ? blocks[index].ev.length : 0;
    if (eventIdx < seen + count) return index;
    seen += count;
  }

  return blocks.length - 1;
}

function getBlockForEvent(session, eventIdx = 0) {
  const blocks = session?.b || session?.blocks;
  const index = getBlockIndexForEvent(session, eventIdx);
  return index >= 0 ? blocks[index] : null;
}

function getBlockFirstEventIdx(blocks, blockIndex) {
  if (!Array.isArray(blocks) || blockIndex < 0 || blockIndex >= blocks.length) {
    return null;
  }

  let count = 0;
  for (let index = 0; index < blockIndex; index++) {
    count += Array.isArray(blocks[index].ev) ? blocks[index].ev.length : 0;
  }
  return count;
}

function getMetricColor(metric) {
  return metric === "Valid" ? "text-green-600" : "text-destructive";
}

function getBlockStripColor(block) {
  const status = getBlockStatuses(block);
  if (status.includes("VALID")) return "bg-green-500/60";
  if (status.includes("INVALID_FRESHNESS")) return "bg-amber-500/60";
  if (status.length > 0) return "bg-destructive/60";
  return "bg-muted-foreground/30";
}

function BlockStrip({ blocks, activeBlockIndex, onSelectBlock }) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return (
      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        No block integrity data available.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {blocks.map((block, index) => (
          <button
            aria-label={`View block ${block.q ?? index + 1}`}
            className={`${getBlockStripColor(block)} ${
              activeBlockIndex === index
                ? "border-2 border-primary ring-offset-1"
                : ""
            } min-w-2 flex-1 cursor-pointer transition-opacity hover:opacity-80`}
            key={block.q ?? index}
            onClick={() => onSelectBlock?.(index)}
            title={`Block #${block.q ?? index + 1}`}
            type="button"
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        Click a segment to inspect that block.
      </span>
    </div>
  );
}

export default function IntegrityStatsPanel({
  record,
  online,
  evIdx,
  actions,
  currentSession,
  className = "",
}) {
  if (!online) {
    return (
      <div
        className={`rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground ${className}`}
      >
        The record was offline, and the server cannot authenticate writing
        process.
      </div>
    );
  }

  const sessions = record?.sessions || record?.s || [];
  const session = sessions[currentSession];
  const blocks = session?.b || session?.blocks || [];
  const block = getBlockForEvent(session, evIdx);
  const blockIndex = getBlockIndexForEvent(session, evIdx);
  const { badge, description } = getSessionIntegrityDisplay(session);
  const blockDisplay = getBlockIntegrityDisplay(block);

  return (
    <div className={`grid gap-2 ${className}`}>
      <StatsHeading text="Session Integrity" />
      <Card className="ring-0">
        <CardHeader className="flex-row items-center justify-between gap-3">
          {badge}
          <span className="text-right text-sm text-muted-foreground">
            {description}
          </span>
        </CardHeader>
        <Separator />
        <CardContent className="grid gap-1">
          <MetricRow label="Session ID" value={formatSid(session?.sid)} />
          <MetricRow
            label="Block Count"
            value={session?.bc ?? blocks.length ?? "Unknown"}
          />
          <MetricRow
            label="Continuity"
            value={session?.cs ? "Valid" : "Invalid"}
            valueColor={session?.cs ? "text-green-600" : "text-destructive"}
          />
          <MetricRow
            label="Server Received"
            value={formatServerTime(session?.ct)}
          />
          <MetricRow
            label="Receipt"
            value={session?.fr ? "Signed" : "Missing"}
            valueColor={session?.fr ? "text-primary" : "text-destructive"}
          />
        </CardContent>
      </Card>

      <StatsHeading text="Block Integrity" />
      <Card className="ring-0">
        <CardHeader className="flex-row items-center justify-between gap-3">
          {blockDisplay.badge}
          <span className="text-right text-sm text-muted-foreground">
            {blockDisplay.description}
          </span>
        </CardHeader>
        <Separator />
        <CardContent className="grid gap-2">
          <BlockStrip
            blocks={blocks}
            activeBlockIndex={blockIndex}
            onSelectBlock={(nextBlockIndex) => {
              const eventIdx = getBlockFirstEventIdx(blocks, nextBlockIndex);
              if (eventIdx !== null) actions?.seekToEvent(eventIdx);
            }}
          />
          <div className="grid gap-1">
            <MetricRow
              label="Block index"
              value={block ? `#${block.q + 1}` : "Unknown"}
            />
            <MetricRow
              label="Freshness"
              value={blockDisplay.freshness}
              valueColor={
                blockDisplay.freshness === "Fresh"
                  ? "text-green-600"
                  : "text-amber-500"
              }
            />
            <MetricRow
              label="Hash Chain"
              value={blockDisplay.hashChain}
              valueColor={getMetricColor(blockDisplay.hashChain)}
            />
            <MetricRow
              label="Commitment"
              value={blockDisplay.hash}
              valueColor={getMetricColor(blockDisplay.hash)}
            />
            <MetricRow
              label="Doc State"
              value={blockDisplay.docState}
              valueColor={getMetricColor(blockDisplay.docState)}
            />
            <MetricRow
              label="Sequence"
              value={blockDisplay.seq}
              valueColor={getMetricColor(blockDisplay.seq)}
            />
            <MetricRow
              label="Server Received"
              value={formatServerTime(block?.received_server_ts)}
            />
            <MetricRow
              label="Receipt"
              value={block?.receipt ? "Signed" : "Missing"}
              valueColor={block?.receipt ? "text-primary" : "text-destructive"}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
