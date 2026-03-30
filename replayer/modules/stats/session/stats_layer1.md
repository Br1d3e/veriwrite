# VeriWrite Layer 1 Metrics Summary (v2)

This document summarizes the current **Layer 1 objective session statistics** implemented in `stats.js`.

Layer 1 only describes **what happened in a session**. It does **not** perform interpretation, scoring, or classification.

---

## Scope

- Unit of analysis: **single session**
- Input: one session from `flightRecord.sessions`
- Output groups:
  1. Overview
  2. Time / Rhythm
  3. Edit Size
  4. Edit Position

---

## 1. Overview

These metrics describe the overall size of a session.

### `durationMs`
- Meaning: total session duration
- Computation: `session.tn - session.t0`
- Unit: milliseconds

### `evCount`
- Meaning: total number of edit events in the session
- Computation: `ev.length`
- Unit: count

### `insChars`
- Meaning: total inserted characters across the session
- Computation: sum of `ins.length` over all events
- Unit: characters

### `delChars`
- Meaning: total deleted characters across the session
- Computation: sum of `delLen` over all events
- Unit: characters

### `netChars`
- Meaning: net text growth during the session
- Computation: sum of `(ins.length - delLen)` over all events
- Unit: characters

### `replaceEv`
- Meaning: number of replace-like events
- Computation: count events where `delLen > 0` and `ins.length > 0`
- Unit: count

---

## 2. Time / Rhythm

These metrics describe the time pattern of editing behavior.

Notes:
- The first event is excluded from `dt` statistics.
- `dt` is taken from `ev[i][0]`.
- A histogram is used for percentile lookup.

### `dtMedian`
- Meaning: median inter-event time gap
- Computation: median of `dt` values from events `i = 1 ... n-1`
- Unit: milliseconds

### `dtP90`
- Meaning: 90th percentile of inter-event time gaps
- Computation: 90th percentile of valid `dt` values
- Unit: milliseconds

### `dtP95`
- Meaning: 95th percentile of inter-event time gaps
- Computation: 95th percentile of valid `dt` values
- Unit: milliseconds

### `dtMax`
- Meaning: largest observed inter-event time gap
- Computation: maximum `dt` among events `i = 1 ... n-1`
- Unit: milliseconds

### `pause5sCount`
- Meaning: number of long pauses of at least 5 seconds
- Computation: count events where `dt >= 5000`
- Unit: count

---

## 3. Edit Size

These metrics describe the size of single insert/delete operations.

Notes:
- Insert and delete distributions are tracked separately.
- Percentiles are intended to reflect non-zero insert/delete events.
- A histogram with an overflow bucket is used.

### `maxInsertLen`
- Meaning: largest single insertion length
- Computation: maximum `ins.length` across all events
- Unit: characters

### `insertLenP90`
- Meaning: 90th percentile of insertion lengths
- Computation: percentile over insertion-length distribution
- Unit: characters

### `insertLenP95`
- Meaning: 95th percentile of insertion lengths
- Computation: percentile over insertion-length distribution
- Unit: characters

### `maxDeleteLen`
- Meaning: largest single deletion length
- Computation: maximum `delLen` across all events
- Unit: characters

### `deleteLenP90`
- Meaning: 90th percentile of deletion lengths
- Computation: percentile over deletion-length distribution
- Unit: characters

### `deleteLenP95`
- Meaning: 95th percentile of deletion lengths
- Computation: percentile over deletion-length distribution
- Unit: characters

---

## 4. Edit Position

These metrics describe where edits occur in relative-position terms.

Notes:
- Current text length is dynamically maintained from `session.init.length`.
- Relative position is computed event-by-event using the current document length before the event update.
- This group is still more experimental than the first three groups.

### `editPosMean`
- Meaning: average relative edit position within the session text state
- Computation:
  - start from `currentLen = init.length`
  - for each event, compute `posRel = pos / currentLen`
  - update `currentLen = currentLen + insLen - delLen`
  - average all `posRel`
- Unit: ratio in principle (session-relative position)

### `editPosStd`
- Meaning: dispersion of relative edit positions
- Computation:
  - recompute event-by-event `posRel`
  - calculate standard deviation around `editPosMean`
- Unit: ratio in principle

### `backtrack`
- Meaning: number of clear backward jumps in edit position
- Computation: count events where `prev - pos - delLen >= btThres`
- Current threshold: `10` characters
- Unit: count

---

## Current Layer 1 Structure

The current `calSession(sid)` output contains:

- `overview`
- `rhythm`
- `editSize`
- `editPos`

---

## Stability Notes

### Most stable groups
- Overview
- Time / Rhythm
- Edit Size

These are the strongest Layer 1 objective metrics because they are easy to compute and easy to explain.

### More experimental group
- Edit Position

This group is now more coherent than before because it uses **relative position with dynamically maintained current length**, but it is still more sensitive to definition choices than the other groups.

---

## Non-goals of Layer 1

Layer 1 does **not** do any of the following:

- AI / human classification
- suspiciousness scoring
- paste detection
- interpretation labels
- writing-quality judgment

Those belong to **Layer 2**, not Layer 1.
