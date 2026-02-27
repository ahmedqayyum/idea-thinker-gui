"""
Research Canvas GUI -- FastAPI backend.

Wraps the existing idea-explorer Python modules (IdeaManager, Runner, etc.)
behind a REST + WebSocket API consumed by the React frontend.
"""

import sys
import types
import importlib
from pathlib import Path
from contextlib import asynccontextmanager

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
SRC_DIR = PROJECT_ROOT / "src"

# --- Redirect src/* imports to the project's src/ directory --------
# Some src/ subdirs (core, cli, templates) lack __init__.py and can be
# shadowed by globally installed packages. We force Python to resolve
# them from src/ by creating explicit namespace packages.
_SRC_PACKAGES = ["core", "cli", "templates", "agents"]
for _pkg_name in _SRC_PACKAGES:
    for _k in [k for k in sys.modules if k == _pkg_name or k.startswith(f"{_pkg_name}.")]:
        del sys.modules[_k]

sys.path.insert(0, str(SRC_DIR))

for _pkg_name in _SRC_PACKAGES:
    _pkg_dir = SRC_DIR / _pkg_name
    if _pkg_dir.is_dir() and not (_pkg_dir / "__init__.py").exists():
        _ns = types.ModuleType(_pkg_name)
        _ns.__path__ = [str(_pkg_dir)]
        _ns.__package__ = _pkg_name
        _ns.__file__ = str(_pkg_dir / "__init__.py")
        sys.modules[_pkg_name] = _ns
# -----------------------------------------------------------------

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

env_local = PROJECT_ROOT / ".env.local"
env_file = PROJECT_ROOT / ".env"
if env_local.exists():
    load_dotenv(env_local)
elif env_file.exists():
    load_dotenv(env_file)

from services.defaults_service import DefaultsService

_defaults: DefaultsService | None = None


def get_defaults() -> DefaultsService:
    assert _defaults is not None
    return _defaults


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _defaults
    _defaults = DefaultsService(PROJECT_ROOT)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Research Canvas API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from routes.defaults import router as defaults_router
    from routes.ideas import router as ideas_router
    from routes.pipeline import router as pipeline_router
    from routes.artifacts import router as artifacts_router
    from routes.chat import router as chat_router
    from routes.ws import router as ws_router

    app.include_router(defaults_router, prefix="/api/defaults", tags=["defaults"])
    app.include_router(ideas_router, prefix="/api/ideas", tags=["ideas"])
    app.include_router(pipeline_router, prefix="/api/ideas", tags=["pipeline"])
    app.include_router(artifacts_router, prefix="/api/ideas", tags=["artifacts"])
    app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
    app.include_router(ws_router, tags=["websocket"])

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
