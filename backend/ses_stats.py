from pydantic import BaseModel
from typing import Any
from llm import gen_report
from utils import format_timestamp, format_duration
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

    print(overview)

    # pasteIns
    pasteIns = interpret.get("pasteIns", [])

    for paste in pasteIns:
        for key in ("evIdx", "dt", "startPos", "endPos"):
           if isinstance(paste.get(key), int):
               paste.pop(key, None)
        if isinstance(paste.get("lvl"), str):
            if paste.get("lvl") == "high":
                overview["interpretation"] = "More likely to be pasted insertion."
            elif paste.get("lvl") == "medium":
                overview["interpretation"] = "Less likely to be pasted insertion."

        if isinstance(paste.get("tags"), list):
            paste["tags"] = ", ".join(paste["tags"])
    
    # interpret["pasteCount"] = f"{len(pasteIns)} total detected paste insertions in the session."

    # writingFlow
    writingFlow = interpret.get("flow", {})

    linearity = writingFlow.get("linearity", {})
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
    

    smoothness = writingFlow.get("smoothness", {})
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

    writingFlow.pop("graph", None)
    writingFlow.pop("interruptProfile", None)
    # interrupt = writingFlow.get("interruptProfile", {})
    
    # revisionIntensity
    revisionIntensity = interpret.get("revisionIntensity", {})

    revRatios = revisionIntensity.get("revRatios", {})
    for key in ("replace", "pureDel", "btIns"):
        if isinstance(revRatios.get(key), (int, float)):
            revRatios.pop(key, None)
    if isinstance(revRatios.get("delIns"), (int, float)):
        revRatios["delIns"] = f"Total deleted characters / total inserted characters is {revRatios['delIns'] * 100:.1f}%"
    if isinstance(revRatios.get("total"), (int, float)):
        revRatios["total"] = f"Revised characters / total input is {revRatios['total'] * 100:.1f}%"
    
    # ignore productProcess similarity in report
    revisionIntensity.pop("productProcessSim", None)

    # productProcessSim = revisionIntensity.get("productProcessSim", {})

    # sim_metrics = productProcessSim.get("simMetrics", {})
    # productProcessSim.pop("graph", None)

    print(f"[ses-report]: formatted writingFlow: {writingFlow}")
    print(f"[ses-report]: formatted revInt: {revisionIntensity}")
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
- Each section should focus on one or two meaningful patterns, not a full recap of the input data.
- Use numbers selectively, only when they support the main point of that section.
- Use no more than 2 number metrics in each section.
- Prefer using more human-readable metrics like word count and active writing time to character counts
- Prefer pattern-first writing: state the pattern first, then support it with one or two numbers.
- Do not repeat metric values unless they are essential.
- Do not duplicate the main content of the overview, timeline, edit, or continuity sections.
- "title" should be short and neutral. You must describe **only** the given "overview", "pasteIns", "writingFlow, "revisionIntensity" stats
- "observation" should be 3~4 sentences
- Use plain, concrete English.
- Return valid JSON only.

Section Goal:
- overview: describe the overall formation pattern of the session.
- pasteIns: analyze possible paste insertions in the session. If no paste insertions are detected, skip and simply say "No paste insertions were detected during this session." 
You must declare that paste insertion detection might not be fully accurate. You must not say the session relies on paste insertions simply because the pasteCount seems large.
- writingFlow: describe whether the development of session was linear and smooth over time.
- revisionIntensity: describe how much of the text is being revised in the session.
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
