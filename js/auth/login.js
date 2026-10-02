import { registrarUsuario, iniciarSesion } from "./auth.js";

const formularioCuenta = document.getElementById("form-cuenta");
const formularioLogin = document.getElementById("form-login");

const mensajeCuenta = document.getElementById("mensaje-cuenta");
const mensajeLogin = document.getElementById("mensaje-login");

const botonCuenta = formularioCuenta.querySelector("button");
const botonLogin = formularioLogin.querySelector("button");

botonCuenta.disabled = false;
botonLogin.disabled = false;

formularioCuenta.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const nombre = document.getElementById("cuenta-nombre").value.trim();
    const correo = document.getElementById("cuenta-correo")
        .value.trim().toLowerCase();
    const contrasena = document.getElementById("cuenta-contrasena").value;

    if (!nombre || !correo || !contrasena.trim()) {
        mensajeCuenta.textContent = "Completa todos los campos.";
        return;
    }

    botonCuenta.disabled = true;
    mensajeCuenta.textContent = "Creando cuenta...";

    try {
        await registrarUsuario(nombre, correo, contrasena);

        mensajeCuenta.textContent =
            "Cuenta creada. Ahora puedes iniciar sesión.";

        formularioCuenta.reset();

        document.getElementById("login-correo").value = correo;
        document.getElementById("login-contrasena").focus();
    } catch (error) {
        if (error.code === "23505") {
            mensajeCuenta.textContent =
                "Ese correo ya tiene una cuenta. Inicia sesión.";
        } else {
            mensajeCuenta.textContent =
                "No se pudo crear la cuenta. Revisa la conexión con Neon.";
        }
    } finally {
        botonCuenta.disabled = false;
    }
});

formularioLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const correo = document.getElementById("login-correo")
        .value.trim().toLowerCase();
    const contrasena = document.getElementById("login-contrasena").value;

    if (!correo || !contrasena.trim()) {
        mensajeLogin.textContent = "Completa correo y contraseña.";
        return;
    }

    botonLogin.disabled = true;
    mensajeLogin.textContent = "Comprobando datos...";

    try {
        const usuario = await iniciarSesion(correo, contrasena);

        if (!usuario) {
            mensajeLogin.textContent = "Correo o contraseña incorrectos.";
            return;
        }

        mensajeLogin.textContent = "Bienvenido, " + usuario.nombre + ".";

        if (usuario.rol === "cliente") {
            window.location.href = "registro.html";
        } else if (
            usuario.rol === "administrador" ||
            usuario.rol === "empleado"
        ) {
            window.location.href = "panel.html";
        } else {
            sessionStorage.removeItem("usuario");
            mensajeLogin.textContent = "La cuenta tiene un rol no válido.";
        }
    } catch (error) {
        mensajeLogin.textContent =
            "No se pudo iniciar sesión. Revisa la conexión con Neon.";
    } finally {
        botonLogin.disabled = false;
    }
});