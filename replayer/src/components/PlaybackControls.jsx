import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import { ButtonGroup } from "@/components/ui/button-group";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationEllipsis,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

function PlaybackButtonGroup({ snapshot, actions, className = "" }) {
  return (
    <ButtonGroup className={className}>
      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>
          <Button
            className="cursor-pointer bg-muted-foreground/80"
            onClick={() => actions.resetStatus(snapshot)}
          >
            <RotateCcw />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Reset</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>
          <Button
            className="cursor-pointer"
            onClick={() => {
              if (snapshot.playing === false) {
                actions.play();
              }
            }}
          >
            <Play />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Play</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>
          <Button
            className="cursor-pointer bg-muted-foreground/80"
            onClick={() => {
              if (snapshot.playing) {
                actions.pause();
              }
            }}
          >
            <Pause />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Pause</p>
        </TooltipContent>
      </Tooltip>
    </ButtonGroup>
  );
}

function SpeedSlider({ snapshot, actions, className = "" }) {
  const sliderId = "playback-speed-slider";
  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <Label
        htmlFor={sliderId}
        className="shrink-0 whitespace-nowrap text-muted-foreground"
      >
        Speed: {snapshot.speed.toFixed(1)}x
      </Label>
      <Slider
        id={sliderId}
        defaultValue={[1]}
        min={0.1}
        max={20}
        step={0.1}
        className="min-w-24 flex-1"
        onValueChange={(value) => actions.setSpeed(value[0])}
        value={[snapshot.speed]}
      ></Slider>
    </div>
  );
}

function SessionButtons({ snapshot, actions, className = "" }) {
  const maxVisibleSessions = 3;
  const sessionCount = snapshot.sessions.length;
  const currentSession = snapshot.currentSession ?? 0;
  const groupStart =
    Math.floor(currentSession / maxVisibleSessions) * maxVisibleSessions;
  const groupEnd = Math.min(groupStart + maxVisibleSessions, sessionCount);
  const visibleSessions = snapshot.sessions.slice(groupStart, groupEnd);
  const [jumpValue, setJumpValue] = useState(currentSession + 1);

  useEffect(() => {
    setJumpValue(currentSession + 1);
  }, [currentSession]);

  function handleSessionJump(event) {
    event.preventDefault();
    const nextSession = jumpValue;

    if (nextSession < 1 || nextSession > sessionCount) {
      setJumpValue(currentSession + 1);
      toast.error("Invalid session number.");
      return;
    }

    actions.seekToSession(nextSession - 1);
  }

  return (
    <div
      className={`flex min-w-0 items-center justify-center gap-3 ${className}`}
    >
      <Pagination className="min-w-0 justify-center">
        <PaginationContent className="max-w-full overflow-hidden">
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(event) => {
                event.preventDefault();
                actions.seekPrevSession();
              }}
            />
          </PaginationItem>

          {groupStart > 0 ? (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          ) : null}

          {visibleSessions.map((session, offset) => {
            const index = groupStart + offset;

            return (
              <PaginationItem key={session.sid || index}>
                <PaginationLink
                  href="#"
                  isActive={currentSession === index}
                  onClick={(event) => {
                    event.preventDefault();
                    actions.seekToSession(index);
                  }}
                >
                  {index + 1}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          {groupEnd < sessionCount ? (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          ) : null}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(event) => {
                event.preventDefault();
                actions.seekNextSession();
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <form
        className="flex shrink-0 items-center gap-1"
        onSubmit={handleSessionJump}
      >
        <Input
          aria-label="Jump to session"
          className="h-8 w-12 text-center"
          min={1}
          max={sessionCount}
          onChange={(event) => setJumpValue(event.target.value)}
          type="number"
          value={jumpValue}
        />
        <Button size="sm" type="submit" variant="outline">
          Go
        </Button>
      </form>
    </div>
  );
}

export default function PlaybackControls({
  snapshot,
  actions,
  className = "",
}) {
  return (
    <section
      className={`grid w-full grid-cols-[auto_minmax(0,1fr)_12rem] items-center gap-4 ${className}`}
    >
      <PlaybackButtonGroup
        snapshot={snapshot}
        actions={actions}
        className="justify-self-start"
      />
      <SessionButtons
        snapshot={snapshot}
        actions={actions}
        className="min-w-0 justify-self-center overflow-hidden"
      />
      <SpeedSlider
        snapshot={snapshot}
        actions={actions}
        className="justify-self-end"
      />
    </section>
  );
}
