import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import RecordPicker from "@/views/RecordPicker";
import Workspace from "@/views/Workspace";
import { TooltipProvider } from "@/components/ui/tooltip";
import { processData } from "@/lib/loader";
import { refreshLLMToken } from "@/lib/recordApi";
import { ENABLE_LLM_REPORTS } from "@/lib/apiConfig";
import { storeTokenById } from "@/components/LLMReports.jsx";

export default function App() {
  const states = {
    pick: "PICK_RECORD",
    play: "REPLAY",
  };
  const [record, setRecord] = useState(null);
  const [online, setOnline] = useState(false);
  const [appState, setAppState] = useState(states.pick);

  async function handleRecordLoaded({ nextRecord, source }) {
    const processedRecord = processData(nextRecord);

    setRecord(processedRecord);
    setOnline(source === "server");
    setAppState(states.play);

    if (ENABLE_LLM_REPORTS) {
      const docId = processedRecord.m.docId;
      const token = await refreshLLMToken(docId);
      storeTokenById(docId, token);
    }
  }

  function onReturn() {
    setAppState(states.pick);
    setRecord(null);
    setOnline(false);
  }

  return (
    <main className="bg-slate-50 text-slate-950">
      {appState === states.pick ? (
        <RecordPicker onRecordLoaded={handleRecordLoaded} />
      ) : (
        <TooltipProvider>
          {<Workspace record={record} online={online} onReturn={onReturn} />}
        </TooltipProvider>
      )}
      <Toaster position="bottom-center" richColors />
    </main>
  );
}
