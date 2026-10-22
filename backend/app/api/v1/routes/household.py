import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db.session import get_db
from app.models.user import User
from app.schemas.household import HouseholdJoinIn, HouseholdOut

router = APIRouter()

# Sin 0/O ni 1/I/L: el código se dicta o se copia a mano desde otro teléfono.
CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 8
CODE_TTL = timedelta(days=7)


def _normalize(code: str) -> str:
    return "".join(ch for ch in code.upper() if ch.isalnum())


def _invite_alive(owner: User) -> bool:
    expires = owner.household_invite_expires_at
    if owner.household_invite_code is None or expires is None:
        return False
    # SQLite devuelve la fecha sin zona aunque se haya guardado en UTC.
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return expires > datetime.now(timezone.utc)


def _household_of(db: Session, user: User) -> HouseholdOut:
    owner = db.get(User, user.owner_id)
    members = db.execute(
        select(User).filter(User.household_owner_id == owner.id).order_by(User.id)
    ).scalars().all()
    is_owner = owner.id == user.id
    invite_alive = _invite_alive(owner)
    return HouseholdOut(
        role="owner" if is_owner else "member",
        owner=owner,
        members=members,
        invite_code=owner.household_invite_code if is_owner and invite_alive else None,
        invite_expires_at=owner.household_invite_expires_at if is_owner and invite_alive else None,
    )


@router.get("/", response_model=HouseholdOut)
def read_household(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Con quién se comparten el catálogo, las tiendas y las listas."""
    return _household_of(db, current_user)


@router.post("/invite/", response_model=HouseholdOut)
def create_invite(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Genera un código para que otra cuenta se una a este hogar. Sirve una sola
    vez y vence a los 7 días; generar otro invalida el anterior.
    """
    if current_user.household_owner_id is not None:
        raise HTTPException(status_code=400, detail="Solo quien es dueño del hogar puede invitar")

    current_user.household_invite_code = "".join(
        secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH)
    )
    current_user.household_invite_expires_at = datetime.now(timezone.utc) + CODE_TTL
    db.commit()
    return _household_of(db, current_user)


@router.delete("/invite/", response_model=HouseholdOut)
def revoke_invite(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    current_user.household_invite_code = None
    current_user.household_invite_expires_at = None
    db.commit()
    return _household_of(db, current_user)


@router.post("/join/", response_model=HouseholdOut)
def join_household(
    body: HouseholdJoinIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Une la cuenta al hogar dueño del código. Desde ahí se trabaja sobre sus
    datos; los propios quedan guardados y vuelven al salir.
    """
    code = _normalize(body.code)
    owner = db.execute(
        select(User).filter(User.household_invite_code == code)
    ).scalars().first()
    if owner is None or not _invite_alive(owner):
        raise HTTPException(status_code=400, detail="El código no es válido o ya venció")
    if owner.id == current_user.id:
        raise HTTPException(status_code=400, detail="Ese código es de tu propio hogar")
    if current_user.household_owner_id is not None:
        raise HTTPException(status_code=400, detail="Ya compartes otro hogar; sal de él primero")
    has_members = db.execute(
        select(User.id).filter(User.household_owner_id == current_user.id)
    ).first()
    if has_members:
        # Un solo nivel: si no, los miembros de este hogar quedarían colgando
        # de uno que ya no usa nadie.
        raise HTTPException(
            status_code=400,
            detail="Otras personas comparten tu hogar; sácalas antes de unirte a otro",
        )

    current_user.household_owner_id = owner.id
    owner.household_invite_code = None
    owner.household_invite_expires_at = None
    db.commit()
    return _household_of(db, current_user)


@router.post("/leave/", response_model=HouseholdOut)
def leave_household(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Vuelve a los datos propios. Lo que se hizo en el hogar compartido se queda allá."""
    if current_user.household_owner_id is None:
        raise HTTPException(status_code=400, detail="No estás en el hogar de otra persona")
    current_user.household_owner_id = None
    db.commit()
    return _household_of(db, current_user)


@router.delete("/members/{member_id}/", response_model=HouseholdOut)
def remove_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    member = db.get(User, member_id)
    if member is None or member.household_owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Esa persona no está en tu hogar")
    member.household_owner_id = None
    db.commit()
    return _household_of(db, current_user)
