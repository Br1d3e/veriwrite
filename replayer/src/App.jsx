import { useState } from "react";
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
      {record ? (
        <div className="mx-auto mt-3 max-w-md rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Loaded record: {record?.m?.title || record?.title || "Untitled"}
        </div>
      ) : null}
    </main>
  );
}
