from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.api.v1.api import api_router

app = FastAPI(
    title="Shopping List API",
    description="API for multi-user shopping list management with automated generation.",
    version="1.0.0"
)

# Configuración de CORS
origins = [
    "http://localhost:5173",
    "http://localhost",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
