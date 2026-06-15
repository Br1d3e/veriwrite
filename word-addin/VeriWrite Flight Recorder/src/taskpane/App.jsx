import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Divider,
  Text,
  Title3,
  MessageBar,
  Switch,
} from "@fluentui/react-components";
import {
  ArrowDownloadRegular,
  RecordRegular,
  StopRegular,
  Record16Regular,
} from "@fluentui/react-icons";
import {
  getFlightRecord,
  getOnlineStatus,
  getRetryStatus,
  getSessionInfo,
  getPostState,
  refreshOnlineStatus,
  setOnlineMode,
  startRecording,
  stopRecording,
  isFileReady,
} from "./modules/recorder";
import { loadSettingById, updateSettings } from "./modules/store";
import { useInterval } from "./hooks/useInterval";
import { useTimeout } from "./hooks/useTimeout";
import { downloadVwContainer, downloadJSON } from "./modules/export";

const AUTO_MESSAGE_MS = 6000;

function isWordHost(info) {
  return info?.host === window.Office?.HostType?.Word || info?.host === "Word";
}

function formatRetryStatus(retryStatus) {
  if (!retryStatus) return "";
  if (retryStatus.retrying) {
    const seconds = Math.round((retryStatus.retryMs || 0) / 1000);
    return `Reconnecting to record server... ${seconds}s`;
  }
  return "Internet unavailable. Recording in offline mode.";
}

