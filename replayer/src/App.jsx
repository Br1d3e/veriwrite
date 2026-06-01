import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import RecordPicker from "@/views/RecordPicker";
import Workspace from "@/views/Workspace";
import { TooltipProvider } from "@/components/ui/tooltip";
import { calDocStats } from "@/lib/stats/doc";
import { calSession } from "@/lib/stats/session";

export default function App() {
  const states = {
    pick: "PICK_RECORD",
    play: "REPLAY",
  };
  const [record, setRecord] = useState(null);
  const [online, setOnline] = useState(false);
  const [appState, setAppState] = useState(states.pick);
  const [docStats, setDocStats] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);

  function handleRecordLoaded({ nextRecord, source }) {
    const sessions = nextRecord?.sessions || nextRecord?.s || [];

    setRecord(nextRecord);
    setOnline(source === "server");
    setAppState(states.play);
    setDocStats(calDocStats(nextRecord));
    setSessionStats(calSession(sessions.length > 0 ? sessions[0] : null));
  }

  function onReturn() {
    setAppState(states.pick);
    setRecord(null);
    setDocStats(null);
    setSessionStats(null);
    setOnline(false);
  }

  return (
    <main className="bg-slate-50 text-slate-950">
      {appState === states.pick ? (
        <RecordPicker onRecordLoaded={handleRecordLoaded} />
      ) : (
        <TooltipProvider>
          {
            <Workspace
              record={record}
              docStats={docStats}
              online={online}
              sessionStats={sessionStats}
              onSwitchSession={(session) =>
                setSessionStats(calSession(session))
              }
              onReturn={onReturn}
            />
          }
        </TooltipProvider>
      )}
      <Toaster position="bottom-center" richColors />
    </main>
  );
}
