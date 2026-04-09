# 🛒 Shopping List API - Sistema Multiusuario

Una API robusta y profesional construida con **FastAPI** para la gestión inteligente de listas de compras. Diseñada para soportar múltiples usuarios con aislamiento total de datos, generación automática de listas basada en frecuencias proyectadas y análisis financiero detallado.

## 🚀 Características Clave

- **Aislamiento Multiusuario**: Cada usuario gestiona su propio catálogo de productos, tiendas y listas con total privacidad.
- **Motor de Frecuencias Propietario**: Soporte para productos con periodicidad semanal (alineados a Martes en Bogotá), quincenales y mensuales.
- **Generación Automática**: Motor proactivo que proyecta y crea listas futuras evitando la duplicidad de productos.
- **Seguridad Avanzada**: Autenticación dual (Access & Refresh Tokens) con revocación total de sesiones (Logout All).
- **Comunicación Premium**: Correos de verificación y recuperación de cuenta con templates HTML responsivos (Purple Theme).
- **Métricas e Inteligencia**:
  - Gasto mensual real.
  - Gasto semanal real vs Proyectado (Presupuesto preventivo).
  - Análisis de productos más comprados.
- **Infraestructura**: Dockerizado con PostgreSQL 16, usuario no-root y persistencia de datos.

## 🛠️ Stack Tecnológico

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12)
- **ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/)
- **Base de Datos**: [PostgreSQL 16](https://www.postgresql.org/)
- **Contenedores**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- **Gestión de Entorno**: [Pydantic Settings](https://docs.pydantic.dev/)

## 📦 Estructura del Proyecto

```text
shopping_list/
├── backend/            # Todo el ecosistema de la API
│   ├── app/            # Código fuente (Routes, Models, Services)
│   ├── tests/          # Pruebas automatizadas (Pytest)
│   ├── Dockerfile      # Definición de imagen del backend
│   └── requirements.txt
├── docker-compose.yml  # Orquestación de API y Base de Datos (en la raíz)
└── .env                # Variables de entorno (en la raíz)
```

## ⚙️ Instalación y Despliegue

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd shopping_list
```

### 2. Configurar el Entorno

Copia el archivo de ejemplo y genera tu clave secreta criptográfica:

```bash
cp .env.example .env
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Pega el resultado en la variable `SECRET_KEY` de tu archivo `.env`.

### 3. Levantar con Docker (Recomendado)

```bash
docker compose up --build
```

La API estará disponible en `http://localhost:8000`.

### 4. Ejecución Local (Alternativo)

Si prefieres correrlo sin Docker:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 📖 Documentación de la API

Una vez encendido el servidor, puedes explorar y probar la API en:

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

© 2026 - Desarrollado por Alejandro-OB.
