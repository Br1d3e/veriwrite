from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

if __package__:
    from .LLM.main import app as llm_app
    from .record_db.main import app as record_app
else:
    from LLM.main import app as llm_app
    from record_db.main import app as record_app

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
