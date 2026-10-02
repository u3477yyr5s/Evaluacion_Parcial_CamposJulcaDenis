import { sql } from "../config/neon-config.js";
import { exigirSesion, cerrarSesion } from "../auth/auth.js";

const usuario = exigirSesion();

if (usuario) {
    if (usuario.rol !== "cliente") {
        window.location.replace("panel.html");
    } else {
        iniciarEdicion(usuario);
    }
}

async function iniciarEdicion(usuario) {
    const formulario = document.getElementById("form-actualizar");
    const direccion = document.getElementById("direccion");
    const descripcion = document.getElementById("descripcion");
    const botonGuardar = document.getElementById("boton-guardar");
    const mensaje = document.getElementById("mensaje-actualizar");
    const datosReporte = document.getElementById("datos-reporte");

    document.getElementById("boton-salir")
        .addEventListener("click", () => {
            cerrarSesion();
            window.location.replace("login.html");
        });

    const parametros = new URLSearchParams(window.location.search);
    const id = Number(parametros.get("id"));

    if (!Number.isSafeInteger(id) || id <= 0) {
        mensaje.textContent =
            "Selecciona un reporte desde la página Mis reportes.";
        return;
    }

    let editable = false;

    function bloquearEdicion() {
        editable = false;
        direccion.readOnly = true;
        descripcion.readOnly = true;
        botonGuardar.disabled = true;
    }

    try {
        const reportes = await sql`
            SELECT id, codigo_seguimiento, direccion, descripcion, estado
            FROM reportes_residuos
            WHERE id = ${id}
              AND id_usuario = ${usuario.id};
        `;

        if (reportes.length === 0) {
            mensaje.textContent =
                "El reporte no existe o no pertenece a tu cuenta.";
            return;
        }

        const reporte = reportes[0];

        direccion.value = reporte.direccion ?? "";
        descripcion.value = reporte.descripcion ?? "";

        datosReporte.textContent =
            "Código: " + reporte.codigo_seguimiento +
            " | Estado: " + reporte.estado;

        formulario.hidden = false;

        if (reporte.estado !== "registrado") {
            bloquearEdicion();

            mensaje.textContent =
                "Este reporte está en modo de solo lectura porque su estado ya cambió.";
            return;
        }

        editable = true;
        botonGuardar.disabled = false;

        mensaje.textContent =
            "Puedes corregir la dirección y la descripción.";
    } catch (error) {
        mensaje.textContent =
            "No se pudo cargar el reporte. Recarga la página para intentar nuevamente.";
        return;
    }

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        if (!editable) {
            return;
        }

        const nuevaDireccion = direccion.value.trim();
        const nuevaDescripcion = descripcion.value.trim();

        if (!nuevaDireccion || !nuevaDescripcion) {
            mensaje.textContent = "Completa la dirección y la descripción.";
            return;
        }

        if (nuevaDireccion.length > 200) {
            mensaje.textContent =
                "La dirección no puede superar los 200 caracteres.";
            return;
        }

        botonGuardar.disabled = true;
        mensaje.classList.remove("confirmacion");
        mensaje.textContent = "Guardando cambios...";

        try {
            const resultado = await sql`
                UPDATE reportes_residuos
                SET direccion = ${nuevaDireccion},
                    descripcion = ${nuevaDescripcion}
                WHERE id = ${id}
                  AND id_usuario = ${usuario.id}
                  AND estado = 'registrado'
                RETURNING id;
            `;

            if (resultado.length === 0) {
                bloquearEdicion();

                datosReporte.textContent =
                    "La información mostrada puede haber cambiado.";

                mensaje.textContent =
                    "No se guardaron cambios. El reporte ya no está disponible para editar. Vuelve a Mis reportes.";
                return;
            }

            mensaje.textContent =
                "Cambios guardados correctamente. Puedes volver a Mis reportes.";
            animarConfirmacion(mensaje);
        } catch (error) {
            mensaje.textContent =
                "No se pudieron guardar los cambios. Intenta nuevamente.";
        } finally {
            botonGuardar.disabled = !editable;
        }
    });
}
function animarConfirmacion(elemento) {
    elemento.classList.remove("confirmacion");
    void elemento.offsetWidth;
    elemento.classList.add("confirmacion");
}