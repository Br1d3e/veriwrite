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
    observation: str


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
    - Do not turn each section into a list of metrics.
    - Do not invent numbers, statistics
    - Use only the given facts
    - Each section should focus on one or two meaningful patterns, not a full recap of the input data.
    - Use numbers selectively, only when they support the main point of that section.
    - Use no more than 3 number metrics in each section.
    - Prefer pattern-first writing: state the pattern first, then support it with one or two numbers.
    - Do not repeat metric values unless they are essential.
    - Do not duplicate the main content of the overview, timeline, edit, or continuity sections.
    - "title" should be short and neutral. You must describe **only** the given "overview", "timeline", "edit", "continuity" stats
    - "observation" should be 2~4 sentences
    - Use plain, concrete English.
    - Return valid JSON only.

    Section Goal:
    - overview: describe the overall formation pattern of the document
    - timeline: describe how the work was distributed over time.
    - edit: describe how the text was built and revised.
    - continuity: describe whether transitions between sessions were mostly smooth or showed major jumps.

    Good Examples:
    "The document was developed gradually over several days rather than in a single concentrated sitting. 
    Its recorded activity was spread across repeated sessions, suggesting a stop-and-return writing pattern."
    
    Bad Examples:
    "During editing, 30,071 characters were inserted and 13,830 were deleted, resulting in a net addition of 16,241 characters,"
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
