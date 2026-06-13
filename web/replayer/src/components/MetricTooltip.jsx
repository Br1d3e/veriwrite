import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CircleQuestionMark } from "lucide-react";

export default function MetricTooltip({ tooltip, className = "" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          type="button"
        >
          <CircleQuestionMark className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="text-secondary font-light">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
