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
    - add descriptive adjectives to what you observe, instead of just listing numbers. For example, instead of saying "the document had 5 writing sessions", say "the document had several writing sessions".
    - Each section should focus on one or two meaningful patterns, not a full recap of the input data.
    - Use numbers selectively, only when they support the main point of that section.
    - Use no more than 2 number metrics in each section.
    - Prefer using more human-readable metrics like word count and active writing time to character counts
    - Prefer pattern writing: state the pattern more than numeric statistics, use no more than two numbers.
    - If numermic data is necessary, prefer stating in numbers rather than words.
    - Do not repeat metric values unless they are essential.
    - Do not duplicate the main content of the overview, timeline, edit, or continuity sections.
    - "title" should be short and neutral. You must describe **only** the given "overview", "timeline", "edit", "continuity" stats
    - "observation" should be 2~4 sentences
    - Name the "user" as "the student" in the report, and refer to the document as "the text" or "the writing".
    - Use plain, concrete English.
    - Return valid JSON only.

    Section Goal:
    - overview: describe the overall formation pattern of the document 
      - Did the document show signs of being developed gradually over time, or in a single concentrated sitting? Was it mostly stable, or heavily revised? \n
    - timeline: describe how the writing work was distributed over time 
      - Did the document form in a short period of time, or was it developed over a long time? Was the writing activity mostly concentrated in a few sessions, or spread out across many sessions? \n
    - edit: describe how the writing text was built and revised 
      - did the writer mostly add new text only, or did they also delete and revise existing text? Did they make many small edits, or a few big edits? Prefer mentioning "word count" and avoid "character count". Focus on describing the patterns of how the text was built and revised, rather than just listing the numbers of insertions and deletions. \n
    - continuity: describe whether the text transitions between sessions were mostly smooth or showed major jumps 
      - did the author mostly pick up where they left off, or did they often make big leaps in topic between sessions? 
        Focus on text differences rather than temporal gaps, but you can mention temporal gaps if they are extreme. 
        For text differences, focus on describing the patterns of how the text changed between sessions, 
        rather than just listing the numbers of changed words. Did they mostly make small edits that only changed a few words, 
        or did they often make big edits that changed large sections of text? 

    Good Examples:
    "The document was developed gradually over several days rather than in a single concentrated sitting. 
    Its recorded activity was spread across repeated sessions, suggesting a stop-and-return writing pattern."


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
