from ollama import chat
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Any
import json
from datetime import datetime
from copy import deepcopy


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class DocReportSection(BaseModel):
    title: str
    analysis: str


class DocReportSchema(BaseModel):
    overview: DocReportSection
    timeline: DocReportSection
    edit: DocReportSection
    continuity: DocReportSection


class DocReportRequest(BaseModel):
    documentStats: dict[str, Any]


def format_timestamp(ms: int | float) -> str:
    return datetime.fromtimestamp(ms / 1000).strftime("%Y-%m-%d-%H-%M")


def format_duration(ms: int | float) -> str:
    total_minutes = max(0, round(ms / 60000))
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{hours} hours {minutes} minutes"


def reformat_doc_stats(doc_stats):
    formatted = deepcopy(doc_stats)
    timeline = formatted.get("timeline", {})
    continuity = formatted.get("continuity", {})

    for key in ("docStartTs", "docEndTs"):
        if isinstance(timeline.get(key), (int, float)):
            timeline[key] = format_timestamp(timeline[key])

    for key in ("docSpanTs", "durationTs"):
        if isinstance(timeline.get(key), (int, float)):
            timeline[key] = format_duration(timeline[key])

    durations_graph = timeline.get("durationsGraph")
    if isinstance(durations_graph, dict) and isinstance(durations_graph.get("y"), list):
        durations_graph["y"] = [
            format_duration(ms) if isinstance(ms, (int, float)) else ms
            for ms in durations_graph["y"]
        ]

    for gap in continuity.get("gaps", []):
        if isinstance(gap, dict) and isinstance(gap.get("gapMs"), (int, float)):
            gap["gapMs"] = format_duration(gap["gapMs"])

    return formatted



@app.get("/api/doc-report")
async def doc_report_health():
    return {"ok": True}


@app.post("/api/doc-report")
async def gen_doc_report(req: DocReportRequest):
    prompt = {
        "task": "Generate a neutral document-level report.",
        "documentStats": reformat_doc_stats(req.documentStats),
    }
    system_prompt = """
    You are a document-level statistics reporter for VeriWrite.

    Your role is to convert structured document statistics into clear, natural English summaries.

    You must follow these rules:
    - Only describe facts that are directly supported by the input data.
    - Do not make claims about whether the text is human-written, AI-generated, authentic, original, suspicious, or fraudulent.
    - Do not exaggerate or add persuasive language.
    - Do not perform calculations
    - Do not invent causes, explanations, or thresholds that are not present in the input.
    - Use plain, concrete English.
    - Prefer direct phrasing such as "the document was written across 6 active days" over technical jargon.
    - If a metric is approximate or interpretation-limited, describe it cautiously.
    - Return valid JSON only.

    For each section:
    - "title" should be short and neutral.
    - "analysis" should be at least 3 sentences.
    - Use only the provided statistics.
    - Avoid repeating exact metric names unless necessary.
    """
    schema = DocReportSchema.model_json_schema()

    try:
        response = chat(
            model="gemma4:e4b",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": json.dumps(prompt),
                },
            ],
            format=schema,
        )
        message = response.get("message") if isinstance(response, dict) else response.message
        raw_content = message.get("content") if isinstance(message, dict) else message.content
        content = json.loads(raw_content)
        return DocReportSchema.model_validate(content)
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err)) from err
