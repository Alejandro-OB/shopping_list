from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
import re
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        if not re.search(r'[A-Z]', v):
            raise ValueError('La contraseña debe contener al menos una letra mayúscula')
        if not re.search(r'[0-9]', v):
            raise ValueError('La contraseña debe contener al menos un número')
        if not re.search(r'[#$%&@!]', v):
            raise ValueError('La contraseña debe contener al menos un símbolo especial (#$%&@!)')
        return v

class UserUpdateProfile(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    can_autogenerate_lists: Optional[bool] = None

class UserUpdatePassword(BaseModel):
    current_password: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('La nueva contraseña debe tener al menos 8 caracteres')
        if not re.search(r'[A-Z]', v):
            raise ValueError('La nueva contraseña debe contener al menos una letra mayúscula')
        if not re.search(r'[0-9]', v):
            raise ValueError('La nueva contraseña debe contener al menos un número')
        if not re.search(r'[#$%&@!]', v):
            raise ValueError('La nueva contraseña debe contener al menos un símbolo especial (#$%&@!)')
        return v

class UserOut(UserBase):
    id: int
    is_verified: bool
    is_admin: bool
    can_autogenerate_lists: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class PasswordRecoveryRequest(BaseModel):
    email: EmailStr

class PasswordResetRequest(BaseModel):
    token: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('La nueva contraseña debe tener al menos 8 caracteres')
        if not re.search(r'[A-Z]', v):
            raise ValueError('La nueva contraseña debe contener al menos una letra mayúscula')
        if not re.search(r'[0-9]', v):
            raise ValueError('La nueva contraseña debe contener al menos un número')
        if not re.search(r'[#$%&@!]', v):
            raise ValueError('La nueva contraseña debe contener al menos un símbolo especial (#$%&@!)')
        return v
