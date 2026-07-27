import pytz
from datetime import datetime, timedelta
from typing import Optional, Tuple

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

def get_week_bounds(date_bogota: datetime) -> Tuple[datetime, datetime]:
    """
    Devuelve (lunes 00:00:00, domingo 23:59:59.999999) de la semana ISO que
    contiene `date_bogota`, en hora Bogotá. Misma regla que getWeekStart()
    en el frontend (Catalog.jsx), para que "una lista por semana" sea
    consistente entre creación manual y generación automática.
    """
    start_of_day = date_bogota.replace(hour=0, minute=0, second=0, microsecond=0)
    monday = start_of_day - timedelta(days=start_of_day.weekday())
    sunday_end = monday + timedelta(days=6, hours=23, minutes=59, seconds=59, microseconds=999999)
    return monday, sunday_end

def tuesday_of_week(date_bogota: datetime) -> datetime:
    """
    Devuelve el martes (00:00) de la semana ISO que contiene `date_bogota`,
    en hora Bogotá. Es la fecha que usa el resto de la app como ancla de
    "una lista por semana" (ver getNextAvailableTuesday en Catalog.jsx).
    """
    monday, _ = get_week_bounds(date_bogota)
    return monday + timedelta(days=1)
