from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.api.v1.api import api_router
from app.core.config import settings
from contextlib import asynccontextmanager
from app.core.scheduler import scheduler_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Iniciar el programador de tareas
    scheduler_manager.start()
    yield
    # Detener el programador al cerrar la app
    scheduler_manager.shutdown()

app = FastAPI(
    title="Shopping List API",
    description="API for multi-user shopping list management with automated generation.",
    version="1.0.0",
    lifespan=lifespan
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

# Incluir todas las rutas de la API v1
app.include_router(api_router, prefix="/api/v1")

@app.get("/", tags=["root"])
def root():
    """
    Redirección automática a la documentación de Swagger.
    """
    return RedirectResponse(url="/docs")
