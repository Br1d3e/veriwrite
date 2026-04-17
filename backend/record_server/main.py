from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:9000", "http://127.0.0.1:9000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.post("doc/start")
async def start_doc(doc_meta):
    print(doc_meta)
    return "received post request"   

app.post("session/start")
async def start_session():
    pass

app.post("session/block")

app.post("session/end")