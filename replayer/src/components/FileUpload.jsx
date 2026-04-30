import { useRef, useState } from "react";
import { checkStruct, processData } from "../../modules/loader";
import { Separator } from "./ui/separator";
import { toast } from "sonner";

function FileIconSvg() {
  return (
    <>
      <svg
        className="w-10 h-10"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g id="File / Cloud_Upload">
          <path
            d="M12 16V10M12 10L9 12M12 10L15 12M23 15C23 12.7909 21.2091 11 19 11C18.9764 11 18.9532 11.0002 18.9297 11.0006C18.4447 7.60802 15.5267 5 12 5C9.20335 5 6.79019 6.64004 5.66895 9.01082C3.06206 9.18144 1 11.3498 1 13.9999C1 16.7613 3.23858 19.0001 6 19.0001L19 19C21.2091 19 23 17.2091 23 15Z"
            stroke="#2563eb"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </>
  );
}

export default function FileUpload({ onRecordLoaded, className = "" }) {
  const [error, setError] = useState("");
  const uploadPanelRef = useRef(null);
  const uploadPanelId = "flight-record-upload-panel";

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError("");
      const text = await file.text();
      const record = JSON.parse(text);
      const validStruct = checkStruct(record, 2);
      if (!validStruct) {
        throw new Error("Invalid flight record file format.");
      }
      onRecordLoaded?.({
        nextRecord: processData(record),
        source: "file",
      });
      toast.success(
        `Loaded record: ${record?.m?.title || record?.title || "Untitled"}`,
      );
    } catch (err) {
      console.log(err);
      setError("Invalid JSON flight record file.");
      toast.error(err.message || "Invalid JSON flight record file.");
      event.target.value = "";
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-5 px-8">
        <Separator className="flex-1" />
        <span className="shrink-0 text-muted-foreground">Or</span>
        <Separator className="flex-1" />
      </div>
      <label
        id={uploadPanelId}
        ref={uploadPanelRef}
        className="relative mx-auto mt-3 flex h-10 w-full cursor-pointer bg-blue-50 flex-col items-center justify-center border-2 border-indigo-300 border-dashed rounded-md p-4 transition-colors hover:bg-blue-100"
      >
        <input
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          type="file"
          aria-label="Upload flight record file"
          accept="application/json,.json"
          onChange={handleFileChange}
        />
        <div className="flex gap-3">
          <FileIconSvg />
          <span className="block text-primary text-center mt-3">
            Upload a Flight Record
          </span>
        </div>
      </label>
    </div>
  );
}
