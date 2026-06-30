import os
import logging
from fastapi import FastAPI, Depends, Security, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)

from routers.deadlines import router as deadlines_router

import auth

app = FastAPI(title="DueRight API", version="0.1.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin] if frontend_origin != "*" else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(deadlines_router)


@app.get("/health")
def health():
    return {"status": "ok"}
