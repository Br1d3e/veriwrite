from typing import Any

from fastapi import BackgroundTasks, FastAPI
from fastapi.middleware.cors import CORSMiddleware

if __package__:
    from .store_db import append_block, end_session, flush_pending_sessions, start_doc, start_session, create_challenge, get_record_from_store
    from .search_db import query_title, query_author
    from .analyze_db import AnalyzeDB
else:
    from record_db.store_db import append_block, end_session, flush_pending_sessions, start_doc, start_session, create_challenge
    from record_db.search_db import query_title, query_author
    from record_db.analyze_db import AnalyzeDB
    

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
async def post_session_end(session_end: dict[str, Any], background_tasks: BackgroundTasks):
    response = end_session(session_end, flush_vw=False)
    d_id = session_end.get("dId")
    if isinstance(d_id, str) and d_id:
        background_tasks.add_task(flush_pending_sessions, d_id)
    return response

@app.post("/query/title")
async def query_record_title(payload: dict[str, Any]):
    title = payload.get("title")
    if not isinstance(title, str) or not title.strip():
        raise ValueError(f"missing title query")
    limit = payload.get("limit", 10)
    if not isinstance(limit, int):
        limit = 10
    limit = max(1, min(limit, 50))
    return query_title(title, limit=limit)


@app.post("/query/author")
async def query_record_author(payload: dict[str, Any]):
    author = payload.get("author")
    if not isinstance(author, str) or not author.strip():
        raise ValueError(f"missing author query")
    limit = payload.get("limit", 10)
    if not isinstance(limit, int):
        limit = 10
    limit = max(1, min(limit, 50))
    return query_author(author, limit=limit)


async def load_record_by_id_legacy(payload: dict[str, Any]):
    d_id = payload.get("d_id")
    if not isinstance(d_id, str) or not d_id.strip():
        raise ValueError("missing d_id")
    analyze = AnalyzeDB()
    analyze.load_doc(d_id=d_id)
    return analyze.get_record()


async def load_record_by_id(payload: dict[str, Any]):
    d_id = payload.get("d_id")
    if not isinstance(d_id, str) or not d_id.strip():
        raise ValueError("missing d_id")
    db = AnalyzeDB()
    db.load_doc(d_id=d_id)
    key = db.fetch_storage_key()
    if key is None:
        raise ValueError(f"vw key does not exist in database: {key!r} \nd_id: {d_id!r}")
    record = get_record_from_store(key)
    if record is None:
        raise ValueError(f"vw record storage not found for key, {key!r}, \nd_id, {d_id!r}")
    return record


@app.post("/load")
async def load_record(payload: dict[str, Any]):
    return await load_record_by_id(payload)


@app.post("/record/load")
async def load_record_legacy(payload: dict[str, Any]):
    return await load_record_by_id(payload)
