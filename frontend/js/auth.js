const API_URL = "http://127.0.0.1:8000";


// ============================================================
// ELEMENTOS
// ============================================================

const btnTabLogin =
    document.getElementById("btn-tab-login");

const btnTabRegistro =
    document.getElementById("btn-tab-registro");

const formLogin =
    document.getElementById("form-login");

const formRegistro =
    document.getElementById("form-registro");

const loginMessage =
    document.getElementById("login-message");

const registroMessage =
    document.getElementById("registro-message");


// ============================================================
// CAMBIO ENTRE LOGIN Y REGISTRO
// ============================================================

btnTabLogin.addEventListener("click", () => {

    btnTabLogin.classList.add("active");
    btnTabRegistro.classList.remove("active");

    formLogin.classList.remove("hidden");
    formRegistro.classList.add("hidden");

    limpiarMensajes();
});


btnTabRegistro.addEventListener("click", () => {

    btnTabRegistro.classList.add("active");
    btnTabLogin.classList.remove("active");

    formRegistro.classList.remove("hidden");
    formLogin.classList.add("hidden");

    limpiarMensajes();
});


// ============================================================
// LOGIN
// ============================================================

formLogin.addEventListener("submit", async (event) => {

    event.preventDefault();

    limpiarMensajes();

    const email =
        document.getElementById("login-email").value.trim();

    const password =
        document.getElementById("login-password").value;


    try {

        const response = await fetch(
            `${API_URL}/auth/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            mostrarMensaje(
                loginMessage,
                data.detail || "No fue posible iniciar sesión.",
                "error"
            );

            return;
        }


        // ========================================
        // GUARDAR SESIÓN
        // ========================================

        localStorage.setItem(
            "access_token",
            data.access_token
        );

        localStorage.setItem(
            "refresh_token",
            data.refresh_token
        );

        localStorage.setItem(
            "usuario",
            JSON.stringify(data.usuario)
        );


        mostrarMensaje(
            loginMessage,
            "Inicio de sesión exitoso.",
            "success"
        );


        // ========================================
        // REDIRECCIÓN SEGÚN ROL
        // ========================================

        setTimeout(() => {

            if (data.usuario.rol === "auxiliar") {

                window.location.href =
                    "auxiliar.html";

            } else {

                window.location.href =
                    "cliente.html";

            }

        }, 500);


    } catch (error) {

        console.error(error);

        mostrarMensaje(
            loginMessage,
            "No se pudo conectar con el servidor.",
            "error"
        );

    }

});


// ============================================================
// REGISTRO
// ============================================================

formRegistro.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        limpiarMensajes();


        const nombre_usuario =
            document
                .getElementById("registro-nombre")
                .value
                .trim();


        const email =
            document
                .getElementById("registro-email")
                .value
                .trim();


        const password =
            document
                .getElementById("registro-password")
                .value;


        try {

            const response = await fetch(
                `${API_URL}/auth/registro`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        nombre_usuario,
                        email,
                        password
                    })
                }
            );


            const data = await response.json();


            if (!response.ok) {

                mostrarMensaje(
                    registroMessage,
                    obtenerMensajeError(data),
                    "error"
                );

                return;
            }


            mostrarMensaje(
                registroMessage,
                "Cuenta creada correctamente. Ya puedes iniciar sesión.",
                "success"
            );


            formRegistro.reset();


            // Esperamos un momento y mostramos login
            setTimeout(() => {

                btnTabLogin.click();

                document
                    .getElementById("login-email")
                    .value = email;

            }, 900);


        } catch (error) {

            console.error(error);

            mostrarMensaje(
                registroMessage,
                "No se pudo conectar con el servidor.",
                "error"
            );

        }

    }
);


// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function mostrarMensaje(elemento, mensaje, tipo) {

    elemento.textContent = mensaje;

    elemento.className =
        `message ${tipo}`;
}


function limpiarMensajes() {

    loginMessage.textContent = "";
    loginMessage.className = "message";

    registroMessage.textContent = "";
    registroMessage.className = "message";
}


function obtenerMensajeError(data) {

    if (typeof data.detail === "string") {
        return data.detail;
    }

    if (Array.isArray(data.detail)) {

        return data.detail
            .map(error => error.msg)
            .join(". ");
    }

    return "Ocurrió un error inesperado.";
}