from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Any

from app.core.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.repositories.store_repo import StoreRepository
from app.schemas.store import StoreCreate, StoreUpdate, StoreOut, ProductStoreCreate, ProductStoreOut

router = APIRouter()

@router.get("/", response_model=List[StoreOut])
def read_stores(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Obtiene la lista de tiendas del usuario actual.
    """
    store_repo = StoreRepository(db)
    return store_repo.get_by_user(current_user.id, skip=skip, limit=limit)

@router.post("/", response_model=StoreOut)
def create_store(
    *,
    db: Session = Depends(get_db),
    store_in: StoreCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Crea una nueva tienda para el usuario.
    """
    store_repo = StoreRepository(db)
    return store_repo.create(obj_in=store_in, user_id=current_user.id)

@router.get("/{id}/", response_model=StoreOut)
def read_store(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Obtiene el detalle de una tienda específica.
    """
    store_repo = StoreRepository(db)
    store = store_repo.get(id)
    if not store or store.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    return store

@router.put("/{id}/", response_model=StoreOut)
def update_store(
    *,
    db: Session = Depends(get_db),
    id: int,
    store_in: StoreUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Actualiza la información de una tienda.
    """
    store_repo = StoreRepository(db)
    store = store_repo.get(id)
    if not store or store.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    return store_repo.update(db_obj=store, obj_in=store_in)

@router.delete("/{id}/", response_model=StoreOut)
def delete_store(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Elimina (Soft Delete) una tienda.
    """
    store_repo = StoreRepository(db)
    store = store_repo.get(id)
    if not store or store.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    return store_repo.soft_delete(id=id)

@router.post("/product-store/", response_model=ProductStoreOut)
def associate_product_store(
    *,
    db: Session = Depends(get_db),
    ps_in: ProductStoreCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Asocia un producto con una tienda y define su precio de catálogo.
    """
    from app.models.product_store import ProductStore
    db_obj = ProductStore(
        product_id=ps_in.product_id,
        store_id=ps_in.store_id,
        price_catalog=ps_in.price_catalog
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.patch("/product-store/{id}/", response_model=ProductStoreOut)
def update_product_store_price(
    *,
    db: Session = Depends(get_db),
    id: int,
    price_catalog: float = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Actualiza el precio de catálogo de una relación producto-tienda.
    """
    from app.models.product_store import ProductStore
    db_obj = db.get(ProductStore, id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Relación no encontrada")
    if price_catalog <= 0:
        raise HTTPException(status_code=400, detail="El precio debe ser mayor a 0")
    db_obj.price_catalog = price_catalog
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.delete("/product-store/{id}/", response_model=ProductStoreOut)
def delete_product_store(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Elimina (Soft Delete) una relación producto-tienda.
    """
    from app.models.product_store import ProductStore
    db_obj = db.get(ProductStore, id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Relación no encontrada")
    
    db_obj.is_deleted = True
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
