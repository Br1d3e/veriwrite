from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from backend.LLM.doc_stats import router as doc_stats_router
    from backend.LLM.ses_stats import router as ses_stats_router
except ModuleNotFoundError:
    from LLM.doc_stats import router as doc_stats_router
    from LLM.ses_stats import router as ses_stats_router


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(doc_stats_router)
app.include_router(ses_stats_router)
