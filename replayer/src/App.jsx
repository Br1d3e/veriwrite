import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import RecordPicker from "./views/RecordPicker";
import Workspace from "./views/Workspace";
import { TooltipProvider } from "@/components/ui/tooltip";
import { calDocStats } from "../modules/stats/doc";
import { calSession } from "../modules/stats/session";

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
  const [integrityStats, setIntegrityStats] = useState(null);

  function handleRecordLoaded({ nextRecord, source }) {
    setRecord(nextRecord);
    setOnline(source === "server");
    setAppState(states.play);
    setDocStats(calDocStats(nextRecord));
    setSessionStats(calSession(nextRecord));
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
              sessionStats={sessionStats}
              integrityStats={integrityStats}
            />
          }
        </TooltipProvider>
      )}
      <Toaster position="bottom-center" richColors />
    </main>
  );
}
