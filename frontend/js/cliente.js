const API_URL = "http://127.0.0.1:8000";

const token = localStorage.getItem("access_token");
const usuarioGuardado = localStorage.getItem("usuario");

let usuario = null;

if (usuarioGuardado) {
    usuario = JSON.parse(usuarioGuardado);
}

let productos = [];
let carrito = [];


// ============================================================
// ELEMENTOS
// ============================================================

const productosContainer =
    document.getElementById("productos-container");

const carritoItems =
    document.getElementById("carrito-items");

const carritoContador =
    document.getElementById("carrito-contador");

const carritoTotal =
    document.getElementById("carrito-total");

const btnConfirmar =
    document.getElementById("btn-confirmar");

const compraMessage =
    document.getElementById("compra-message");

const btnLogout =
    document.getElementById("btn-logout");

const btnRecargar =
    document.getElementById("btn-recargar");

const usuarioNombre =
    document.getElementById("usuario-nombre");


// ============================================================
// SEGURIDAD BÁSICA DE LA VISTA
// ============================================================

if (!token || !usuario) {

    window.location.href = "index.html";

} else if (usuario.rol !== "cliente") {

    window.location.href = "auxiliar.html";

} else {

    usuarioNombre.textContent =
        `Hola, ${usuario.nombre_usuario}`;

    cargarProductos();
}


// ============================================================
// CARGAR PRODUCTOS
// ============================================================

async function cargarProductos() {

    productosContainer.innerHTML =
        "<p>Cargando productos...</p>";

    try {

        const response =
            await fetch(`${API_URL}/productos`);

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error("Error al consultar productos");
        }

        productos = data;

        renderizarProductos();

    } catch (error) {

        console.error(error);

        productosContainer.innerHTML = `
            <p>
                No fue posible cargar los productos.
            </p>
        `;
    }
}


// ============================================================
// MOSTRAR PRODUCTOS
// ============================================================

function renderizarProductos() {

    productosContainer.innerHTML = "";

    if (productos.length === 0) {

        productosContainer.innerHTML =
            "<p>No hay productos registrados.</p>";

        return;
    }


    productos.forEach(producto => {

        const card =
            document.createElement("article");

        card.className =
            "producto-card";


        const disponible =
            producto.cantidad_disponible > 0;


        card.innerHTML = `

            <h3>
                ${producto.nombre}
            </h3>

            <div class="producto-precio">
                ${formatearPrecio(producto.precio)}
            </div>

            <p class="producto-stock">

                ${
                    disponible

                    ? `
                        <span class="stock-disponible">
                            ${producto.cantidad_disponible}
                            disponibles
                        </span>
                    `

                    : `
                        <span class="stock-agotado">
                            Agotado
                        </span>
                    `
                }

            </p>

            <button
                class="btn-primary"
                ${!disponible ? "disabled" : ""}
                onclick="agregarAlCarrito(${producto.id})"
            >
                ${
                    disponible
                        ? "Agregar al carrito"
                        : "No disponible"
                }
            </button>
        `;


        productosContainer.appendChild(card);

    });
}


// ============================================================
// AGREGAR AL CARRITO
// ============================================================

function agregarAlCarrito(productoId) {

    limpiarMensajeCompra();

    const producto =
        productos.find(
            p => p.id === productoId
        );

    if (!producto) {
        return;
    }


    const itemExistente =
        carrito.find(
            item => item.producto_id === productoId
        );


    if (itemExistente) {

        if (
            itemExistente.cantidad >=
            producto.cantidad_disponible
        ) {

            mostrarMensaje(
                compraMessage,
                "No puedes agregar más unidades que las disponibles.",
                "error"
            );

            return;
        }


        itemExistente.cantidad++;

    } else {

        carrito.push({
            producto_id: producto.id,
            nombre: producto.nombre,
            precio: Number(producto.precio),
            cantidad: 1
        });

    }


    renderizarCarrito();
}


// ============================================================
// MODIFICAR CANTIDAD
// ============================================================

