const API_URL = "https://mvp-mercados-viva-backend.onrender.com/";

const token =
    localStorage.getItem("access_token");

const usuarioGuardado =
    localStorage.getItem("usuario");


let usuario = null;
let productos = [];


if (usuarioGuardado) {
    usuario = JSON.parse(usuarioGuardado);
}


// ============================================================
// ELEMENTOS
// ============================================================

const usuarioNombre =
    document.getElementById("usuario-nombre");

const productosTabla =
    document.getElementById("productos-tabla");

const inventarioMessage =
    document.getElementById("inventario-message");

const btnLogout =
    document.getElementById("btn-logout");

const btnRecargar =
    document.getElementById("btn-recargar");


// ============================================================
// SEGURIDAD DE VISTA
// ============================================================

if (!token || !usuario) {

    window.location.href = "index.html";

} else if (usuario.rol !== "auxiliar") {

    window.location.href = "cliente.html";

} else {

    usuarioNombre.textContent =
        `Hola, ${usuario.nombre_usuario}`;

    cargarProductos();
}


// ============================================================
// CARGAR PRODUCTOS
// ============================================================

async function cargarProductos() {

    limpiarMensaje();

    productosTabla.innerHTML = `
        <tr>
            <td colspan="6">
                Cargando productos...
            </td>
        </tr>
    `;


    try {

        const response =
            await fetch(
                `${API_URL}/productos`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                "No fue posible consultar los productos."
            );
        }


        productos = data;

        renderizarProductos();


    } catch (error) {

        console.error(error);

        productosTabla.innerHTML = `
            <tr>
                <td colspan="6">
                    No fue posible cargar los productos.
                </td>
            </tr>
        `;

        mostrarMensaje(
            "No fue posible conectar con el servidor.",
            "error"
        );
    }
}


// ============================================================
// MOSTRAR PRODUCTOS
// ============================================================

function renderizarProductos() {

    productosTabla.innerHTML = "";


    if (productos.length === 0) {

        productosTabla.innerHTML = `
            <tr>
                <td colspan="6">
                    No hay productos registrados.
                </td>
            </tr>
        `;

        return;
    }


    productos.forEach(producto => {

        const fila =
            document.createElement("tr");


        const stockClase =
            producto.cantidad_disponible > 0
                ? "ok"
                : "zero";


        fila.innerHTML = `

            <td>
                ${producto.id}
            </td>

            <td>
                <strong>
                    ${producto.nombre}
                </strong>
            </td>

            <td>
                ${formatearPrecio(producto.precio)}
            </td>

            <td>

                <span
                    class="stock-badge ${stockClase}"
                    id="stock-${producto.id}"
                >
                    ${producto.cantidad_disponible}
                </span>

            </td>

            <td>

                <input
                    type="number"
                    min="0"
                    value="${producto.cantidad_disponible}"
                    class="stock-input"
                    id="input-stock-${producto.id}"
                >

            </td>

            <td>

                <button
                    class="btn-actualizar-stock"
                    id="btn-stock-${producto.id}"
                    onclick="actualizarStock(${producto.id})"
                >
                    Guardar
                </button>

            </td>

        `;


        productosTabla.appendChild(fila);

    });
}


// ============================================================
// ACTUALIZAR STOCK
// ============================================================

async function actualizarStock(productoId) {

    limpiarMensaje();


    const input =
        document.getElementById(
            `input-stock-${productoId}`
        );


    const boton =
        document.getElementById(
            `btn-stock-${productoId}`
        );


    const nuevaCantidad =
        Number(input.value);


    if (
        !Number.isInteger(nuevaCantidad) ||
        nuevaCantidad < 0
    ) {

        mostrarMensaje(
            "La cantidad debe ser un número entero mayor o igual a 0.",
            "error"
        );

        return;
    }


    boton.disabled = true;

    boton.textContent =
        "Guardando...";


    try {

        const response =
            await fetch(
                `${API_URL}/productos/${productoId}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
                    },

                    body:
                        JSON.stringify({
                            cantidad_disponible:
                                nuevaCantidad
                        })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            if (response.status === 401) {

                cerrarSesion();

                return;
            }


            if (response.status === 403) {

                mostrarMensaje(
                    "No tienes permisos para modificar el inventario.",
                    "error"
                );

                return;
            }


            mostrarMensaje(
                data.detail ||
                "No fue posible actualizar el producto.",
                "error"
            );

            return;
        }


        actualizarProductoLocal(
            data.producto
        );


        mostrarMensaje(
            `Inventario de "${data.producto.nombre}" actualizado correctamente.`,
            "success"
        );


        renderizarProductos();


    } catch (error) {

        console.error(error);

        mostrarMensaje(
            "No fue posible conectar con el servidor.",
            "error"
        );


    } finally {

        boton.disabled = false;

        boton.textContent =
            "Guardar";
    }
}


// ============================================================
// ACTUALIZAR PRODUCTO LOCAL
// ============================================================

function actualizarProductoLocal(
    productoActualizado
) {

    productos =
        productos.map(producto => {

            if (
                producto.id ===
                productoActualizado.id
            ) {

                return productoActualizado;
            }

            return producto;
        });
}


// ============================================================
// RECARGAR INVENTARIO
// ============================================================

btnRecargar.addEventListener(
    "click",
    async () => {

        await cargarProductos();
    }
);


// ============================================================
// LOGOUT
// ============================================================

btnLogout.addEventListener(
    "click",
    cerrarSesion
);


function cerrarSesion() {

    localStorage.removeItem(
        "access_token"
    );

    localStorage.removeItem(
        "refresh_token"
    );

    localStorage.removeItem(
        "usuario"
    );


    window.location.href =
        "index.html";
}


// ============================================================
// UTILIDADES
// ============================================================

function formatearPrecio(valor) {

    return new Intl.NumberFormat(
        "es-CO",
        {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0
        }
    ).format(Number(valor));
}


function mostrarMensaje(
    mensaje,
    tipo
) {

    inventarioMessage.textContent =
        mensaje;

    inventarioMessage.className =
        `message ${tipo}`;
}


function limpiarMensaje() {

    inventarioMessage.textContent =
        "";

    inventarioMessage.className =
        "message";
}