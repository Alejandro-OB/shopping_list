import app.models # Asegurar registro
from app.core.db.base import Base
from app.core.db.session import engine

def setup():
    """
    Crea todas las tablas definidas en los modelos de SQLAlchemy.
    """
    print("--- Inicializando Base de Datos ---")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Esquema de base de datos creado con éxito.")
    except Exception as e:
        print(f"❌ Error al crear tablas: {str(e)}")

if __name__ == "__main__":
    setup()