function aumentarCantidad(productoId) {

    const producto =
        productos.find(
            p => p.id === productoId
        );

    const item =
        carrito.find(
            i => i.producto_id === productoId
        );


    if (!producto || !item) {
        return;
    }


    if (
        item.cantidad >=
        producto.cantidad_disponible
    ) {

        mostrarMensaje(
            compraMessage,
            "No hay más unidades disponibles.",
            "error"
        );

        return;
    }


    item.cantidad++;

    renderizarCarrito();
}


function disminuirCantidad(productoId) {

    const item =
        carrito.find(
            i => i.producto_id === productoId
        );


    if (!item) {
        return;
    }


    item.cantidad--;


    if (item.cantidad <= 0) {

        carrito =
            carrito.filter(
                i => i.producto_id !== productoId
            );
    }


    renderizarCarrito();
}


// ============================================================
// RENDERIZAR CARRITO
// ============================================================

function renderizarCarrito() {

    carritoItems.innerHTML = "";


    if (carrito.length === 0) {

        carritoItems.innerHTML = `
            <p class="carrito-vacio">
                Tu carrito está vacío.
            </p>
        `;

        carritoContador.textContent = "0";

        carritoTotal.textContent = "$0";

        btnConfirmar.disabled = true;

        return;
    }


    let cantidadTotal = 0;
    let total = 0;


    carrito.forEach(item => {

        cantidadTotal += item.cantidad;

        total +=
            item.precio * item.cantidad;


        const div =
            document.createElement("div");

        div.className =
            "carrito-item";


        div.innerHTML = `

            <div>

                <h4>
                    ${item.nombre}
                </h4>

                <p>
                    ${formatearPrecio(item.precio)}
                    x ${item.cantidad}
                </p>

            </div>

            <div class="item-controls">

                <button
                    onclick="disminuirCantidad(${item.producto_id})"
                >
                    −
                </button>

                <span>
                    ${item.cantidad}
                </span>

                <button
                    onclick="aumentarCantidad(${item.producto_id})"
                >
                    +
                </button>

            </div>
        `;


        carritoItems.appendChild(div);

    });


    carritoContador.textContent =
        cantidadTotal;

    carritoTotal.textContent =
        formatearPrecio(total);

    btnConfirmar.disabled = false;
}


// ============================================================
// CONFIRMAR COMPRA
// ============================================================

btnConfirmar.addEventListener(
    "click",
    async () => {

        limpiarMensajeCompra();

        if (carrito.length === 0) {
            return;
        }


        btnConfirmar.disabled = true;

        btnConfirmar.textContent =
            "Confirmando...";


        const items =
            carrito.map(item => ({
                producto_id: item.producto_id,
                cantidad: item.cantidad
            }));


        try {

            const response =
                await fetch(
                    `${API_URL}/pedidos`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`
                        },

                        body:
                            JSON.stringify({
                                items
                            })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                if (response.status === 409) {

                    mostrarMensaje(
                        compraMessage,
                        "Uno de los productos se agotó antes de confirmar la compra. El inventario fue actualizado.",
                        "error"
                    );

                    await cargarProductos();

                    return;
                }


                if (response.status === 401) {

                    cerrarSesion();

                    return;
                }


                mostrarMensaje(
                    compraMessage,
                    data.detail ||
                    "No fue posible confirmar la compra.",
                    "error"
                );

                return;
            }


            mostrarMensaje(
                compraMessage,
                `Compra confirmada. Pedido #${data.pedido_id}`,
                "success"
            );


            carrito = [];

            renderizarCarrito();

            await cargarProductos();


        } catch (error) {

            console.error(error);

            mostrarMensaje(
                compraMessage,
                "No fue posible conectar con el servidor.",
                "error"
            );

        } finally {

            btnConfirmar.textContent =
                "Confirmar compra";

            if (carrito.length > 0) {
                btnConfirmar.disabled = false;
            }

        }

    }
);


// ============================================================
// ACTUALIZAR PRODUCTOS
// ============================================================

btnRecargar.addEventListener(
    "click",
    async () => {

        limpiarMensajeCompra();

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
    elemento,
    mensaje,
    tipo
) {

    elemento.textContent =
        mensaje;

    elemento.className =
        `message ${tipo}`;
}


function limpiarMensajeCompra() {

    compraMessage.textContent =
        "";

    compraMessage.className =
        "message";
}