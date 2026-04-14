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
        self.scheduler = AsyncIOScheduler(timezone=BOGOTA_TZ)

    def start(self):
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
        self.scheduler.shutdown()
        logger.info("Programador de tareas detenido.")

# Instancia global del manager
scheduler_manager = SchedulerManager()
