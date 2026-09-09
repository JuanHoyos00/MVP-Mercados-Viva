from pydantic import BaseModel, Field, EmailStr
from typing import List


# ============================================================
# INVENTARIO
# ============================================================

class ActualizarStock(BaseModel):
    cantidad_disponible: int = Field(ge=0)


# ============================================================
# PEDIDOS
# ============================================================

class ItemPedido(BaseModel):
    producto_id: int = Field(gt=0)
    cantidad: int = Field(gt=0)


class CrearPedido(BaseModel):
    items: List[ItemPedido] = Field(min_length=1)


# ============================================================
# AUTENTICACIÓN
# ============================================================

class RegistroUsuario(BaseModel):
    nombre_usuario: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6)


class LoginUsuario(BaseModel):
    email: EmailStr
    password: str