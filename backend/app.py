from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from backend.LLM.main import app as llm_app
    from backend.record_server.main import app as record_app
except ModuleNotFoundError:
    from LLM.main import app as llm_app
    from record_server.main import app as record_app

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


app.mount("/llm", llm_app)
app.mount("/record", record_app)
