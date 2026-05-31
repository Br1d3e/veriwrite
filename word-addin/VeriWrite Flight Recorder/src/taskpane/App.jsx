import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Divider,
  Switch,
  Text,
  Title3,
} from "@fluentui/react-components";
import { ArrowDownloadRegular, RecordRegular, StopRegular } from "@fluentui/react-icons";
import {
  getFlightRecord,
  getOnlineStatus,
  getRetryStatus,
  refreshOnlineStatus,
  setOnlineMode,
  startRecording,
  stopRecording,
} from "./modules/recorder";
import { useInterval } from "./hooks/useInterval";

const AUTO_MESSAGE_MS = 5000;

function downloadJSON() {
  const flightRecord = getFlightRecord();
  if (!flightRecord) return;

  const blob = new Blob([JSON.stringify(flightRecord, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  const safeTitle = (flightRecord.m.title || "untitled").replace(/[^\w-]+/g, "_");
  link.href = URL.createObjectURL(blob);
  link.download = `${safeTitle}.flightrecord.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function formatRetryStatus(retryStatus) {
  if (!retryStatus) return "";
  if (retryStatus.retrying) {
    const seconds = Math.round((retryStatus.retryMs || 0) / 1000);
    return `Reconnecting to record server... ${seconds}s`;
  }
  return "Internet unavailable. Recording in offline mode.";
}

export default function App() {
  const [officeReady, setOfficeReady] = useState(false);
  const [isWord, setIsWord] = useState(false);
  const [recording, setRecording] = useState(false);
  const [online, setOnline] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [retryMessage, setRetryMessage] = useState("");
  const lastOnlineRef = useRef(null);

  useEffect(() => {
    if (!window.Office) return;
    window.Office.onReady((info) => {
      setOfficeReady(true);
      setIsWord(info.host === window.Office.HostType.Word);
      const currentOnline = getOnlineStatus();
      lastOnlineRef.current = currentOnline;
      setOnline(currentOnline);
      refreshOnlineStatus().then((nextOnline) => {
        lastOnlineRef.current = nextOnline;
        setOnline(nextOnline);
      });
    });
  }, []);

  useInterval(() => {
    refreshOnlineStatus().then((nextOnline) => {
      setOnline(nextOnline);

      if (lastOnlineRef.current !== null && lastOnlineRef.current !== nextOnline) {
        setStatusMessage(
          nextOnline
            ? "Detected server connection. Recording will resume online."
            : "Server connection unavailable. Recording will continue offline."
        );
      }
      lastOnlineRef.current = nextOnline;
    });

    const retryStatus = getRetryStatus();
    setRetryMessage(formatRetryStatus(retryStatus));
  }, 1000);

  useEffect(() => {
    if (!statusMessage) return undefined;
    const timeout = setTimeout(() => setStatusMessage(""), AUTO_MESSAGE_MS);
    return () => clearTimeout(timeout);
  }, [statusMessage]);

  async function handleStart() {
    await startRecording();
    setRecording(true);
  }

  async function handleStop() {
    await stopRecording();
    setRecording(false);
    if (!getOnlineStatus()) {
      downloadJSON();
    }
  }

  if (!isWord) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
        <Text block className="text-red-400">
          VeriWrite is only available in Microsoft Word.
        </Text>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto flex max-w-md flex-col gap-4">
        <header className="space-y-1">
          <Title3 block>VeriWrite Recorder</Title3>
        </header>

        <Card className="rounded-lg border border-slate-200 shadow-sm">
          <div className="flex flex-col gap-4 px-1 pb-1">
            <div className="flex items-center justify-between gap-3">
              <Badge appearance="tint" color={online ? "success" : "warning"}>
                {online ? "Online" : "Offline"}
              </Badge>
            </div>

            <Divider />

            <div className="grid grid-cols-2 gap-2">
              <Button
                appearance="primary"
                icon={<RecordRegular />}
                disabled={recording || !isWord}
                onClick={handleStart}
              >
                Start
              </Button>
              <Button icon={<StopRegular />} disabled={!recording} onClick={handleStop}>
                Stop
              </Button>
            </div>

            <Button icon={<ArrowDownloadRegular />} onClick={downloadJSON}>
              Export local record
            </Button>

            {(statusMessage || retryMessage) && (
              <div className="rounded-md bg-slate-100 px-3 py-2">
                {statusMessage && <Text block>{statusMessage}</Text>}
                {retryMessage && (
                  <Text block className="text-slate-600">
                    {retryMessage}
                  </Text>
                )}
              </div>
            )}
          </div>
        </Card>
      </section>
    </main>
  );
}
