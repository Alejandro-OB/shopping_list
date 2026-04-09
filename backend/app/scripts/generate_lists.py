from datetime import datetime
import os

# Importar modelos fundamentales para el registro en SQLAlchemy
from app.models.store import Store
from app.models.user import User
import app.models

from app.core.db.session import SessionLocal
from app.services.shopping_list_service import ShoppingListService

def run_generation():
    """
    Punto de entrada para la generación masiva de listas diarias.
    """
    start_time = datetime.now()
    print(f"[{start_time}] --- Iniciando Generación Automática de Listas ---")
    
    db = SessionLocal()
    try:
        service = ShoppingListService(db)
        stats = service.generate_auto_lists()
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print(f"[{end_time}] --- Generación Finalizada ---")
        print(f"  - Listas creadas: {stats['lists_created']}")
        print(f"  - Ítems añadidos: {stats['items_added']}")
        print(f"  - Usuarios procesados: {len(stats['user_ids_processed'])}")
        print(f"  - Duración: {duration:.2f} segundos")
        
    except Exception as e:
        import traceback
        print(f"[{datetime.now()}] ERROR CRÍTICO durante la generación: {str(e)}")
        traceback.print_exc()
        # No salimos con sys.exit(1) para permitir que el contenedor/logger capture todo
    finally:
        db.close()

if __name__ == "__main__":
    run_generation()
