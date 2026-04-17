from datetime import datetime


def format_timestamp(ms: int | float) -> str:
    return datetime.fromtimestamp(ms / 1000).strftime("%Y-%m-%d-%H-%M")


def format_duration(ms: int | float) -> str:
    total_minutes = max(0, round(ms / 60000))
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{hours} hours {minutes} minutes"



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