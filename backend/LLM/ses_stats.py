from pydantic import BaseModel
from typing import Any
try:
    from backend.LLM.llm import gen_report
    from backend.LLM.utils import format_timestamp, format_duration
except ModuleNotFoundError:
    from LLM.llm import gen_report
    from LLM.utils import format_timestamp, format_duration
from copy import deepcopy
from fastapi import APIRouter

router = APIRouter()

class SessionReportRequest(BaseModel):
    sessionStats: dict[str, Any]

class SessionReportSection(BaseModel):
    title: str
    observation: str


class SessionReportSchema(BaseModel):
    overview: SessionReportSection
    pasteIns: SessionReportSection
    writingFlow: SessionReportSection
    revisionIntensity: SessionReportSection

def word_count(text: str) -> int:
    return len(text.strip().split())

def reformat_session_stats(session_stats):
    formatted = deepcopy(session_stats)
    desc = formatted.get("desc", {})
    interpret = formatted.get("interpret", {})

    # overview
    overview = desc.get("overview", {})

    for key in ("start", "end"):
        if isinstance(overview.get(key), int):
            overview[key] = format_timestamp(overview[key])
    if isinstance(overview.get("duration"), int):
        overview.pop("durationMs", None)
        overview["duration"] = format_duration(overview["duration"])
    
    for key in ("evCount", "replaceEv"):
        overview.pop(key, None)

    # pasteIns
    paste_ins = interpret.get("pasteIns", [])

    paste_len = 0
    for i in range(len(paste_ins)):
        paste = paste_ins[i]
        for key in ("evIdx", "dt", "startPos", "endPos", "rate"):
           if isinstance(paste.get(key), int | float):
               paste.pop(key, None)
        if isinstance(paste.get("lvl"), str):
            if paste.get("lvl") == "high":
                paste["possibility"] = "More likely to be pasted insertion."
            elif paste.get("lvl") == "medium":
                paste["possibility"] = "Less likely to be pasted insertion."

        tags = paste.get("tags", [])
        paste["word length"] = f"{word_count(paste.get('ins', ''))} words"
        paste_len += len(paste.get('ins', '').strip()) if "in-doc paste" not in paste.get("tags", []) else 0
        paste.pop("ins", None)

        if len(tags) > 0:
            paste["tags"] = ", ".join(paste["tags"])

    paste_interpret = (
        f"{paste_len} possible pasted characters out of {overview.get('insChars', 0)} total inserted characters." 
        if paste_len and overview.get('insChars') else "No significant pasted insertions detected based on character count."
    )

    paste_ins = {
        "pasteInsertions": paste_ins,
        "count": len(paste_ins),
        "interpretation": paste_interpret
    } if paste_ins else {
        "interpretation": "No paste insertions were detected during this session."
    }

    print(paste_ins)

    # writingFlow
    writing_flow = interpret.get("flow", {})

    linearity = writing_flow.get("linearity", {})
    for key in ("mad", "rmse", "maxDeviation"):
        if isinstance(linearity.get(key), (int, float)):
            linearity.pop(key, None)
    linearity_score = linearity.get("score", 0)
    if linearity_score >= 80:
        linearity["interpretation"] = "Highly linear: Writing progress remained close to a steady forward path. The session moved toward its final state with relatively little overall deviation."
    elif 80 > linearity_score >= 50:
        linearity["interpretation"] = "Moderately linear: Writing progress was generally forward-moving, but with some unevenness. The session shows a mostly direct path with noticeable pauses or bursts of change."
    elif 50 > linearity_score >= 20:
        linearity["interpretation"] = "Weakly linear: Writing progress deviated substantially from a steady path. The session appears more stop-and-go, with longer plateaus or more concentrated periods of change."
    elif 20 > linearity_score >= 0:
        linearity["interpretation"] = "Strongly irregular; Writing progress was highly uneven and far from a steady forward trajectory. The session is dominated by interruptions, delayed progress, or major shifts in when text was produced."
    

    smoothness = writing_flow.get("smoothness", {})
    for key in ("mad1stDeri", "mse2ndDeri"):
        if isinstance(smoothness.get(key), (int, float)):
            smoothness.pop(key, None)
    smoothness_score = smoothness.get("score", 0)
    if smoothness_score >= 60:
        smoothness["interpretation"] = "Smooth: Writing progress changed in a relatively stable and continuous way. Local writing flow shows limited abrupt variation."
    elif smoothness_score >= 30:
        smoothness["interpretation"] = "Moderately smooth: Writing progress was somewhat uneven at the local level. The session shows noticeable stop-and-go behavior or short-term fluctuations in writing pace."
    elif smoothness_score >= 0:
        smoothness["interpretation"] = "Rough: Writing progress changed in a highly uneven way. Local flow appears strongly bursty, with frequent sharp shifts in writing speed or extended pauses between advances."

    writing_flow.pop("graph", None)
    writing_flow.pop("interruptProfile", None)
    # interrupt = writingFlow.get("interruptProfile", {})
    
    # revisionIntensity
    revision_intensity = interpret.get("revisionIntensity", {})

    rev_ratios = revision_intensity.get("revRatios", {})
    for key in ("replace", "pureDel", "btIns"):
        if isinstance(rev_ratios.get(key), (int, float)):
            rev_ratios.pop(key, None)
    if isinstance(rev_ratios.get("delIns"), (int, float)):
        rev_ratios["delIns"] = f"Total deleted characters / total inserted characters is {rev_ratios['delIns'] * 100:.1f}%"
    if isinstance(rev_ratios.get("total"), (int, float)):
        rev_ratios["total"] = f"Revised characters / total input is {rev_ratios['total'] * 100:.1f}%"
    
    # ignore productProcess similarity in report
    revision_intensity.pop("productProcessSim", None)

    return formatted


