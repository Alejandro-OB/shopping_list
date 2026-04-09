from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from sqlalchemy.orm import Session
from sqlalchemy import select, update
from pydantic import BaseModel

from app.core.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get(self, id: Any) -> Optional[ModelType]:
        """
        Obtiene un registro por ID, respetando is_deleted si el modelo lo tiene.
        """
        query = select(self.model).filter(self.model.id == id)
        if hasattr(self.model, "is_deleted"):
            query = query.filter(self.model.is_deleted == False)
        return self.db.execute(query).scalars().first()

    def get_multi(self, *, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """
        Obtiene múltiples registros (paginado).
        """
        query = select(self.model)
        if hasattr(self.model, "is_deleted"):
            query = query.filter(self.model.is_deleted == False)
        return self.db.execute(query.offset(skip).limit(limit)).scalars().all()

    def create(self, *, obj_in: CreateSchemaType, user_id: Optional[int] = None) -> ModelType:
        """
        Crea un nuevo registro.
        """
        obj_in_data = obj_in.model_dump()
        db_obj = self.model(**obj_in_data)
        if user_id:
            db_obj.user_id = user_id
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, *, db_obj: ModelType, obj_in: Union[UpdateSchemaType, Dict[str, Any]]) -> ModelType:
        """
        Actualiza un registro existente.
        """
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
            
        for field in update_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, update_data[field])
        
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def remove(self, *, id: int) -> ModelType:
        """
        Borrado físico del registro (usar con precaución).
        """
        obj = self.db.get(self.model, id)
        self.db.delete(obj)
        self.db.commit()
        return obj

    def soft_delete(self, *, id: int) -> Optional[ModelType]:
        """
        Marca un registro como eliminado sin borrarlo físicamente.
        """
        if not hasattr(self.model, "is_deleted"):
            raise AttributeError(f"El modelo {self.model.__name__} no soporta soft delete")
        
        db_obj = self.get(id)
        if db_obj:
            db_obj.is_deleted = True
            self.db.add(db_obj)
            self.db.commit()
            self.db.refresh(db_obj)
        return db_obj
