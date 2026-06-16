from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from backend.LLM.llm import generate_token
    from backend.LLM.doc_stats import router as doc_stats_router
    from backend.LLM.ses_stats import router as ses_stats_router
except ModuleNotFoundError:
    from LLM.llm import generate_token
    from LLM.doc_stats import router as doc_stats_router
    from LLM.ses_stats import router as ses_stats_router


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.post("/token")
def fetch_token(payload: dict):
    return generate_token(payload)

app.include_router(doc_stats_router)
app.include_router(ses_stats_router)
