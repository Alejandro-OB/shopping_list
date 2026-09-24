from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any

from app.core.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.repositories.product_repo import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, StockAdjust

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
    Crea un nuevo producto en el catálogo del usuario, con sus tiendas.
    """
    from app.models.product_store import ProductStore
    from app.models.store import Store

    store_ids = [s.store_id for s in product_in.stores]
    if len(set(store_ids)) != len(store_ids):
        raise HTTPException(status_code=400, detail="Hay una tienda repetida en el producto")
    if sum(1 for s in product_in.stores if s.is_preferred) > 1:
        raise HTTPException(status_code=400, detail="Solo puede haber una tienda habitual")

    owned = {
        store.id
        for store in db.query(Store).filter(Store.id.in_(store_ids)).all()
        if store.user_id == current_user.id
    }
    if len(owned) != len(set(store_ids)):
        raise HTTPException(status_code=404, detail="Tienda no encontrada")

    # El producto se construye aquí y no con el create genérico del repositorio:
    # ese vuelca todos los campos del esquema sobre el modelo, y "stores" no es
    # una columna sino los vínculos que se crean a continuación.
    from app.models.product import Product

    product = Product(
        name=product_in.name,
        category=product_in.category,
        frequency=product_in.frequency,
        frequency_start_date=product_in.frequency_start_date,
        stock=product_in.stock,
        stock_min=product_in.stock_min,
        units_per_purchase=product_in.units_per_purchase,
        user_id=current_user.id,
    )
    db.add(product)
    db.flush()

    for link in product_in.stores:
        db.add(ProductStore(
            product_id=product.id,
            store_id=link.store_id,
            price_catalog=link.price_catalog,
            is_preferred=link.is_preferred,
        ))
    db.commit()
    db.refresh(product)
    return product

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

@router.patch("/{id}/stock/", response_model=ProductOut)
def adjust_product_stock(
    *,
    db: Session = Depends(get_db),
    id: int,
    adjust: StockAdjust,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Descuenta o repone existencias de un producto.

    La merma es manual por decisión de diseño: el consumo no se puede observar y
    estimarlo por la frecuencia haría que el sistema comprara lo que no hace
    falta sin que nadie sepa por qué. Ver el modelo Product.
    """
    product_repo = ProductRepository(db)
    product = product_repo.get(id)
    if not product or product.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if product.stock is None:
        raise HTTPException(
            status_code=400,
            detail="Este producto no lleva inventario. Actívalo antes de ajustar existencias.",
        )

    if adjust.delta is not None:
        # Nunca por debajo de cero: "me quedan menos que ninguno" no significa
        # nada y ensuciaría la comparación con el mínimo.
        new_stock = max(0.0, float(product.stock) + adjust.delta)
    else:
        new_stock = adjust.stock

    product.stock = new_stock
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

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
