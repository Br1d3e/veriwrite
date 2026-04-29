import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import RecordPicker from "./views/RecordPicker";

export default function App() {
  const [record, setRecord] = useState(null);
  const [online, setOnline] = useState(false);

  function handleRecordLoaded({ nextRecord, source }) {
    setRecord(nextRecord);
    setOnline(source === "server");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <RecordPicker onRecordLoaded={handleRecordLoaded} />
      <Toaster position="bottom-center" richColors />
    </main>
  );
}
