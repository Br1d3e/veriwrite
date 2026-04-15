from ollama import chat
from google import genai
from google.genai import types
from datetime import datetime
import json
import asyncio
import os
from utils import extract_first_json_object
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path
from fastapi import HTTPException

LOCAL = False

load_dotenv()
load_dotenv(Path(__file__).resolve().parent / ".env", override=False)

API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemma-4-31b-it")
REQUEST_TIMEOUT_SECONDS = 120
REQUEST_TIMEOUT_MS = REQUEST_TIMEOUT_SECONDS * 1000
MAX_RETRIES = 3

client = genai.Client(
    api_key=API_KEY,
    http_options=types.HttpOptions(
        timeout=REQUEST_TIMEOUT_MS,
        client_args={"trust_env": False},
        async_client_args={"trust_env": False},
        retry_options=types.HttpRetryOptions(
            attempts=1,
            http_status_codes=[408, 429, 500, 502, 503, 504],
        ),
    ),
)

async def report_health():
    return {
        "ok": True,
        "provider": "ollama" if LOCAL else "google-genai",
        "model": "gemma4:e4b" if LOCAL else GEMINI_MODEL,
        "apiKeyConfigured": bool(API_KEY),
        "timeoutSeconds": REQUEST_TIMEOUT_SECONDS,
    }


def section_title(field_name: str) -> str:
    titles = {
        "overview": "Overview",
        "timeline": "Timeline",
        "edit": "Edit",
        "continuity": "Continuity",
        "pasteIns": "Paste-like Insertions",
        "writingFlow": "Writing Flow",
        "revisionIntensity": "Revision Intensity",
    }
    return titles.get(field_name, field_name)


def normalize_string_sections(content: dict, response_schema: type[BaseModel]) -> dict:
    normalized = dict(content)
    for field_name, field in response_schema.model_fields.items():
        value = normalized.get(field_name)
        annotation = field.annotation
        if not isinstance(value, str):
            continue
        if not isinstance(annotation, type) or not issubclass(annotation, BaseModel):
            continue
        section_fields = getattr(annotation, "model_fields", {})
        if "title" in section_fields and "observation" in section_fields:
            normalized[field_name] = {
                "title": section_title(field_name),
                "observation": value,
            }
    return normalized


retry = 0
async def gen_report(
    *,
    route_name: str,
    prompt: dict,
    system_prompt: str,
    response_schema: type[BaseModel],
    local_model: str = "gemma4:e4b",
):
    schema = response_schema.model_json_schema()

    def generate_raw_content():
        if LOCAL:
            response = chat(
                model=local_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(prompt)},
                ],
                format=schema,
                think=False,
                stream=False,
            )
            message = response.get("message") if isinstance(response, dict) else response.message
            print(message.content)
            return message.get("content") if isinstance(message, dict) else message.content

        if not API_KEY:
            raise ValueError("Missing GEMINI_API_KEY")

        print(f"[{route_name}] calling Google GenAI model={GEMINI_MODEL}")
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=json.dumps(prompt),
            config=types.GenerateContentConfig(
                temperature=0.1,
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=response_schema,
            ),
        )

        print(f"[{route_name}] Google GenAI response received")
        if response.candidates:
            print(f"[{route_name}] finish reason: {response.candidates[0].finish_reason}")
        if response.parsed:
            return response.parsed
        return response.text

    try:
        raw_content = await asyncio.wait_for(
            asyncio.to_thread(generate_raw_content),
            timeout=REQUEST_TIMEOUT_SECONDS + 5,
        )
    except TimeoutError as err:
        raise HTTPException(
            status_code=504,
            detail=f"{route_name} generation timed out after {REQUEST_TIMEOUT_SECONDS} seconds.",
        ) from err
    except Exception as err:
        message = str(err)
        status_code = 502
        if "503" in message or "UNAVAILABLE" in message:
            status_code = 503
        elif "504" in message or "DEADLINE_EXCEEDED" in message:
            status_code = 504
        raise HTTPException(
            status_code=status_code,
            detail=f"{route_name} LLM request failed: {message}",
        ) from err

    if isinstance(raw_content, response_schema):
        return raw_content
    if isinstance(raw_content, dict):
        return response_schema.model_validate(
            normalize_string_sections(raw_content, response_schema)
        )

    try:
        json_content = extract_first_json_object(raw_content)
        content = json.loads(json_content)
        if isinstance(content, dict):
            content = normalize_string_sections(content, response_schema)
        return response_schema.model_validate(content)
    except Exception as err:
        preview = raw_content[:500] if isinstance(raw_content, str) else repr(raw_content)
        raise HTTPException(
            status_code=500,
            detail=f"{route_name} failed to parse model response: {err}. Response preview: {preview}",
        ) from err
