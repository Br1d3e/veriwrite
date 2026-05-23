import { useState } from "react";
import StatsHeading from "./StatsHeading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SERVER_IP = "http://127.0.0.1:8000/api";

export function DocReport({ docStats, className }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState({});

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
            `${SERVER_IP}/doc-report`,
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
            className="mx-2 gap-2 my-2"
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
            className="mx-2 gap-2 my-2"
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
      {/* 
      <Card
        className="mx-2 gap-2 my-2"
        hidden={
          status === "idle" ||
          status !== "done" ||
          error ||
          Object.keys(result).length === 0
        }
      >
        <CardContent>{renderDocReport(result)}</CardContent>
      </Card> */}
    </div>
  );
}

async function handleReport(
  statsPayload,
  path,
  setStatus,
  setError,
  setResult,
) {
  try {
    setStatus("generating");
    setError("");
    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(statsPayload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.detail || `HTTP ${res.status}`);
    }
    setResult(data);
    setStatus("done");
  } catch (err) {
    setError(err.message || "Failed to generate report.");
    setStatus("idle");
  }
}

// function renderDocReport(report) {
//   return (
//     <div className="grid">
//       {genReportSection("Overview", report.overview)}
//       {genReportSection("Timeline", report.timeline)}
//       {genReportSection("Edit", report.edit)}
//       {genReportSection("Continuity", report.continuity)}
//     </div>
//   );
// }

function genReportSection(sectionTitle, section) {
  const title = section?.title ? section?.title : sectionTitle;
  const content = section?.analysis || section?.observation || "";

  return (
    <section className="grid gap-1">
      <h3 className="font-semibold mx-1">{title}</h3>
      <Separator />
      <p className="mx-1 font-serif leading-loose text-muted-foreground">
        {content}
      </p>
    </section>
  );
}
