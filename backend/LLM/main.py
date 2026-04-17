from ollama import chat
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Any
import json
from datetime import datetime
from copy import deepcopy
import asyncio
from pathlib import Path
from backend.LLM.doc_stats import router as doc_stats_router
from backend.LLM.ses_stats import router as ses_stats_router


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(doc_stats_router)
app.include_router(ses_stats_router)