from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from .store_db import append_block, end_session, start_doc, start_session, create_challenge
    from .search_db import query_title, query_author
    from .analyze_db import AnalyzeDB
except ImportError:
    from backend.record_server.store_db import append_block, end_session, start_doc, start_session, create_challenge
    from backend.record_server.search_db import query_title, query_author
    from backend.record_server.analyze_db import AnalyzeDB


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/ping")
async def get_ping_server():
    return {"status": "OK"}


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

@app.post("/query/title")
async def query_record_title(payload: dict[str, Any]):
    title = payload.get("title")
    if not isinstance(title, str) or not title.strip():
        raise ValueError(f"missing title query")
    return query_title(title)


@app.post("/query/author")
async def query_record_author(payload: dict[str, Any]):
    author = payload.get("author")
    if not isinstance(author, str) or not author.strip():
        raise ValueError(f"missing author query")
    return query_author(author)


@app.post("/record/load")
async def load_record(payload: dict[str, Any]):
    d_id = payload.get("d_id")
    if not isinstance(d_id, str) or not d_id.strip():
        raise ValueError("missing d_id")
    analyze = AnalyzeDB()
    analyze.load_doc(d_id=d_id)
    return analyze.get_record()