SESSION_SYSTEM_PROMPT = """
You are a session-level statistics reporter for VeriWrite.
Your role is to convert structured session statistics into clear, natural English summaries.

You must follow these rules:
- Only describe facts that are directly supported by the input data.
- Do not make claims about whether the text is human-written, AI-generated, authentic, original, suspicious, or fraudulent.
- Do not exaggerate or add persuasive language.
- Do not perform calculations
- Do not invent causes, explanations, or thresholds that are not present in the input.
- Do not turn each section into a list of metrics.
- Do not invent numbers, statistics
- Use only the given facts and interpretation
- add descriptive adjectives to what you observe, instead of just listing numbers. For example, instead of saying "the session had 8 writing bursts", say "the session had several writing bursts".
- Each section should focus on one or two meaningful patterns, not a full recap of the input data.
- Use numbers selectively, only when they support the main point of that section.
- Use no more than 2 number metrics in each section.
- Prefer using more human-readable metrics like word count and active writing time to character counts
- Prefer pattern-first writing: state the pattern first, then support it with one or two numbers.
- Do not repeat metric values unless they are essential.
- Do not duplicate the main content of the overview, timeline, edit, or continuity sections.
- "title" should be short and neutral. You must describe **only** the given "overview", "pasteIns", "writingFlow, "revisionIntensity" stats
- "observation" should be 3~4 sentences
- Name the "user" as "the student" in the report, and refer to the document as "the text" or "the writing".
- Use plain, concrete English.
- Return valid JSON only.

Section Goal:
- overview: describe the overall formation pattern of the session.
    Do not repeat the same dates when describing session start and end. If the two dates appears to be the same day, simply say "The session took place on [date]" or mention the exact period in minutes.
- pasteIns: analyze possible paste insertions in the session. If no paste insertions are detected, skip and simply say "No paste insertions were detected during this session." 
    You must not say the session relies on paste insertions simply because the pasteCount seems large. 
    Focus more on the length (word count) of each paste insertion, instead of the count. 
    For example, if there are several paste insertions but each of them is very short, then it may not be appropriate to say the session relies on paste insertions. On the other hand, if there are one or two paste insertions and each of them is very long, then it may be more reasonable to say there're some paste insertions. 
    Describe the given interpretation of paste insertion likelihood, but use smoother words like "probably" or "possibly" and do not assert that the session is definitely relying on paste insertions.
    If tags include "in-doc paste", mention that the paste insertion appears to be from within the same document, rather than from external sources.
    If tags include "long pause", you should infer that the paste comes with thinking/pausing, or searching from external sources, rather than being a quick copy-paste action.
- writingFlow: describe whether the development of session was linear and smooth over time.
- revisionIntensity: describe how much of the text is being revised in the session.
    If the revision ratio is very high, you may say the session was heavily focused on revisions. 
    If the revision ratio is very low, you may say the session was mostly focused on new writing with less revisions. 
    If the revision ratio is moderate, you may say the session had a balanced mix of new writing and revisions.
"""

@router.post("/api/ses-report")
async def gen_session_report(req: SessionReportRequest):
    return await gen_report(
        route_name="ses-report",
        prompt={
            "task": "Generate a neutral session-level interpretation.",
            "sessionStats": reformat_session_stats(req.sessionStats),
        },
        system_prompt=SESSION_SYSTEM_PROMPT,
        response_schema=SessionReportSchema,
    )
