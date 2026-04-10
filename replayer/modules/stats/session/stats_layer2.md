# VeriWrite P2 — Layer 2 Research Objects

This document summarizes the current **Layer 2 research directions** for VeriWrite.

Layer 2 is not about raw descriptive statistics.
Instead, it tries to produce **higher-level interpretations** built on top of Layer 1 evidence.

At the current stage, the three main Layer 2 research objects are:

1. Paste-like Insertion Count
2. Flow Smoothness
3. Revision Intensity

---

## 1. Paste-like Insertion Count

### Research object
This metric studies whether a session contains **one or more unusually large one-step insertions** that resemble pasted or otherwise bulk-entered text.

### Core question
How many events in this session look like **paste-like insertion events**?

### Why it matters
This helps describe whether the writing process includes:
- mostly small incremental insertions, or
- multiple large insertion bursts

It is useful because one-step large insertions are often the most visually obvious non-ordinary writing pattern.

### Evidence likely used
This Layer 2 metric is expected to build on Layer 1 evidence such as:
- maximum insertion length
- insertion length percentiles
- count of large insertion events
- proportion of inserted text contributed by large insertion events
- possibly event timing (`dt`) if a timing condition is added

### Output form
Most naturally expressed as:
- a count
- or a count plus a simple strength/level

### Important boundary
This should be treated as **paste-like**, not definitive paste detection.
It describes a pattern in the event stream, not a guaranteed clipboard action.

---

## 2. Flow Smoothness

### Research object
This metric studies whether text production over time is **smooth and continuous**, or instead **stop-and-go with frequent pauses**.

### Core question
Does the session look like a smooth writing flow, or a pause-heavy production process?

### Why it matters
This helps describe the temporal rhythm of writing:
- highly smooth sessions may look like continuous output,
- while lower smoothness suggests pauses, thinking gaps, or uneven production.

This is a **time-domain** behavior metric, not a position-domain metric.

### Evidence likely used
This Layer 2 metric is expected to build on:
- inter-event time gaps (`dt`)
- pause counts / long pauses
- high-percentile rhythm metrics such as `dtP95`
- cumulative text production over time
- possibly a normalized production curve compared against an idealized smooth baseline

### Output form
Most naturally expressed as:
- a smoothness score
- a low / medium / high flow profile
- or a curve-based summary

### Important boundary
This is **not** a writing quality score.
It does not mean that pausing is good or bad.
It only describes how smoothly text output unfolds over time.
**!! if pause to look AI-generated content and type it in document, linearity is still low!!**

---

## 3. Revision Intensity

### Research object
This metric studies how heavily the text is revised during writing.

### Core question
Does the session involve light editing, or substantial revision activity?

### Why it matters
This helps characterize whether the writing process is:
- mostly straightforward drafting, or
- strongly shaped by deletion, replacement, and revision

It gives a separate dimension from flow rhythm:
a session can be smooth but still heavily revised, or pause-heavy but lightly revised.

### Evidence likely used
This Layer 2 metric is expected to build on Layer 1 evidence such as:
- total deleted characters
- replace-like event count
- delete / insert ratio
- possibly other future revision-distribution measures

### Output form
Most naturally expressed as:
- an intensity score
- or a low / medium / high revision level

### Important boundary
This does not judge whether the writing is good or bad.
It only describes how much revision activity occurred.

---

## Summary

These three Layer 2 research objects cover three different aspects of writing behavior:

- **Paste-like Insertion Count:** large one-step insertion behavior
- **Flow Smoothness:** temporal smoothness of output over time
- **Revision Intensity:** strength of revision activity

Together, they form a compact first set of Layer 2 interpretations built on top of Layer 1 statistics.
