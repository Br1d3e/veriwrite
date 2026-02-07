# VeriWrite Flight Recorder — `flightrecord.json` v1 Spec (Commented)

This document defines the **compact** JSON format used by VeriWrite / Digital Flight Recorder (MVP).
Goal: **small file size** + **replayable writing process**.

---

## 1. File Overview

A recording file is a single JSON object with the following top-level keys:

```jsonc
{
  "v": 1,                       // (int) Schema version. Current: 1
  "m": {                        // (object) Metadata (short keys to reduce size)
    "t0": 1730000000000,        // (int) Start time in Unix epoch milliseconds
    "title": "Essay"            // (string, optional) Document title
  },
  "init": "",                   // (string) Initial full text at recording start (stored once)
  "ev": [                       // (array) Event stream (patch operations), in chronological order
    [0,   0, 0, "H"],            // [dt, pos, delLen, ins]
    [327, 1, 0, "e"]
  ],
  "kf": []                      // (array, optional) Keyframes for fast seeking; may be empty or omitted
}
```

> Notes:
> - We use **polling** in MVP to detect document changes reliably in Office.js Task Pane.
> - We store `init` once, then only store compact patches in `ev`.

---

## 2. Metadata (`m`)

```jsonc
"m": {
  "t0": 1730000000000,          // Start timestamp in ms (epoch)
  "title": "Essay"              // Optional document title
}
```

- `t0` is used as an absolute reference time.
- The event stream itself uses `dt` (delta time) to keep events compact.

---

## 3. Events (`ev`)

### 3.1 Event tuple definition

Each event is a fixed-length array:

```
[ dt, pos, delLen, ins ]
```

Where:

- `dt` (int): **milliseconds since the previous event**
  - First event typically uses `dt = 0`
- `pos` (int): **0-based character index** in the current text state (before applying this event)
- `delLen` (int): number of characters to delete at `pos`
- `ins` (string): string to insert at `pos` (empty string means insert nothing)

This single patch form supports insert/delete/replace without an `op` field.

### 3.2 Semantics (how to apply an event)

Given current text `s`:

1) Delete `delLen` chars starting at `pos`
2) Insert `ins` at `pos`

Equivalent pseudocode:

```js
function applyEvent(s, [dt, pos, delLen, ins]) {
  const before = s.slice(0, pos);
  const after  = s.slice(pos + delLen);
  return before + ins + after;
}
```

### 3.3 Examples

**Insert**
- Insert `"abc"` at position 10:

```jsonc
[120, 10, 0, "abc"]
```

**Delete**
- Delete 5 chars at position 3:

```jsonc
[90, 3, 5, ""]
```

**Replace**
- Replace 2 chars at position 7 with `"XYZ"`:

```jsonc
[250, 7, 2, "XYZ"]
```

---

## 4. Keyframes (`kf`) — optional

Keyframes speed up seeking (start replay from the middle without applying all events from the start).

Each keyframe is:

```
[ t, text ]
```

- `t` (int): milliseconds since `t0` (absolute offset, NOT delta)
- `text` (string): full document text at that time

Example:

```jsonc
"kf": [
  [5000, "Hello\nWorld"]
]
```

**MVP rule:** `kf` may be an empty array `[]` or omitted entirely.

---

## 5. Recorder Notes (MVP)

### 5.1 Change detection method
- MVP uses **polling** (e.g., every 200ms):
  - read current full body text
  - if changed vs last snapshot -> compute a compact patch -> append an event

### 5.2 Patch generation method
- MVP uses a simple **single-span replace** patch derived from
  - longest common prefix
  - longest common suffix
- This keeps implementation simple and the file compact.
- It may not be the *minimal* diff, but it is sufficient for replay and evidence.

---

## 6. Size & Performance Guidance

Recommended defaults:
- `sample = 200` ms for smooth replay without excessive event volume
- Merge events if needed:
  - If consecutive events occur very close in time and are adjacent/compatible, merge into one event to reduce size.

---

## 7. Compatibility

Any replayer/validator must:
1) Load `init`
2) Apply `ev` sequentially using the semantics in §3.2
3) Use `dt` to time animation (optional; can also ignore and play at constant speed)

---

**End of spec.**
