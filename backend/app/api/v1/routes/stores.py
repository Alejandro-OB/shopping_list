from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Any

from app.core.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.repositories.store_repo import StoreRepository
from app.schemas.store import StoreCreate, StoreUpdate, StoreOut, ProductStoreCreate, ProductStoreUpdate, ProductStoreOut

router = APIRouter()


def _owned_product_store(db: Session, ps_id: int, user_id: int):
    """
    Devuelve el vínculo producto-tienda si es del usuario, o 404.

    Los tres endpoints de vínculo buscaban por id y actuaban sin mirar de quién
    era lo que tocaban, a diferencia del resto del proyecto: con un id numérico
    cualquiera podía cambiarle el precio de catálogo a otro usuario o borrarle
    un vínculo. Se responde 404 y no 403 para no confirmar que el id existe.
    """
    from app.models.product_store import ProductStore
    db_obj = db.get(ProductStore, ps_id)
    if not db_obj or db_obj.product is None or db_obj.product.user_id != user_id:
        raise HTTPException(status_code=404, detail="Relación no encontrada")
    return db_obj

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
    from app.models.product import Product
    from app.models.store import Store

    product = db.get(Product, ps_in.product_id)
    store = db.get(Store, ps_in.store_id)
    if not product or product.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if not store or store.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")

    db_obj = ProductStore(
        product_id=ps_in.product_id,
        store_id=ps_in.store_id,
        price_catalog=ps_in.price_catalog,
        is_preferred=ps_in.is_preferred,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.patch("/product-store/{id}/", response_model=ProductStoreOut)
def update_product_store(
    *,
    db: Session = Depends(get_db),
    id: int,
    ps_in: ProductStoreUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Actualiza el precio de catálogo o la tienda habitual de un vínculo.
    """
    from app.models.product_store import ProductStore

    db_obj = _owned_product_store(db, id, current_user.id)

    if ps_in.price_catalog is not None:
        db_obj.price_catalog = ps_in.price_catalog

    if ps_in.is_preferred is not None:
        if ps_in.is_preferred:
            # Solo puede haber una habitual por producto, y la base lo exige con
            # un índice único: se apagan las demás en la misma transacción para
            # no chocar contra él al marcar una nueva.
            siblings = db.query(ProductStore).filter(
                ProductStore.product_id == db_obj.product_id,
                ProductStore.id != db_obj.id,
                ProductStore.is_preferred == True,  # noqa: E712
            ).all()
            for sibling in siblings:
                sibling.is_preferred = False
                db.add(sibling)
        db_obj.is_preferred = ps_in.is_preferred

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

    db_obj = _owned_product_store(db, id, current_user.id)

    # No se quita la última: un producto sin tienda no tiene precio ni se puede
    # añadir a una lista, así que dejarlo así lo saca del catálogo en la
    # práctica sin que nadie lo haya pedido. Para eso está borrar el producto.
    remaining = db.query(ProductStore).filter(
        ProductStore.product_id == db_obj.product_id,
        ProductStore.id != db_obj.id,
        ProductStore.is_deleted == False,  # noqa: E712
    ).count()
    if remaining == 0:
        raise HTTPException(
            status_code=400,
            detail="El producto debe quedar con al menos una tienda. Vincula otra antes de quitar esta.",
        )

    db_obj.is_deleted = True
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
