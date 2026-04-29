import { useEffect, useRef, useState } from "react";
import { checkStruct, processData } from "../../modules/loader";

function ExpandBtnSvg({ expanded }) {
  return expanded ? (
    <>
      <svg className="w-3 h-3 fill-current" viewBox="0 0 16 16">
        <rect width="16" height="16" id="icon-bound" fill="none" />
        <polygon points="8,5 13,10 3,10" />
      </svg>
    </>
  ) : (
    <>
      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
        <path
          d="M7 10L12 15L17 10"
          stroke="#000000"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
}

function FileIconSvg() {
  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none h-20 w-20"
        fill=""
        viewBox="0 0 24 24"
      >
        <path
          fill=""
          d="M10 1C9.73478 1 9.48043 1.10536 9.29289 1.29289L3.29289 7.29289C3.10536 7.48043 3 7.73478 3 8V20C3 21.6569 4.34315 23 6 23H7C7.55228 23 8 22.5523 8 22C8 21.4477 7.55228 21 7 21H6C5.44772 21 5 20.5523 5 20V9H10C10.5523 9 11 8.55228 11 8V3H18C18.5523 3 19 3.44772 19 4V9C19 9.55228 19.4477 10 20 10C20.5523 10 21 9.55228 21 9V4C21 2.34315 19.6569 1 18 1H10ZM9 7H6.41421L9 4.41421V7ZM14 15.5C14 14.1193 15.1193 13 16.5 13C17.8807 13 19 14.1193 19 15.5V16V17H20C21.1046 17 22 17.8954 22 19C22 20.1046 21.1046 21 20 21H13C11.8954 21 11 20.1046 11 19C11 17.8954 11.8954 17 13 17H14V16V15.5ZM16.5 11C14.142 11 12.2076 12.8136 12.0156 15.122C10.2825 15.5606 9 17.1305 9 19C9 21.2091 10.7909 23 13 23H20C22.2091 23 24 21.2091 24 19C24 17.1305 22.7175 15.5606 20.9844 15.122C20.7924 12.8136 18.858 11 16.5 11Z"
          clipRule="evenodd"
          fillRule="evenodd"
        ></path>
      </svg>
    </>
  );
}

export default function FileUpload({ onRecordLoaded }) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const uploadPanelRef = useRef(null);
  const uploadPanelId = "flight-record-upload-panel";

  useEffect(
    function handleScroll() {
      if (!expanded) return;
      uploadPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    },
    [expanded],
  );

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
    } catch (err) {
      console.log(err);
      setError("Invalid JSON flight record file.");
      event.target.value = "";
    }
  }

  return (
    <>
      <div className="flex justify-center items-center mt-10">
        <span className="flex justify-center font-serif">
          Or upload a Flight Record file...
        </span>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full ml-4 bg-gray-50 text-black border border-gray-500 drop-shadow-sm transition-colors duration-150 hover:bg-gray-200"
          aria-expanded={expanded}
          aria-controls={uploadPanelId}
          aria-label={expanded ? "Hide file upload" : "Show file upload"}
          onClick={() => setExpanded((current) => !current)}
        >
          <ExpandBtnSvg expanded={expanded} />
        </button>
      </div>
      <label
        id={uploadPanelId}
        ref={uploadPanelRef}
        className="relative mx-auto mt-5 flex h-64 w-120 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-gray-400 p-8 transition-colors hover:bg-gray-100"
        hidden={!expanded}
      >
        <input
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          type="file"
          aria-label="Upload flight record file"
          accept="application/json,.json"
          onChange={handleFileChange}
        />
        <FileIconSvg />
        <span className="block text-gray-500 font-semibold mt-3">
          Drop a flightRecord file here
        </span>
        <span className="block text-gray-400 font-normal mt-1">
          or click to upload
        </span>
      </label>
      {error ? (
        <p
          id="upload-error-msg"
          className="mx-auto mt-3 w-64 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
    </>
  );
}
