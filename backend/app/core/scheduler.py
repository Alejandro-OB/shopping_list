import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.core.db.session import SessionLocal
from app.services.shopping_list_service import ShoppingListService
from app.core.timezone import BOGOTA_TZ

# Configuración de logs para el scheduler
logger = logging.getLogger("apscheduler")
logger.setLevel(logging.INFO)

async def scheduled_list_generation():
    """
    Tarea programada para generar listas automáticamente.
    """
    logger.info("Iniciando generación automática de listas programada...")
    db = SessionLocal()
    try:
        service = ShoppingListService(db)
        results = service.generate_auto_lists()
        logger.info(f"Generación completada: {results['lists_created']} listas creadas, {results['items_added']} ítems añadidos.")
    except Exception as e:
        logger.error(f"Error en la generación automática programada: {str(e)}")
    finally:
        db.close()

class SchedulerManager:
    def __init__(self):
        self.scheduler = None

    def start(self):
        # El scheduler se construye aquí y no en __init__ a propósito:
        # AsyncIOScheduler se ata al event loop que esté corriendo cuando se
        # arranca, y este manager es una instancia global que se importa una
        # sola vez. Reutilizar el mismo objeto en un segundo arranque lo dejaba
        # enganchado a un loop ya cerrado —cada TestClient levanta y cierra el
        # lifespan, así que la primera prueba pasaba y las siguientes morían con
        # "Event loop is closed"—, y lo mismo ocurriría con cualquier reinicio
        # del ciclo de vida de la aplicación.
        self.scheduler = AsyncIOScheduler(timezone=BOGOTA_TZ)

        # Programar para que corra todos los días a las 00:05 AM hora Bogotá
        self.scheduler.add_job(
            scheduled_list_generation,
            CronTrigger(hour=0, minute=5, timezone=BOGOTA_TZ),
            id="auto_generate_lists",
            replace_existing=True
        )
        self.scheduler.start()
        logger.info("Programador de tareas iniciado (00:05 AM Bogotá).")

    def shutdown(self):
        # Se suelta la referencia para que el próximo start() construya uno
        # nuevo; parar el scheduler no lo desliga del loop en el que vivía.
        if self.scheduler is None:
            return
        self.scheduler.shutdown()
        self.scheduler = None
        logger.info("Programador de tareas detenido.")

# Instancia global del manager
scheduler_manager = SchedulerManager()
