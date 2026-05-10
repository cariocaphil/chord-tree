"""
Chord Tree – FastAPI application entry point
─────────────────────────────────────────────
Responsibilities:
  - Create the FastAPI app instance with metadata for OpenAPI docs.
  - Configure structured logging on startup.
  - Register CORS middleware so the Vite dev server (port 5173) can reach us.
  - Mount all routers.
  - Expose a /health liveness probe used by Docker / load-balancers.
"""

from __future__ import annotations

import logging
import logging.config
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.suggestions import router as suggestions_router
from app.routers.export import router as export_router

# ── Logging ───────────────────────────────────────────────────────────────────

LOGGING_CONFIG: dict = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s [%(levelname)s] %(name)s – %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
        },
    },
    "root": {
        "level": "INFO",
        "handlers": ["console"],
    },
    # Quieten noisy third-party loggers
    "loggers": {
        "uvicorn.access": {"level": "WARNING"},
    },
}

logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)


# ── Lifespan (startup / shutdown hooks) ───────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Chord Tree API starting up…")
    yield
    logger.info("Chord Tree API shutting down.")


# ── App factory ───────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title="Chord Tree API",
        description=(
            "AI-powered chord-progression suggestion engine for the "
            "Chord Tree composition tool.\n\n"
            "The suggestion engine is swappable: the current build uses a "
            "deterministic rule-based engine; set `OPENAI_API_KEY` and update "
            "`engine/factory.py` to switch to the GPT-4o backend."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Always-allowed origins (local dev).
    # Add production frontend URLs via the ALLOWED_ORIGINS env var as a
    # comma-separated list, e.g.:
    #   ALLOWED_ORIGINS=https://chord-tree.vercel.app,https://my-custom.domain
    base_origins = [
        "http://localhost:5173",   # Vite dev server
        "http://127.0.0.1:5173",
        "http://localhost:4173",   # Vite preview
    ]
    extra = os.getenv("ALLOWED_ORIGINS", "")
    extra_origins = [o.strip() for o in extra.split(",") if o.strip()]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=base_origins + extra_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(suggestions_router)
    app.include_router(export_router)

    # ── Liveness probe ────────────────────────────────────────────────────────
    @app.get("/health", tags=["meta"], summary="Liveness probe")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
