import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import RecordPicker from "./views/RecordPicker";
import Workspace from "./views/Workspace";

export default function App() {
  const states = {
    pick: "PICK_RECORD",
    play: "REPLAY",
  };
  const [record, setRecord] = useState(null);
  const [online, setOnline] = useState(false);
  const [appState, setAppState] = useState(states.pick);

  function handleRecordLoaded({ nextRecord, source }) {
    setRecord(nextRecord);
    setOnline(source === "server");
    setAppState(states.play);
  }

  return (
    <main className="bg-slate-50 text-slate-950">
      {appState === states.pick ? (
        <RecordPicker onRecordLoaded={handleRecordLoaded} />
      ) : (
        <Workspace record={record} />
      )}
      <Toaster position="bottom-center" richColors />
    </main>
  );
}
