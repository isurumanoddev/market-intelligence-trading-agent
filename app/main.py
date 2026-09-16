import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.routes import router as api_router
from app.config import settings
from app.services.entry_alert_watcher import entry_alert_watcher

@asynccontextmanager
async def lifespan(app: FastAPI):
    if "pytest" not in sys.modules and getattr(settings, "btc_alert_watcher_enabled", True):
        await entry_alert_watcher.start()
    yield
    if "pytest" not in sys.modules:
        await entry_alert_watcher.stop()

app = FastAPI(
    title="Market Intelligence & AI Trading Decision Agent",
    description="Real-time multi-source data ingestion (prices, order book, trade tape, volume, news) with Gemini multi-agent reasoning and paper trading.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix="/api")

# Static files directory
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def root():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"status": "ok", "message": "Market Intelligence API running. Frontend static files pending."}

@app.get("/health")
async def health():
    return {"status": "healthy", "exchange": settings.default_exchange}
