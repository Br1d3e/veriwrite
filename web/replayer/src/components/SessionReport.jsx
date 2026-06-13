import { useState, useEffect, memo } from "react";
import StatsHeading from "./StatsHeading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  genReportSection,
  handleReport,
  storeSessionReportById,
  getSessionReportById,
} from "./LLMReports";
import { LLM_API_URL } from "@/lib/apiConfig.js";

export function SessionReport({ sessionStats, sid, className }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState({});
  const [resultSid, setResultSid] = useState(null);

  useEffect(() => {
    const report = getSessionReportById(sid);
    if (report) {
      setResult(report);
      setResultSid(sid);
      setStatus("done");
      setError("");
      return;
    }

    setResult({});
    setResultSid(null);
    setStatus("idle");
    setError("");
  }, [sid]);

  useEffect(() => {
    if (resultSid === sid && Object.keys(result).length > 0) {
      storeSessionReportById(sid, result);
    }
  }, [result, resultSid, sid]);

  return (
    <div className={`grid gap-2 ${className} mb-3`}>
      <StatsHeading text="Report" />
      <span className="text-muted-foreground text-sm">
        A general writing session statistics report from AI {"(LLM)"}.
      </span>
      <Button
        type="button"
        onClick={() =>
          handleReport(
            { sessionStats },
            `${LLM_API_URL}/ses-report`,
            setStatus,
            setError,
            setResult,
            () => setResultSid(sid),
          )
        }
        disabled={status === "generating"}
        className="cursor-pointer hover:bg-primary/80"
      >
        {status == "generating" ? "Generating..." : "Generate Report"}
      </Button>
      {error ? (
        <span className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </span>
      ) : null}
      <Tabs
        defaultValue="overview"
        className="gap-2"
        hidden={
          status === "idle" ||
          status !== "done" ||
          error ||
          Object.keys(result).length === 0
        }
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pasteIns">Paste</TabsTrigger>
          <TabsTrigger value="writingFlow">Flow</TabsTrigger>
          <TabsTrigger value="revisionIntensity">Revision</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card
            className="mx-2 gap-2"
            hidden={
              status === "idle" ||
              status !== "done" ||
              error ||
              Object.keys(result).length === 0
            }
          >
            <CardContent>
              {genReportSection("Overview", result.overview)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pasteIns">
          <Card
            className="mx-2 gap-2"
            hidden={
              status === "idle" ||
              status !== "done" ||
              error ||
              Object.keys(result).length === 0
            }
          >
            <CardContent>
              {genReportSection("Paste Insertions", result.pasteIns)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="writingFlow">
          <Card
            className="mx-2 gap-2"
            hidden={
              status === "idle" ||
              status !== "done" ||
              error ||
              Object.keys(result).length === 0
            }
          >
            <CardContent>
              {genReportSection("Writing Flow", result.writingFlow)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="revisionIntensity">
          <Card
            className="mx-2 gap-2"
            hidden={
              status === "idle" ||
              status !== "done" ||
              error ||
              Object.keys(result).length === 0
            }
          >
            <CardContent>
              {genReportSection("Revision Intensity", result.revisionIntensity)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default memo(SessionReport, (prev, next) => {
  return prev.sessionStats === next.sessionStats && prev.sid === next.sid;
});
