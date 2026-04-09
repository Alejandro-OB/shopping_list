from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from app.core.timezone import BOGOTA_TZ, to_bogota

def calculate_next_occurrence(frequency: str, start_date_utc: datetime, reference_date_bogota: datetime, strict: bool = False) -> datetime:
    """
    Calcula la próxima fecha de aparición de un producto basada en su frecuencia.
    
    Args:
        frequency: Uno de ['weekly', 'biweekly', 'monthly', 'occasional']
        start_date_utc: Fecha de inicio original (guardada en UTC)
        reference_date_bogota: Fecha desde la cual calcular (normalmente 'hoy' en Bogotá)
        strict: Si es True, busca la fecha estrictamente después de la referencia.
        
    Returns:
        datetime: La próxima fecha válida en zona horaria de Bogotá.
    """
    # 0. Asegurarse de que frequency sea un string (su valor) si viene de un Enum
    if hasattr(frequency, "value"):
        frequency = frequency.value

    # 1. Convertir fecha de inicio a Bogotá para aplicar las reglas de calendario local
    start_date_bogota = to_bogota(start_date_utc)
    
    # 2. Asegurarse de que la fecha de referencia no tenga microsegundos para comparaciones limpias
    ref_date = reference_date_bogota.replace(hour=0, minute=0, second=0, microsecond=0)
    
    def is_after_ref(date_to_check):
        if strict:
            return date_to_check.date() > ref_date.date()
        return date_to_check.date() >= ref_date.date()

    if frequency == "weekly":
        # REGLA: Martes (Python weekday 1)
        # 1. Encontrar el primer martes >= start_date_bogota
        days_to_tuesday = (1 - start_date_bogota.weekday() + 7) % 7
        occurrence = start_date_bogota + timedelta(days=days_to_tuesday)
        
        # 2. Saltar de 7 en 7 días hasta cumplir la condición
        while not is_after_ref(occurrence):
            occurrence += timedelta(weeks=1)
        return occurrence

    elif frequency == "biweekly":
        # REGLA: Cada 15 días exactos desde la fecha de inicio
        occurrence = start_date_bogota
        while not is_after_ref(occurrence):
            occurrence += timedelta(days=15)
        return occurrence

    elif frequency == "monthly":
        # REGLA: Mismo día del mes. relativedelta maneja meses de 28/30/31 días.
        occurrence = start_date_bogota
        while not is_after_ref(occurrence):
            occurrence += relativedelta(months=1)
        return occurrence

    # 'occasional' u otros no generan fechas automáticas recurrentes
    return None

def should_appear_today(frequency: str, start_date_utc: datetime, today_bogota: datetime) -> bool:
    """
    Determina si un producto debe aparecer en la lista de hoy.
    """
    next_occurrence = calculate_next_occurrence(frequency, start_date_utc, today_bogota, strict=False)
    if not next_occurrence:
        return False
    
    return next_occurrence.date() == today_bogota.date()
