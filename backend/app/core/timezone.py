import pytz
from datetime import datetime
from typing import Optional

# Configuración global de la Zona Horaria
BOGOTA_TZ = pytz.timezone('America/Bogota')

def to_bogota(date: datetime) -> datetime:
    """
    Convierte cualquier objeto datetime (con o sin TZ) a la zona horaria de Bogotá.
    Si no tiene TZ, asume que es UTC antes de convertir.
    """
    if date.tzinfo is None:
        date = pytz.utc.localize(date)
    return date.astimezone(BOGOTA_TZ)

def to_utc(date: datetime) -> datetime:
    """
    Convierte una fecha a UTC para ser guardada en la base de datos.
    """
    if date.tzinfo is None:
        # Si no tiene zona horaria, asumimos que ya viene en Bogotá por lógica de la app
        date = BOGOTA_TZ.localize(date)
    return date.astimezone(pytz.utc)

def now_bogota() -> datetime:
    """
    Retorna el 'ahora' actual en la zona horaria de Bogotá.
    """
    return datetime.now(pytz.utc).astimezone(BOGOTA_TZ)

def now_utc() -> datetime:
    """
    Retorna el 'ahora' actual en UTC (estándar para DB).
    """
    return datetime.now(pytz.utc)

def format_bogota(date: datetime, fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    Formatea una fecha para mostrarla al usuario en horario de Bogotá.
    """
    return to_bogota(date).strftime(fmt)
