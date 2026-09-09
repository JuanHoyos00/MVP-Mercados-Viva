from fastapi import FastAPI, HTTPException, status, Header,  Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware

from database import supabase, supabase_admin
from schemas import (
    ActualizarStock,
    CrearPedido,
    RegistroUsuario,
    LoginUsuario
)


app = FastAPI(
    title="MVP Mercados Viva API",
    description="API para consulta y actualización de inventario",
    version="1.0.0"
)
security = HTTPBearer()

# ============================================================
# CONFIGURACIÓN CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500",'https://mvp-mercados-viva.vercel.app/'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# RUTA PRINCIPAL
# ============================================================

@app.get("/")
def inicio():
    return {
        "mensaje": "API de Mercados Viva activa"
    }


# ============================================================
# HU1 - CONSULTAR PRODUCTOS E INVENTARIO
# ============================================================

@app.get("/productos")
def obtener_productos():

    try:
        response = (
            supabase
            .table("productos")
            .select("*")
            .order("id")
            .execute()
        )

        return response.data

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al consultar los productos: {str(e)}"
        )

def obtener_usuario_desde_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    try:
        auth_response = supabase.auth.get_user(token)

        if not auth_response.user:
            raise HTTPException(
                status_code=401,
                detail="Token inválido o expirado."
            )

        usuario_id = str(auth_response.user.id)

        perfil_response = (
            supabase_admin
            .table("usuarios")
            .select("*")
            .eq("id", usuario_id)
            .execute()
        )

        if not perfil_response.data:
            raise HTTPException(
                status_code=404,
                detail="Perfil de usuario no encontrado."
            )

        perfil = perfil_response.data[0]

        return {
            "id": usuario_id,
            "email": auth_response.user.email,
            "nombre_usuario": perfil["nombre_usuario"],
            "rol": perfil["rol"]
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Token inválido o expirado."
        )

# ============================================================
# HU4 - ACTUALIZAR INVENTARIO
# ============================================================

@app.put("/productos/{producto_id}")
def actualizar_inventario(
    producto_id: int,
    datos: ActualizarStock,
    usuario=Depends(obtener_usuario_desde_token)
):

    if usuario["rol"] != "auxiliar":
        raise HTTPException(
            status_code=403,
            detail="No tienes permisos para actualizar el inventario."
        )

    try:
        producto = (
            supabase_admin
            .table("productos")
            .select("*")
            .eq("id", producto_id)
            .execute()
        )

        if not producto.data:
            raise HTTPException(
                status_code=404,
                detail="Producto no encontrado."
            )

        response = (
            supabase_admin
            .table("productos")
            .update({
                "cantidad_disponible": datos.cantidad_disponible
            })
            .eq("id", producto_id)
            .execute()
        )

        return {
            "mensaje": "Inventario actualizado exitosamente.",
            "producto": response.data[0]
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al actualizar inventario: {str(e)}"
        )
# ============================================================
# HU3 + HU5 - CONFIRMAR COMPRA
# ============================================================

@app.post("/pedidos")
def confirmar_compra(
    pedido: CrearPedido,
    usuario=Depends(obtener_usuario_desde_token)
):

    if usuario["rol"] != "cliente":
        raise HTTPException(
            status_code=403,
            detail="Solo los clientes pueden realizar pedidos."
        )

    try:
        response = supabase_admin.rpc(
            "confirmar_pedido",
            {
                "p_usuario_id": usuario["id"],
                "p_items": [
                    {
                        "producto_id": item.producto_id,
                        "cantidad": item.cantidad
                    }
                    for item in pedido.items
                ]
            }
        ).execute()

        if not response.data:
            raise HTTPException(
                status_code=400,
                detail="No fue posible confirmar el pedido."
            )

        return response.data

    except HTTPException:
        raise

    except Exception as e:
        mensaje = str(e)

        if "STOCK_INSUFICIENTE" in mensaje:
            raise HTTPException(
                status_code=409,
                detail="El producto ya no tiene suficiente inventario disponible."
            )

        if "PRODUCTO_NO_EXISTE" in mensaje:
            raise HTTPException(
                status_code=404,
                detail="Uno de los productos no existe."
            )

        if "PEDIDO_VACIO" in mensaje:
            raise HTTPException(
                status_code=400,
                detail="El pedido no contiene productos."
            )

        if "CANTIDAD_INVALIDA" in mensaje:
            raise HTTPException(
                status_code=400,
                detail="Una de las cantidades es inválida."
            )

        raise HTTPException(
            status_code=500,
            detail=f"Error al confirmar la compra: {mensaje}"
        )

