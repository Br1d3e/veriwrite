import { useState, useEffect, memo } from "react";
import StatsHeading from "./StatsHeading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  genReportSection,
  handleReport,
  storeDocReportById,
  getDocReportById,
} from "./LLMReports";
import { LLM_API_URL } from "@/lib/apiConfig.js";

export function DocReport({ docStats, docId, className }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState({});

  useEffect(() => {
    if (Object.keys(result).length > 0) {
      storeDocReportById(docId, result);
    }
  }, [result, docId]);

  useEffect(() => {
    if (Object.keys(result).length === 0) {
      const report = getDocReportById(docId);
      if (report) {
        setResult(report);
        setStatus("done");
        setError("");
      }
    }
  }, [result, docId]);

  return (
    <div className={`grid gap-2 ${className} mb-3`}>
      <StatsHeading text="Report" />
      <span className="text-muted-foreground text-sm">
        A general document statistics report from AI {"(LLM)"}.
      </span>
      <Button
        type="button"
        onClick={() =>
          handleReport(
            { documentStats: docStats },
            `${LLM_API_URL}/doc-report`,
            setStatus,
            setError,
            setResult,
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
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="continuity">Continuity</TabsTrigger>
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
        <TabsContent value="timeline">
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
              {genReportSection("Timeline", result.timeline)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="edit">
          <Card
            className="mx-2 gap-2"
            hidden={
              status === "idle" ||
              status !== "done" ||
              error ||
              Object.keys(result).length === 0
            }
          >
            <CardContent>{genReportSection("Edit", result.edit)}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="continuity">
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
              {genReportSection("Continuity", result.continuity)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default memo(DocReport, (prev, next) => {
  return prev.docStats === next.docStats && prev.docId === next.docId;
});
