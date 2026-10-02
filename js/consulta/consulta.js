import { sql } from "../config/neon-config.js";
import { exigirSesion, cerrarSesion } from "../auth/auth.js";

const usuario = exigirSesion();

if (usuario) {
    if (usuario.rol !== "cliente") {
        window.location.replace("panel.html");
    } else {
        iniciarConsulta(usuario);
    }
}

async function iniciarConsulta(usuario) {
    const mensaje = document.getElementById("mensaje-consulta");
    const cuerpo = document.getElementById("cuerpo-reportes");

    document.getElementById("usuario-activo").textContent =
        "Vecino: " + usuario.nombre;

    document.getElementById("boton-salir")
        .addEventListener("click", () => {
            cerrarSesion();
            window.location.replace("login.html");
        });

    try {
        const reportes = await sql`
            SELECT
                id,
                codigo_seguimiento,
                direccion,
                descripcion,
                estado,
                fecha_registro
            FROM reportes_residuos
            WHERE id_usuario = ${usuario.id}
            ORDER BY fecha_registro DESC, id DESC;
        `;

        cuerpo.replaceChildren();

        if (reportes.length === 0) {
            mensaje.textContent =
                "Todavía no tienes reportes. Puedes crear uno en Nuevo reporte.";
            return;
        }

        for (const reporte of reportes) {
            const fila = document.createElement("tr");

            agregarCelda(fila, reporte.codigo_seguimiento);
            agregarCelda(fila, reporte.direccion);
            agregarCelda(fila, reporte.descripcion);

            const celdaEstado = document.createElement("td");
            const etiquetaEstado = document.createElement("span");

            etiquetaEstado.className = "estado";
            etiquetaEstado.textContent = reporte.estado;

            celdaEstado.appendChild(etiquetaEstado);
            fila.appendChild(celdaEstado);

            const fecha = new Date(reporte.fecha_registro);

            agregarCelda(
                fila,
                fecha.toLocaleString("es-PE")
            );

            const celdaAcciones = document.createElement("td");
            const enlace = document.createElement("a");

            enlace.href = "actualizar.html?id=" + reporte.id;

            enlace.textContent = reporte.estado === "registrado"
                ? "Editar"
                : "Ver detalle";

            celdaAcciones.appendChild(enlace);
            fila.appendChild(celdaAcciones);

            cuerpo.appendChild(fila);
}

        mensaje.textContent =
            "Reportes encontrados: " + reportes.length;
    } catch (error) {
        mensaje.textContent =
            "No se pudieron cargar tus reportes. Recarga la página para intentar nuevamente.";
    }
}

function agregarCelda(fila, contenido) {
    const celda = document.createElement("td");
    celda.textContent = contenido ?? "";
    fila.appendChild(celda);
}