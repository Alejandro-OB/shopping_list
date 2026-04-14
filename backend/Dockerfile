# Usa una imagen oficial de Python ligera
FROM python:3.12-slim

# Evita que Python genere archivos .pyc y fuerza el vaciado de logs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Establece el directorio de trabajo
WORKDIR /app

# Crear un usuario no-root para mayor seguridad
RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -s /bin/sh -m appuser

# Instala dependencias del sistema necesarias
# Añadimos libpq-dev para PostgreSQL y librerías de renderizado para PDF (WeasyPrint)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libfontconfig1 \
    libfreetype6 \
    && rm -rf /var/lib/apt/lists/*

# Copia los requerimientos e instala las dependencias de Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto del código de la aplicación
COPY backend/ .

# Asegurar que el usuario tenga permisos sobre su directorio de trabajo
RUN chown -R appuser:appgroup /app

# Cambiar al usuario no-root
USER appuser

# Expone el puerto 8000 para FastAPI
EXPOSE 8000

# Comando para ejecutar la aplicación con uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
