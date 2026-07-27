# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos esenciales

### Docker (recomendado)
```bash
docker compose up --build          # Levantar todo el stack
docker compose up                  # Sin rebuild
docker compose down                # Bajar servicios
docker compose logs -f api         # Ver logs del backend
```

Puertos expuestos:
- Frontend: `http://localhost:5175`
- API: `http://localhost:8001` (mapea al 8000 interno)
- Postgres: `localhost:5434`
- Swagger: `http://localhost:8001/docs`

### Backend (local sin Docker)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload      # Puerto 8000
alembic upgrade head               # Aplicar migraciones
alembic revision --autogenerate -m "descripción"  # Nueva migración
python -m pytest                   # Tests
python -m pytest tests/test_api_v1_auth.py::test_login_success  # Un solo test
python -m pytest -k "metrics"      # Tests que matcheen un patrón
```

### Frontend (local sin Docker)
```bash
cd frontend
npm install
npm run dev       # Puerto 5173
npm run build
npm run lint
```

### Scripts de utilidad
```bash
# Desde /backend
python app/scripts/setup_db.py       # Inicializar base de datos
python app/scripts/generate_lists.py # Generar listas manualmente
```

## Arquitectura

Monorepo con dos servicios independientes:

```
/backend   → FastAPI REST API (Python 3.12)
/frontend  → React 19 SPA (Vite + TailwindCSS)
```

### Backend (`/backend/app/`)

Estructura en capas:
- `api/v1/` — Routers FastAPI (auth, users, products, stores, lists, metrics, system, heartbeat)
- `models/` — Modelos SQLAlchemy 2.0 (tablas de BD)
- `schemas/` — Esquemas Pydantic para request/response validation
- `repositories/` — Capa de acceso a datos (queries SQLAlchemy)
- `services/` — Lógica de negocio (llamada desde los routers)
- `core/` — Config (Pydantic Settings), seguridad JWT, dependencias
- `templates/` — Plantillas Jinja2 para emails HTML

**Patrón de dependencias**: Los routers inyectan `db: Session` y `current_user: User` vía `api/deps.py`. El flujo es: Router → Service → Repository → DB.

**Scheduler**: APScheduler corre en background para auto-generar listas de compras según frecuencia por producto (diaria/semanal/quincenal/mensual), usando timezone `America/Bogota`.

**Base de datos**: PostgreSQL 16. Migraciones con Alembic. Soporte dual: local (config por componentes) o Supabase (URI directa), controlado por `ENVIRONMENT=local|supabase` en `.env`.

**Modelo de dominio (precios)**: `Product` — `Store` se relacionan vía `ProductStore` (precio de catálogo actual por tienda). Cada cambio de precio en `ProductStore` genera un registro en `PriceHistory`, que es la base para las métricas de ahorro y comparación entre tiendas. Los ítems de una lista (`ShoppingListItem`) referencian un `ProductStore`, no un `Product` directamente.

**Tests**: `backend/tests/` usa una base SQLite en memoria (ver `conftest.py`); cada test corre en una transacción que se revierte al finalizar, así que los fixtures no necesitan limpiar datos manualmente.

### Frontend (`/frontend/src/`)

- `pages/` — Vistas principales (ListDetail, Products, etc.)
- `components/` — Componentes reutilizables (Sidebar, etc.)
- `context/` — `AuthContext` + hook `useAuth` para sesión global
- `api/` — Cliente Axios (`axios.js`), caché (`cache.js`) y cola offline (`offlineQueue.js`)
- `App.jsx` — Router principal con React Router 7
- `index.css` — Estilos globales Tailwind

La API base URL se configura en Axios (`api/axios.js`). En Docker apunta a `http://localhost:8001`; local a `http://localhost:8000`.

**PWA y modo offline**: el frontend es una PWA (`vite-plugin-pwa`) pensada para usarse en el supermercado sin señal. El service worker cachea `GET /lists/*` (NetworkFirst) y `users/me`, `stores`, `products` (StaleWhileRevalidate). Además, `api/axios.js` intercepta mutaciones críticas sobre ítems de lista (marcar comprado, cambiar cantidad, eliminar) que fallan por red y las encola en IndexedDB (`idb-keyval`, vía `offlineQueue.js`) para reintentarlas cuando vuelve la conexión.

### Autenticación

JWT dual-token (access + refresh). El access token se pasa en header `Authorization: Bearer <token>`. El endpoint `/auth/token` emite ambos; `/auth/refresh` renueva el access token.

## Configuración del entorno

Copiar `backend/.env.example` → `backend/.env` y completar:
- `SECRET_KEY`: generar con `python3 -c "import secrets; print(secrets.token_hex(32))"`
- `SMTP_USER` / `SMTP_PASSWORD`: cuenta Gmail con contraseña de aplicación
- Para Supabase: cambiar `ENVIRONMENT=supabase` y definir `SUPABASE_DATABASE_URI`
