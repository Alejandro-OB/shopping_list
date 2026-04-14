import sys
import os

# Añadir el directorio actual al path para importar 'app'
sys.path.append(os.getcwd())

from app.core.db.session import SessionLocal
from app.models.user import User

def list_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print("\nID  | Email                          | Admin | Verificado")
        print("-" * 55)
        for u in users:
            print(f"{u.id:<3} | {u.email:<30} | {str(u.is_admin):<5} | {str(u.is_verified)}")
    finally:
        db.close()

def promote_user(email):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"\nError: No se encontró el usuario con email: {email}")
            return
        
        user.is_admin = True
        db.commit()
        print(f"\nÉxito: El usuario {email} ahora es Administrador.")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso:")
        print("  python scripts/manage_users.py list        - Lista todos los usuarios")
        print("  python scripts/manage_users.py promote <email> - Hace admin a un usuario")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "list":
        list_users()
    elif cmd == "promote" and len(sys.argv) == 3:
        promote_user(sys.argv[2])
    else:
        print("Comando no reconocido o faltan argumentos.")
