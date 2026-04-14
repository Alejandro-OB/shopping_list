from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any

from app.core.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.repositories.product_repo import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut

router = APIRouter()

@router.get("/", response_model=List[ProductOut])
def read_products(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Obtiene la lista de productos del catálogo del usuario actual.
    """
    product_repo = ProductRepository(db)
    return product_repo.get_by_user(current_user.id, skip=skip, limit=limit)

@router.post("/", response_model=ProductOut)
def create_product(
    *,
    db: Session = Depends(get_db),
    product_in: ProductCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Crea un nuevo producto en el catálogo del usuario.
    """
    product_repo = ProductRepository(db)
    return product_repo.create(obj_in=product_in, user_id=current_user.id)

@router.get("/{id}/", response_model=ProductOut)
def read_product(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Obtiene el detalle de un producto específico.
    """
    product_repo = ProductRepository(db)
    product = product_repo.get(id)
    if not product or product.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product

@router.put("/{id}/", response_model=ProductOut)
def update_product(
    *,
    db: Session = Depends(get_db),
    id: int,
    product_in: ProductUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Actualiza la información de un producto.
    """
    product_repo = ProductRepository(db)
    product = product_repo.get(id)
    if not product or product.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product_repo.update(db_obj=product, obj_in=product_in)

@router.delete("/{id}/", response_model=ProductOut)
def delete_product(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Elimina (Soft Delete) un producto del catálogo.
    """
    product_repo = ProductRepository(db)
    product = product_repo.get(id)
    if not product or product.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product_repo.soft_delete(id=id)