export function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  if (totalMinutes < 1) {
    return `${Math.floor(ms / 1000)}s`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

export default function App({ officeInfo = null }) {
  const [officeReady, setOfficeReady] = useState(Boolean(officeInfo));
  const [isWord, setIsWord] = useState(isWordHost(officeInfo));
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [online, setOnline] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [retryMessage, setRetryMessage] = useState("");
  const [autoRecord, setAutoRecord] = useState(false);
  const [recordedOnce, setRecordedOnce] = useState(false);
  const lastOnlineRef = useRef(null);
  const lastRetryRef = useRef("");
  const [hasRecord, setHasRecord] = useState(false);

  useEffect(() => {
    if (officeInfo) {
      setOfficeReady(true);
      setIsWord(isWordHost(officeInfo));
      const currentOnline = getOnlineStatus();
      lastOnlineRef.current = currentOnline;
      setOnline(currentOnline);
      refreshOnlineStatus().then((nextOnline) => {
        lastOnlineRef.current = nextOnline;
        setOnline(nextOnline);
      });
      handleAutoStartDefault();
      return;
    }

    if (!window.Office?.onReady) return;
    window.Office.onReady((info) => {
      setOfficeReady(true);
      setIsWord(isWordHost(info));
      const currentOnline = getOnlineStatus();
      lastOnlineRef.current = currentOnline;
      setOnline(currentOnline);
      refreshOnlineStatus().then((nextOnline) => {
        lastOnlineRef.current = nextOnline;
        setOnline(nextOnline);
      });
      handleAutoStartDefault();
    });
  }, [officeInfo]);

  useInterval(() => {
    const retryStatus = getRetryStatus();
    const retryKey = retryStatus
      ? `${retryStatus.retrying ? "retrying" : "offline"}:${retryStatus.error || ""}`
      : "";
    if (retryKey !== lastRetryRef.current) {
      lastRetryRef.current = retryKey;
      setRetryMessage(formatRetryStatus(retryStatus));
    }
    if (retryStatus?.retrying !== true) {
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
    }
  }, 1000);

  useTimeout(
    () => {
      setStatusMessage("");
    },
    statusMessage ? AUTO_MESSAGE_MS : null
  );

  useTimeout(
    () => {
      setRetryMessage("");
    },
    retryMessage ? AUTO_MESSAGE_MS : null
  );

  useEffect(() => {
    if (!isWord || !autoRecord || recording || recordedOnce) return;

    setStarting(true);
    setStatusMessage("Recording started automatically.");
    startRecording()
      .then(() => {
        setRecording(true);
      })
      .catch((err) => {
        setRecording(false);
        setStatusMessage(`Start recording failed. ${err}`);
      })
      .finally(() => {
        setStarting(false);
        setRecordedOnce(true);
      });
  }, [isWord, autoRecord, recording]);

  async function handleAutoStartDefault() {
    try {
      const autoRecordSetting = await loadSettingById("autoRec");
      const nextAutoRecord = autoRecordSetting === true || autoRecordSetting === "true";
      setAutoRecord(nextAutoRecord);
      return nextAutoRecord;
    } catch (err) {
      setStatusMessage(`Load user profile failed. ${err}`);
      setAutoRecord(false);
      return false;
    }
  }

  async function handleAutoStartChange(_, data) {
    const value = data.checked;
    setAutoRecord(value);
    if (!value) {
      setRecordedOnce(false);
    }
    await updateSettings("autoRec", value).catch((err) => {
      setStatusMessage(`Save user profile failed. ${err}`);
    });
  }

  async function handleStart() {
    setStarting(true);
    setStatusMessage("Recording has started locally. Waiting for server response...");
    try {
      await startRecording();
      setRecording(true);
    } catch (err) {
      setStatusMessage(`Start recording failed. ${err}`);
    } finally {
      setStarting(false);
    }
  }

  async function handleStop() {
    setStopping(true);
    let stopResult = null;
    setStatusMessage(
      "Recording has stopped. Do not close Word yet. Waiting for server response..."
    );
    try {
      stopResult = await stopRecording();
      if (stopResult?.status === "WAITING_FOR_SERVER_SESSION") {
        setStatusMessage(stopResult.message);
      } else {
        setStatusMessage("Recording stopped and saved.");
      }
    } catch (err) {
      setStatusMessage(`Stop recording failed. ${err}`);
    } finally {
      setStopping(false);
      if (stopResult?.status !== "WAITING_FOR_SERVER_SESSION") {
        setRecording(false);
        setEvCount(0);
        setTimeElapsedMs(0);
      }
      const record = getFlightRecord();
      setHasRecord(isFileReady() && !!record && Object.keys(record).length > 0);

      // if (!getOnlineStatus()) {
      //   downloadJSON();
      // }
    }
  }

  const [evCount, setEvCount] = useState(0);
  const [timeElapsedMs, setTimeElapsedMs] = useState(0);
  const [pending, setPending] = useState(false);
  const [bufferedEv, setBufferedEv] = useState(0);
  const [pendingSessions, setPendingSessions] = useState(0);
  const [pendingEv, setPendingEv] = useState(0);
  const [postedBlocks, setPostedBlocks] = useState(0);

  useInterval(() => {
    if (!recording) return;
    const sessionInfo = getSessionInfo();
    setEvCount(sessionInfo.evCount);
    setTimeElapsedMs(sessionInfo.timeElapsedMs);
    const postState = getPostState();
    setPending(postState.pending);
    setBufferedEv(postState.bufferedEv);
    setPendingEv(postState.pendingEv);
    setPendingSessions(postState.pendingSessions);
    setPostedBlocks(postState.postedBlocks);
  }, 500);

  if (!officeReady) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
        <Text block>Loading VeriWrite Recorder...</Text>
      </main>
    );
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
            <Divider />

            <div className="flex items-center px-1 gap-1">
              <Record16Regular color={recording ? "red" : "lightGreen"} />
              <Text className={recording ? "text-red-600" : "text-green-600"}>
                {recording ? "Recording" : "Ready"}
              </Text>
            </div>

            <div className="flex flex-col gap-2 px-1 pb-1 text-slate-500">
              <Text>Session time: {formatDuration(timeElapsedMs)}</Text>
              <Text>Recorded events: {evCount}</Text>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                appearance="primary"
                icon={<RecordRegular />}
                disabled={recording || starting || !isWord}
                onClick={handleStart}
              >
                {starting ? "Starting..." : "Start"}
              </Button>
              <Button icon={<StopRegular />} disabled={!recording || stopping} onClick={handleStop}>
                {stopping ? "Stopping..." : "Stop"}
              </Button>
            </div>

            <Button
              icon={<ArrowDownloadRegular />}
              disabled={!(hasRecord && !recording)}
              onClick={() => downloadVwContainer(getFlightRecord())}
            >
              Export local record
            </Button>

            {/* <Button
              icon={<ArrowDownloadRegular />}
              disabled={!(hasRecord && !recording)}
              onClick={() => downloadJSON(getFlightRecord())}
            >
              [Dev] Export .json
            </Button> */}

            <Divider />

            <section className="">
              <div className="flex items-center justify-between gap-2 py-2">
                <Badge appearance="tint" color={online ? "success" : "warning"}>
                  {online ? "Online" : "Offline"}
                </Badge>
              </div>
              {online ? (
                <div className="flex flex-col gap-2 px-1 pb-1 text-slate-500">
                  <Text font="monospace">This session is protected by server verification.</Text>
                  <Text>Blocks sent: {postedBlocks}</Text>
                  <Text>Pending events: {bufferedEv}</Text>
                </div>
              ) : (
                <div className="flex flex-col gap-2 px-1 pb-1 text-slate-500">
                  <Text font="monospace">
                    Recording continues locally. It will sync when the server is available.
                  </Text>
                  {pending && (
                    <>
                      <Text>Pending sessions: {pendingSessions}</Text>
                      <Text>Pending events: {bufferedEv}</Text>
                    </>
                  )}
                </div>
              )}
            </section>

            <Divider />

            <Switch
              label="Auto-start recording"
              checked={autoRecord}
              onChange={handleAutoStartChange}
            ></Switch>

            {(statusMessage || retryMessage) && (
              <div className="rounded-md bg-slate-10 px-1 py-1">
                {statusMessage && <MessageBar className="bg-slate-100">{statusMessage}</MessageBar>}
                {retryMessage && (
                  // <Text block className="text-slate-600">
                  <MessageBar>{retryMessage}</MessageBar>
                  // </Text>
                )}
              </div>
            )}
          </div>
        </Card>
      </section>
    </main>
  );
}
