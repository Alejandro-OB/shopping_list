from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any, Optional
from datetime import datetime

from app.core.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.metrics_service import MetricsService
from app.schemas.metrics import BudgetSummary, MonthlySpending, ProductQuantity, ProductPriceEvolution

router = APIRouter()

@router.get("/summary/", response_model=BudgetSummary)
def read_budget_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Dashboard de métricas rápidas (gasto mes actual y top productos).
    """
    service = MetricsService(db)
    return service.get_budget_summary(current_user.id)

@router.get("/monthly/", response_model=MonthlySpending)
def read_monthly_spending(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Reporte de gasto para un año y mes específicos.
    """
    service = MetricsService(db)
    total = service.get_monthly_spending(current_user.id, year, month)
    return {
        "year": year,
        "month": month,
        "total": total
    }

@router.get("/most-bought/", response_model=List[ProductQuantity])
def read_most_bought(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Obtiene los productos más comprados del historial del usuario.
    """
    service = MetricsService(db)
    return service.get_most_bought_products(current_user.id, limit=limit)

@router.get("/price-evolution/", response_model=List[ProductPriceEvolution])
def read_price_evolution(
    product_id: Optional[int] = None,
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Serie temporal del precio real pagado por cada par (producto, tienda) a lo largo de las semanas.
    Filtra opcionalmente por product_id y/o store_id.
    """
    service = MetricsService(db)
    return service.get_price_evolution(current_user.id, product_id=product_id, store_id=store_id)
