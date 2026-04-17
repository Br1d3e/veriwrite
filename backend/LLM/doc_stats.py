from pydantic import BaseModel
from typing import Any
from backend.LLM.llm import gen_report
from backend.LLM.utils import format_timestamp, format_duration
from copy import deepcopy
from fastapi import APIRouter

router = APIRouter()

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

    edit.pop("heatmap", None)

    return formatted


DOC_SYSTEM_PROMPT = """
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


@router.post("/api/doc-report")
async def gen_doc_report(req: DocReportRequest):
    prompt = {
            "task": "Generate a neutral document-level report.",
            "documentStats": reformat_doc_stats(req.documentStats),
        }

    return await gen_report(
        route_name="doc-report",
        prompt=prompt,
        system_prompt=DOC_SYSTEM_PROMPT,
        response_schema=DocReportSchema,
        local_model="gemma4:e4b",
    )
