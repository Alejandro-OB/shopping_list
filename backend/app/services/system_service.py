from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.heartbeat import Heartbeat

class SystemService:
    def __init__(self, db: Session):
        self.db = db

    def check_health(self) -> str:
        """
        Verifica la conexión a la base de datos.
        """
        try:
            self.db.execute(text("SELECT 1"))
            return "connected"
        except Exception as e:
            return f"error: {str(e)}"

    def create_heartbeat(self) -> Heartbeat:
        """
        Crea un nuevo latido incrementando el valor del último registro.
        """
        last_heartbeat = self.db.query(Heartbeat).order_by(Heartbeat.id.desc()).first()
        new_value = (last_heartbeat.value + 1) if last_heartbeat else 1
        
        heartbeat = Heartbeat(value=new_value)
        self.db.add(heartbeat)
        self.db.commit()
        self.db.refresh(heartbeat)
        return heartbeat
