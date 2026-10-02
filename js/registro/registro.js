import { sql } from "../config/neon-config.js";
import { exigirSesion, cerrarSesion } from "../auth/auth.js";

const usuario = exigirSesion();

if (usuario) {
    if (usuario.rol !== "cliente") {
        window.location.replace("panel.html");
    } else {
        prepararFormulario(usuario);
    }
}

function prepararFormulario(usuario) {
    const formulario = document.getElementById("form-reporte");
    const mensaje = document.getElementById("mensaje-reporte");
    const botonEnviar = formulario.querySelector('button[type="submit"]');
    const botonSalir = document.getElementById("boton-salir");

    document.getElementById("usuario-activo").textContent =
        "Vecino: " + usuario.nombre;

    botonEnviar.disabled = false;

    botonSalir.addEventListener("click", () => {
        cerrarSesion();
        window.location.replace("login.html");
    });

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const direccion = document.getElementById("direccion").value.trim();
        const descripcion = document.getElementById("descripcion").value.trim();

        if (!direccion || !descripcion) {
            mensaje.textContent = "Completa la dirección y la descripción.";
            return;
        }

        if (direccion.length > 200) {
            mensaje.textContent =
                "La dirección no puede superar los 200 caracteres.";
            return;
        }

        botonEnviar.disabled = true;

        mensaje.classList.remove("confirmacion");
        mensaje.textContent = "Guardando reporte...";

        try {
            const codigo = await guardarReporte(
                usuario.id,
                direccion,
                descripcion
            );

            mensaje.textContent =
                "Reporte guardado. Tu código de seguimiento es: " + codigo;

            animarConfirmacion(mensaje);
            formulario.reset();
        } catch (error) {
            mensaje.textContent =
                "No se pudo guardar el reporte. Intenta nuevamente.";
        } finally {
            botonEnviar.disabled = false;
        }
    });
}

async function guardarReporte(idUsuario, direccion, descripcion) {
    for (let intento = 0; intento < 3; intento++) {
        const valores = new Uint32Array(1);
        crypto.getRandomValues(valores);

        const codigo = "RES-" +
            valores[0].toString(16).padStart(8, "0").toUpperCase();

        try {
            const resultado = await sql`
                INSERT INTO reportes_residuos (
                    id_usuario,
                    codigo_seguimiento,
                    direccion,
                    descripcion,
                    estado
                )
                VALUES (
                    ${idUsuario},
                    ${codigo},
                    ${direccion},
                    ${descripcion},
                    'registrado'
                )
                RETURNING codigo_seguimiento;
            `;

            return resultado[0].codigo_seguimiento;
        } catch (error) {
            if (error.code !== "23505" || intento === 2) {
                throw error;
            }
        }
    }
}
function animarConfirmacion(elemento) {
    elemento.classList.remove("confirmacion");
    void elemento.offsetWidth;
    elemento.classList.add("confirmacion");
}