@app.get("/productos/{producto_id}")
def obtener_producto(producto_id: int):
    response = (
        supabase
        .table("productos")
        .select("*")
        .eq("id", producto_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Producto no encontrado"
        )

    return response.data[0]

@app.get("/pedidos")
def obtener_pedidos():
    response = (
        supabase
        .table("pedidos")
        .select("*")
        .order("id", desc=True)
        .execute()
    )

    return response.data
@app.post("/auth/registro")
def registrar_usuario(datos: RegistroUsuario):

    try:

        # ----------------------------------------
        # 1. Verificar nombre de usuario
        # ----------------------------------------

        usuario_existente = (
            supabase_admin
            .table("usuarios")
            .select("id")
            .eq("nombre_usuario", datos.nombre_usuario)
            .execute()
        )

        if usuario_existente.data:
            raise HTTPException(
                status_code=409,
                detail="El nombre de usuario ya está registrado."
            )


        # ----------------------------------------
        # 2. Registrar usuario en Supabase Auth
        # ----------------------------------------

        auth_response = supabase.auth.sign_up({
            "email": datos.email,
            "password": datos.password
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=400,
                detail="No fue posible crear el usuario."
            )

        usuario_id = str(auth_response.user.id)


        # ----------------------------------------
        # 3. Crear perfil
        # ----------------------------------------

        supabase_admin.table("usuarios").insert({
            "id": usuario_id,
            "nombre_usuario": datos.nombre_usuario,

            # IMPORTANTE:
            # todos los registros públicos son clientes
            "rol": "cliente"
        }).execute()


        return {
            "mensaje": "Usuario registrado correctamente.",
            "usuario": {
                "id": usuario_id,
                "nombre_usuario": datos.nombre_usuario,
                "email": datos.email,
                "rol": "cliente"
            },
            "requiere_confirmacion_email":
                auth_response.session is None
        }


    except HTTPException:
        raise

    except Exception as e:

        mensaje = str(e)

        if "already registered" in mensaje.lower():
            raise HTTPException(
                status_code=409,
                detail="El correo electrónico ya está registrado."
            )

        raise HTTPException(
            status_code=400,
            detail=f"Error al registrar usuario: {mensaje}"
        )
@app.post("/auth/login")
def iniciar_sesion(datos: LoginUsuario):

    try:

        response = supabase.auth.sign_in_with_password({
            "email": datos.email,
            "password": datos.password
        })

        if not response.user or not response.session:
            raise HTTPException(
                status_code=401,
                detail="Correo o contraseña incorrectos."
            )


        usuario_id = str(response.user.id)


        perfil_response = (
            supabase_admin
            .table("usuarios")
            .select("*")
            .eq("id", usuario_id)
            .execute()
        )

        if not perfil_response.data:
            raise HTTPException(
                status_code=404,
                detail="Perfil del usuario no encontrado."
            )

        perfil = perfil_response.data[0]


        return {
            "mensaje": "Inicio de sesión exitoso.",
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "token_type": "bearer",

            "usuario": {
                "id": usuario_id,
                "email": response.user.email,
                "nombre_usuario": perfil["nombre_usuario"],
                "rol": perfil["rol"]
            }
        }


    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrectos."
        )





@app.get("/auth/me")
def obtener_usuario_actual(
    usuario=Depends(obtener_usuario_desde_token)
):
    return usuario

@app.get("/health")
def health():
    return {
        "status": "ok"
    }