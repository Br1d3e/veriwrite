from ollama import chat
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Any
import json
from datetime import datetime
from copy import deepcopy
import asyncio
from pathlib import Path


LOCAL = False

load_dotenv()
load_dotenv(Path(__file__).resolve().parent / ".env", override=False)

API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemma-4-31b-it")
REQUEST_TIMEOUT_SECONDS = 120
REQUEST_TIMEOUT_MS = REQUEST_TIMEOUT_SECONDS * 1000

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
    edit = formatted.get("edit", {})
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
        if not isinstance(gap, dict):
            continue
        if isinstance(gap.get("gapMs"), (int, float)):
            gap["gapMs"] = format_duration(gap["gapMs"])
        # gap.pop("textPatch", None)

    # These arrays can get large and are not needed for the report narrative.
    # edit.pop("heatmap", None)

    return formatted


def strip_json_fence(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines:
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        return "\n".join(lines).strip()
    return cleaned


def extract_first_json_object(text: str) -> str:
    cleaned = strip_json_fence(text)
    start = cleaned.find("{")
    if start < 0:
        return cleaned

    depth = 0
    in_string = False
    escaped = False
    for i in range(start, len(cleaned)):
        ch = cleaned[i]
        if escaped:
            escaped = False
            continue
        if ch == "\\":
            escaped = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return cleaned[start:i + 1]
    return cleaned[start:]


@app.get("/api/doc-report")
async def doc_report_health():
    return {
        "ok": True,
        "provider": "ollama" if LOCAL else "google-genai",
        "model": "gemma4:e4b" if LOCAL else GEMINI_MODEL,
        "apiKeyConfigured": bool(API_KEY),
        "timeoutSeconds": REQUEST_TIMEOUT_SECONDS,
    }


@app.post("/api/doc-report")
async def gen_doc_report(req: DocReportRequest):
    print("[doc-report] request received")
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
    - Use no more than 2 number metrics in each section.
    - Prefer using more human-readable metrics like word count and active writing time to character counts
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

    def generate_raw_content():
        if LOCAL:
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
                think=False,
                stream=False,
            )
            message = response.get("message") if isinstance(response, dict) else response.message
            return message.get("content") if isinstance(message, dict) else message.content

        if not API_KEY:
            raise ValueError("Missing GEMINI_API_KEY")

        print(f"[doc-report] calling Google GenAI model={GEMINI_MODEL}")
        client = genai.Client(
            api_key=API_KEY,
            http_options=types.HttpOptions(
                timeout=REQUEST_TIMEOUT_MS,
                retry_options=types.HttpRetryOptions(
                    attempts=1,
                    http_status_codes=[408, 429, 500, 502, 503, 504],
                ),
            ),
        )

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=json.dumps(prompt),
            config=types.GenerateContentConfig(
                temperature=0.1,
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=DocReportSchema,
            )
        )
        print("[doc-report] Google GenAI response received")
        if response.candidates:
            print(f"[doc-report] finish reason: {response.candidates[0].finish_reason}")
        if response.parsed:
            return response.parsed
        return response.text

    try:
        raw_content = await asyncio.wait_for(
            asyncio.to_thread(generate_raw_content),
            timeout=REQUEST_TIMEOUT_SECONDS + 5,
        )
        if isinstance(raw_content, DocReportSchema):
            content = raw_content
        elif isinstance(raw_content, dict):
            content = DocReportSchema.model_validate(raw_content)
        else:
            json_content = extract_first_json_object(raw_content)
            try:
                content = DocReportSchema.model_validate_json(json_content)
            except Exception as parse_err:
                preview = raw_content[:500] if isinstance(raw_content, str) else repr(raw_content)
                raise ValueError(f"Failed to parse Gemini response JSON: {parse_err}. Response preview: {preview}") from parse_err
        print("[doc-report] report generated")
        return content
    except TimeoutError as err:
        print("[doc-report] timed out")
        raise HTTPException(
            status_code=504,
            detail=f"Document report generation timed out after {REQUEST_TIMEOUT_SECONDS} seconds.",
        ) from err
    except Exception as err:
        print(f"[doc-report] failed: {err}")
        raise HTTPException(status_code=500, detail=str(err)) from err
