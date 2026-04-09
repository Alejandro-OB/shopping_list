from fastapi import APIRouter, Depends, HTTPException, status, Body, Response
from sqlalchemy.orm import Session
from typing import List, Any
import io
import os
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from app.core.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.shopping_list_service import ShoppingListService
from app.repositories.shopping_list_repo import ShoppingListRepository
from app.schemas.shopping_list import ShoppingListOut, ShoppingListItemUpdate, ShoppingListItemOut, ListStatus, ShoppingListManualCreate, ShoppingListUpdate, ShoppingListItemCreate

router = APIRouter()

@router.post("/generate", response_model=None)
def generate_lists(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Ejecuta el motor de generación automática para el usuario actual.
    """
    service = ShoppingListService(db)
    # Nota: El servicio actual genera para todos, pero lo adaptamos para que sea funcional como trigger
    service.generate_auto_lists()
    return {"message": "Proceso de generación automática completado."}

@router.post("/", response_model=ShoppingListOut)
def create_shopping_list(
    *,
    db: Session = Depends(get_db),
    list_in: ShoppingListManualCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Crea una lista de compras manual con los product-store seleccionados.
    """
    from app.models.shopping_list import ShoppingList, ListStatus as ModelListStatus
    from app.models.shopping_list_item import ShoppingListItem
    from app.models.product_store import ProductStore
    from sqlalchemy.orm import joinedload
    from sqlalchemy import select, and_, extract
    import datetime

    # 1. Verificar que no exista ya una lista (cualquier estado) para la misma semana ISO
    list_date = list_in.date  # datetime UTC del frontend
    # Calcular inicio y fin de la semana ISO (lunes a domingo) de list_date
    iso_weekday = list_date.isoweekday()  # 1=lun … 7=dom
    week_start = list_date - datetime.timedelta(days=iso_weekday - 1)
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end   = week_start + datetime.timedelta(days=7)

    existing_any = db.execute(
        select(ShoppingList).where(
            and_(
                ShoppingList.user_id == current_user.id,
                ShoppingList.date >= week_start,
                ShoppingList.date <  week_end,
            )
        )
    ).scalars().first()

    if existing_any:
        raise HTTPException(
            status_code=409,
            detail=f"Ya existe una lista para la semana del {week_start.strftime('%d/%m/%Y')}: "
                   f"\"{existing_any.name}\". La nueva lista debe ser para una semana diferente."
        )

    # 2. Crear el encabezado de la lista
    new_list = ShoppingList(
        user_id=current_user.id,
        name=list_in.name,
        date=list_in.date,
        status=ModelListStatus.active,
        is_auto_generated=False,
    )
    new_list.items = []

    # 3. Agregar los ítems
    for item_in in list_in.items:
        ps = db.get(ProductStore, item_in.product_store_id)
        if not ps:
            continue
        item = ShoppingListItem(
            product_store_id=item_in.product_store_id,
            quantity=item_in.quantity,
            checked=False,
            price_catalog_snapshot=float(ps.price_catalog),
            price_real=0,
        )
        new_list.items.append(item)

    # 4. Guardar
    db.add(new_list)
    db.commit()

    db.commit()
    return ShoppingListRepository(db).get(new_list.id)

@router.post("/{id}/items", response_model=ShoppingListOut)
def add_items_to_list(
    *,
    db: Session = Depends(get_db),
    id: int,
    items_in: List[ShoppingListItemCreate],
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Agrega nuevos ítems a una lista de compras activa existente.
    Ignora duplicados (si el product_store ya está en la lista).
    """
    from app.models.shopping_list import ShoppingList, ListStatus as ModelListStatus
    from app.models.shopping_list_item import ShoppingListItem
    from app.models.product_store import ProductStore
    from sqlalchemy.orm import joinedload
    from sqlalchemy import select, and_

    shopping_list = db.get(ShoppingList, id)
    if not shopping_list or shopping_list.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    if shopping_list.status == ModelListStatus.completed:
        raise HTTPException(status_code=400, detail="No se pueden agregar ítems a una lista ya completada")

    # IDs de product_store ya presentes en la lista
    existing_ps_ids = {item.product_store_id for item in shopping_list.items}

    for item_in in items_in:
        if item_in.product_store_id in existing_ps_ids:
            continue  # Ya existe, saltar
        ps = db.get(ProductStore, item_in.product_store_id)
        if not ps:
            continue
        item = ShoppingListItem(
            list_id=shopping_list.id,
            product_store_id=item_in.product_store_id,
            quantity=item_in.quantity,
            checked=False,
            price_catalog_snapshot=float(ps.price_catalog),
            price_real=0,
        )
        db.add(item)

    db.commit()

    return ShoppingListRepository(db).get(id)

@router.get("/", response_model=List[ShoppingListOut])
def read_shopping_lists(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Obtiene el historial de listas de compras del usuario.
    """
    from app.repositories.shopping_list_repo import ShoppingListRepository
    repo = ShoppingListRepository(db)
    return repo.get_by_user(current_user.id, skip=skip, limit=limit)

@router.patch("/{id}", response_model=ShoppingListOut)
def update_shopping_list(
    *,
    db: Session = Depends(get_db),
    id: int,
    list_in: ShoppingListUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Actualiza una lista de compras existente (ej. renombrar).
    """
    from app.models.shopping_list import ShoppingList, ListStatus
    from app.models.shopping_list_item import ShoppingListItem
    from app.models.product_store import ProductStore
    from sqlalchemy.orm import joinedload
    
    shopping_list = db.get(ShoppingList, id)
    if not shopping_list or shopping_list.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
        
    if shopping_list.status == ListStatus.completed:
        raise HTTPException(status_code=400, detail="No se puede modificar una lista completada")

    update_data = list_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(shopping_list, field, value)

    db.commit()
    from app.repositories.shopping_list_repo import ShoppingListRepository
    return ShoppingListRepository(db).get(id)

@router.get("/{id}", response_model=ShoppingListOut)
def read_shopping_list(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Obtiene el detalle completo de una lista, incluyendo sus ítems.
    """
    from app.repositories.shopping_list_repo import ShoppingListRepository
    repo = ShoppingListRepository(db)
    shopping_list = repo.get(id)
    if not shopping_list or shopping_list.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    return shopping_list

@router.patch("/items/{item_id}/check", response_model=ShoppingListItemOut)
def check_shopping_item(
    *,
    db: Session = Depends(get_db),
    item_id: int,
    item_in: ShoppingListItemUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Marca un ítem como comprado asignando el precio real pagado.
    """
    service = ShoppingListService(db)
    try:
        # Validación: El item debe pertenecer a una lista del usuario
        from app.models.shopping_list_item import ShoppingListItem
        item = db.get(ShoppingListItem, item_id)
        if not item or item.shopping_list.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Ítem no encontrado")
            
        return service.check_item(item_id, item_in.price_real)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/items/{item_id}", response_model=ShoppingListItemOut)
def update_shopping_item(
    *,
    db: Session = Depends(get_db),
    item_id: int,
    item_in: ShoppingListItemUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Actualiza un ítem de la lista (ej. cantidad o estado).
    """
    from app.models.shopping_list_item import ShoppingListItem
    from app.models.shopping_list import ListStatus
    
    item = db.get(ShoppingListItem, item_id)
    if not item or item.shopping_list.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")
        
    if item.shopping_list.status == ListStatus.completed:
        raise HTTPException(status_code=400, detail="No se puede editar ítems de una lista completada")

    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item

@router.delete("/items/{item_id}")
def delete_shopping_item(
    *,
    db: Session = Depends(get_db),
    item_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Elimina un ítem de una lista de compras (si la lista no está completada).
    """
    from app.models.shopping_list_item import ShoppingListItem
    from app.models.shopping_list import ListStatus
    
    item = db.get(ShoppingListItem, item_id)
    if not item or item.shopping_list.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")
        
    if item.shopping_list.status == ListStatus.completed:
        raise HTTPException(status_code=400, detail="No se puede eliminar ítems de una lista completada")
        
    db.delete(item)
    db.commit()
    return {"message": "Producto eliminado de la lista"}

@router.get("/{list_id}/export", response_class=Response)
def export_shopping_list_pdf(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Genera un archivo PDF estilizado de la lista de compras.
    """
    # 1. Obtener la lista y validar pertenencia
    from app.repositories.shopping_list_repo import ShoppingListRepository
    import os, io
    from jinja2 import Environment, FileSystemLoader
    from weasyprint import HTML
    from datetime import datetime
    from fastapi import Response

    list_repo = ShoppingListRepository(db)
    shopping_list = list_repo.get(list_id)
    
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    if shopping_list.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para acceder a esta lista")

    # 2. Preparar datos para la plantilla
    # Ordenar ítems por nombre de tienda para facilitar la compra
    items = sorted(shopping_list.items, key=lambda x: x.product_store.store.name)
    total_projected = sum((item.price_catalog_snapshot or 0) * item.quantity for item in items if item.price_catalog_snapshot)
    total_real      = sum((item.price_real or 0) * item.quantity for item in items if item.checked)

    # 3. Renderizar HTML con Jinja2
    template_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "templates")
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template("export_list.html")
    
    html_content = template.render(
        shopping_list=shopping_list,
        items=items,
        total_projected=total_projected,
        total_real=total_real,
        user=current_user,
        today=datetime.now().strftime("%d/%m/%Y %H:%M"),
        current_year=datetime.now().year
    )

    # 4. Convertir HTML a PDF con WeasyPrint
    pdf_buffer = io.BytesIO()
    HTML(string=html_content).write_pdf(pdf_buffer)
    pdf_buffer.seek(0)

    filename = f"lista_{shopping_list.date.strftime('%Y%m%d')}.pdf"
    
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/{id}/export-excel")
def export_shopping_list_excel(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Exporta la lista de compras a un archivo Excel (.xlsx) con casillas de verificación reales (clickeables).
    """
    from app.repositories.shopping_list_repo import ShoppingListRepository
    import xlsxwriter
    from io import BytesIO

    # 1. Obtener datos
    repo = ShoppingListRepository(db)
    shopping_list = repo.get(id)
    
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    if shopping_list.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso")

    # 2. Preparar el buffer
    excel_buffer = BytesIO()
    workbook = xlsxwriter.Workbook(excel_buffer, {'in_memory': True})
    worksheet = workbook.add_worksheet("Lista de Compras")

    # 3. Definir Estilos
    header_format = workbook.add_format({
        'bold': True,
        'font_color': 'white',
        'bg_color': '#7c3aed',
        'align': 'center',
        'valign': 'vcenter',
        'border': 1,
        'border_color': '#e2e8f0'
    })
    
    cell_format = workbook.add_format({
        'valign': 'vcenter',
        'border': 1,
        'border_color': '#e2e8f0'
    })

    status_format = workbook.add_format({
        'valign': 'vcenter',
        'align': 'center',
        'border': 1,
        'border_color': '#e2e8f0',
        'font_size': 12
    })
    
    price_format = workbook.add_format({
        'num_format': '"$"#,##0',
        'valign': 'vcenter',
        'border': 1,
        'border_color': '#e2e8f0',
        'align': 'right'
    })
    
    total_label_format = workbook.add_format({
        'bold': True,
        'align': 'right',
        'valign': 'vcenter'
    })
    
    total_value_format = workbook.add_format({
        'bold': True,
        'num_format': '"$"#,##0',
        'valign': 'vcenter',
        'font_color': '#059669',
        'align': 'right'
    })

    title_format = workbook.add_format({
        'bold': True,
        'font_size': 14,
        'font_color': '#1e293b'
    })

    # 4. Encabezados de Información General
    worksheet.merge_range('A1:E1', f"Lista: {shopping_list.name or 'Semanales'}", title_format)
    worksheet.write('A2', f"Fecha: {shopping_list.date.strftime('%d/%m/%Y')}", workbook.add_format({'font_color': '#64748b'}))
    
    # 5. Tabla de Ítems
    headers = ["Estado", "Producto", "Tienda", "Cant.", "P. Catálogo", "P. Real (Unit.)", "Subtotal Real"]
    start_row = 3
    
    for col, text in enumerate(headers):
        worksheet.write(start_row, col, text, header_format)

    # Configurar anchos de columna (Estado disminuido como pidió el usuario)
    worksheet.set_column(0, 0, 6)    # Estado (Aún más estrecho para Checklist)
    worksheet.set_column(1, 1, 35)   # Producto
    worksheet.set_column(2, 2, 20)   # Tienda
    worksheet.set_column(3, 3, 8)    # Cant.
    worksheet.set_column(4, 4, 15)   # P. Catálogo
    worksheet.set_column(5, 5, 15)   # P. Real Unit.
    worksheet.set_column(6, 6, 18)   # Subtotal Real

    # Datos
    items = sorted(shopping_list.items, key=lambda x: (x.product_store.store.name if x.product_store and x.product_store.store else ""))
    
    current_row = start_row + 1
    total_est_sum = 0
    data_start_row = current_row + 1 # +1 porque Excel es 1-indexed

    for item in items:
        # Columna Estado: CASILLA DE VERIFICACIÓN cliclable (Nativo Excel 365)
        # Valor booleano vinculado a la casilla
        is_checked = item.checked
        worksheet.insert_checkbox(current_row, 0, is_checked, cell_format)
        
        # Producto y Tienda
        worksheet.write(current_row, 1, item.product_store.product.name, cell_format)
        worksheet.write(current_row, 2, item.product_store.store.name, cell_format)
        
        # Cantidad
        worksheet.write(current_row, 3, item.quantity, cell_format)
        
        # Precio Catálogo
        p_catalog = item.price_catalog_snapshot or 0
        total_est_sum += (p_catalog * item.quantity)
        worksheet.write(current_row, 4, p_catalog, price_format)
        
        # Precio Real (Manual)
        p_real = item.price_real if item.checked else 0
        worksheet.write(current_row, 5, p_real, price_format)
        
        # Subtotal Real (Fórmula: Cant * P.Real)
        # Ubicaciones: D=3, F=5, G=6 (0-indexed)
        formula = f"=D{current_row+1}*F{current_row+1}"
        worksheet.write_formula(current_row, 6, formula, price_format)

        current_row += 1

    # 6. Totales al final
    data_end_row = current_row # current_row ya pasó el último ítem
    
    worksheet.write(current_row + 1, 4, "TOTAL ESTIMADO:", total_label_format)
    worksheet.write(current_row + 1, 5, total_est_sum, total_value_format)
    
    worksheet.write(current_row + 2, 4, "TOTAL PAGADO:", total_label_format)
    # Fórmula: Suma de la columna Subtotal Real (columna G = index 6)
    total_formula = f"=SUM(G{data_start_row}:G{data_end_row})"
    worksheet.write_formula(current_row + 2, 5, total_formula, total_value_format)

    # 7. Finalizar y enviar
    workbook.close()
    excel_buffer.seek(0)

    filename = f"lista_{shopping_list.date.strftime('%Y%m%d')}.xlsx"
    
    return Response(
        content=excel_buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.post("/{id}/complete", response_model=ShoppingListOut)
def complete_shopping_list(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Cierra la lista (status=completed). Una vez cerrada no puede ser editada.
    """
    service = ShoppingListService(db)
    from app.repositories.shopping_list_repo import ShoppingListRepository
    repo = ShoppingListRepository(db)
    shopping_list = repo.get(id)
    
    if not shopping_list or shopping_list.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
        
    return service.complete_list(id)

@router.delete("/{id}", response_model=ShoppingListOut)
def delete_shopping_list(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Elimina una lista de compras. Solo se pueden eliminar listas activas o en borrador.
    Las listas completadas NO pueden eliminarse.
    """
    from app.models.shopping_list import ShoppingList, ListStatus as ModelListStatus
    from app.models.shopping_list_item import ShoppingListItem
    from sqlalchemy.orm import joinedload

    shopping_list = db.get(ShoppingList, id)
    if not shopping_list or shopping_list.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    if shopping_list.status == ModelListStatus.completed:
        raise HTTPException(status_code=400, detail="Las listas completadas no pueden eliminarse")

    # Cargar con relaciones para poder retornar el objeto completo antes de eliminar
    result = db.query(ShoppingList).options(
        joinedload(ShoppingList.items)
            .joinedload(ShoppingListItem.product_store)
    ).filter(ShoppingList.id == id).first()

    db.delete(shopping_list)
    db.commit()
    return result
