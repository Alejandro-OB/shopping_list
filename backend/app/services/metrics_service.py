from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, extract
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from app.models.shopping_list import ShoppingList, ListStatus
from app.models.shopping_list_item import ShoppingListItem
from app.models.product_store import ProductStore
from app.models.product import Product
from app.models.store import Store
from app.core.timezone import BOGOTA_TZ, to_utc, now_bogota
from app.services.logic.frequency import calculate_next_occurrence

class MetricsService:
    def __init__(self, db: Session):
        self.db = db

    def get_list_total(self, list_id: int) -> float:
        """
        Calcula el total real de una lista (solo ítems comprados).
        """
        total = self.db.query(
            func.sum(ShoppingListItem.quantity * ShoppingListItem.price_real)
        ).filter(
            and_(
                ShoppingListItem.list_id == list_id,
                ShoppingListItem.checked == True
            )
        ).scalar() or 0.0
        return float(total)

    def get_monthly_spending(self, user_id: int, year: int, month: int) -> float:
        """
        Gasto total de un usuario en un mes específico.
        """
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
            
        total = self.db.query(
            func.sum(ShoppingListItem.quantity * ShoppingListItem.price_real)
        ).join(ShoppingList).filter(
            and_(
                ShoppingList.user_id == user_id,
                ShoppingList.date >= to_utc(start_date),
                ShoppingList.date < to_utc(end_date),
                ShoppingListItem.checked == True
            )
        ).scalar() or 0.0
        return float(total)

    def get_weekly_real_spending(self, user_id: int) -> float:
        """
        GASTO SEMANAL REAL:
        Suma el costo real de los productos comprados en la semana actual (Lunes a Domingo).
        """
        hoy = now_bogota()
        # Encontrar el lunes de la semana actual
        lunes_esta_semana = hoy - timedelta(days=hoy.weekday())
        lunes_esta_semana = lunes_esta_semana.replace(hour=0, minute=0, second=0, microsecond=0)
        
        total = self.db.query(
            func.sum(ShoppingListItem.quantity * ShoppingListItem.price_real)
        ).join(ShoppingList).filter(
            and_(
                ShoppingList.user_id == user_id,
                ShoppingList.date >= to_utc(lunes_esta_semana),
                ShoppingList.date <= to_utc(hoy),
                ShoppingListItem.checked == True
            )
        ).scalar() or 0.0
        return float(total)

    def get_weekly_estimate(self, user_id: int) -> float:
        """
        ESTIMACIÓN SEMANAL (Presupuesto proyectado):
        Suma el costo proyectado de los productos para los próximos 7 días.
        """
        hoy_bogota = now_bogota()
        proximos_7_dias = hoy_bogota + timedelta(days=7)
        
        products = self.db.execute(
            select(Product).filter(
                and_(Product.user_id == user_id, Product.is_deleted == False)
            )
        ).scalars().all()
        
        proyeccion_total = 0.0
        for product in products:
            next_date = calculate_next_occurrence(
                product.frequency.value, 
                product.frequency_start_date, 
                hoy_bogota
            )
            if next_date and next_date.date() <= proximos_7_dias.date():
                active_ps = next((ps for ps in product.product_stores if not ps.is_deleted), None)
                if active_ps:
                    proyeccion_total += float(active_ps.price_catalog)
                    
        return float(proyeccion_total)

    def get_most_bought_products(self, user_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Top productos (basado en quantity de ítems comprados).
        """
        results = self.db.query(
            Product.name,
            func.sum(ShoppingListItem.quantity).label("total_quantity")
        ).join(ProductStore, Product.id == ProductStore.product_id)\
         .join(ShoppingListItem, ProductStore.id == ShoppingListItem.product_store_id)\
         .join(ShoppingList, ShoppingListItem.list_id == ShoppingList.id)\
         .filter(
            and_(
                ShoppingList.user_id == user_id,
                ShoppingListItem.checked == True
            )
        ).group_by(Product.name)\
         .order_by(func.sum(ShoppingListItem.quantity).desc())\
         .limit(limit).all()

        return [{"product_name": row[0], "total_quantity": int(row[1])} for row in results]

    def get_budget_summary(self, user_id: int) -> Dict[str, Any]:
        """
        Resumen dashboard completo con proyecciones y gastos reales.
        """
        now = datetime.now()
        
        # Conteos básicos
        total_lists = self.db.query(ShoppingList).filter(ShoppingList.user_id == user_id).count()
        total_products = self.db.query(Product).filter(
            and_(Product.user_id == user_id, Product.is_deleted == False)
        ).count()
        total_stores = self.db.query(Store).filter(
            and_(Store.user_id == user_id, Store.is_deleted == False)
        ).count()
        
        return {
            "total_lists": total_lists,
            "total_products": total_products,
            "total_stores": total_stores,
            "current_month_real_spending": self.get_monthly_spending(user_id, now.year, now.month),
            "current_week_real_spending": self.get_weekly_real_spending(user_id),
            "next_week_estimated_budget": self.get_weekly_estimate(user_id),
            "most_bought": self.get_most_bought_products(user_id, limit=3)
        }

