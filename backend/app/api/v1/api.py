from fastapi import APIRouter
from app.api.v1.routes import login, users, products, stores, shopping_lists, metrics, system

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(stores.router, prefix="/stores", tags=["stores"])
api_router.include_router(shopping_lists.router, prefix="/lists", tags=["shopping_lists"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
