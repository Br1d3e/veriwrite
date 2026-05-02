import {
  AlertCircleIcon,
  BanIcon,
  CheckCircle2Icon,
  FileQuestionMark,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export function BadgeVerified() {
  return (
    <Badge className="border-none bg-green-600/10 text-green-600 focus-visible:ring-green-600/20 focus-visible:outline-none dark:bg-green-400/10 dark:text-green-400 dark:focus-visible:ring-green-400/40 [a&]:hover:bg-green-600/5 dark:[a&]:hover:bg-green-400/5">
      <CheckCircle2Icon className="size-3" />
      Verified
    </Badge>
  );
}

export function BadgeNeedsReview() {
  return (
    <Badge className="border-none bg-amber-600/10 text-amber-600 focus-visible:ring-amber-600/20 focus-visible:outline-none dark:bg-amber-400/10 dark:text-amber-400 dark:focus-visible:ring-amber-400/40 [a&]:hover:bg-amber-600/5 dark:[a&]:hover:bg-amber-400/5">
      <AlertCircleIcon className="size-3" />
      Needs review
    </Badge>
  );
}

export function BadgeRisk() {
  return (
    <Badge className="bg-destructive/10 [a&]:hover:bg-destructive/5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive border-none focus-visible:outline-none">
      <BanIcon className="size-3" />
      Risk
    </Badge>
  );
}

export function BadgeUnverified() {
  return (
    <Badge className="border-none" variant="secondary">
      <FileQuestionMark className="size-3" />
      Unverified
    </Badge>
  );
}

export default function IntegrityBadge({ status = "UNVERIFIED" }) {
  switch (status) {
    case "VERIFIED":
      return <BadgeVerified />;
    case "NEEDS_REVIEW":
      return <BadgeNeedsReview />;
    case "RISK":
      return <BadgeRisk />;
    case "UNVERIFIED":
      return <BadgeUnverified />;
    default:
      return <BadgeUnverified />;
  }
}

export function IntegrityHoverCard({
  status = "UNVERIFIED",
  trigger,
  className = "",
}) {
  let cardColor, cardTitle, cardDesc;
  switch (status) {
    case "VERIFIED":
      cardColor = "bg-green-600/10";
      cardTitle = "Verified";
      cardDesc = "Recording process is validated by server.";
      break;
    case "NEEDS_REVIEW":
      cardColor = "bg-amber-600/10";
      cardTitle = "Needs review";
      cardDesc =
        "Writing process is authenticated, but some data are sent out of time.";
      break;
    case "RISK":
      cardColor = "bg-destructive/10";
      cardTitle = "Risk";
      cardDesc =
        "Some writing progress occurred without server's verification.";
      break;
    case "UNVERIFIED":
      cardColor = "bg-secondary/10";
      cardTitle = "Unverified";
      cardDesc = "Recording process is not validated by server.";
      break;
  }
  return (
    <HoverCard openDelay={100} closeDelay={100} className={className}>
      <HoverCardTrigger>{trigger}</HoverCardTrigger>
      <HoverCardContent
        className={`flex w-50 flex-col gap-0.5 ${cardColor} p-2`}
      >
        <span className="font-mono">{cardTitle}</span>
        <span className="text-muted-foreground text-xs">{cardDesc}</span>
      </HoverCardContent>
    </HoverCard>
  );
}
