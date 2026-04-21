from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from .database import append_block, end_session, start_doc, start_session, create_challenge
except ImportError:
    from database import append_block, end_session, start_doc, start_session, create_challenge


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.post("/ping")
async def ping_server():
    return {"status": "OK"}

@app.post("/doc/start")
async def post_doc_start(doc: dict[str, Any]):
    return start_doc(doc)

@app.post("/session/start")
async def post_session_start(session: dict[str, Any]):
    return start_session(session)

@app.post("/session/challenge")
async def post_session_challenge(meta: dict[str, Any]):
    return create_challenge(meta)

@app.post("/session/block")
async def post_session_block(block: dict[str, Any]):
    return append_block(block)


@app.post("/session/end")
async def post_session_end(session_end: dict[str, Any]):
    return end_session(session_end)
