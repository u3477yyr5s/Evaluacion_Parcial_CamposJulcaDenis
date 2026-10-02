import { sql } from "../config/neon-config.js";
import { exigirSesion, cerrarSesion } from "../auth/auth.js";

const usuario = exigirSesion();

if (usuario) {
    const autorizado =
        usuario.rol === "administrador" ||
        usuario.rol === "empleado";

    if (!autorizado) {
        window.location.replace("registro.html");
    } else {
        iniciarPanel(usuario);
    }
}

function iniciarPanel(usuario) {
    const formulario = document.getElementById("form-panel");
    const direccion = document.getElementById("direccion");
    const descripcion = document.getElementById("descripcion");
    const estado = document.getElementById("estado");

    const titulo = document.getElementById("titulo-formulario");
    const guardar = document.getElementById("boton-guardar");
    const cancelar = document.getElementById("boton-cancelar");

    const mensaje = document.getElementById("mensaje-panel");
    const mensajeListado = document.getElementById("mensaje-listado");
    const cuerpo = document.getElementById("cuerpo-reportes");
    const recargar = document.getElementById("boton-recargar");

    let idEdicion = null;
    let ocupado = false;

    document.getElementById("contenido-panel").hidden = false;

    document.getElementById("usuario-activo").textContent =
        usuario.nombre + " | Rol: " + usuario.rol;

    document.getElementById("boton-salir")
        .addEventListener("click", () => {
            cerrarSesion();
            window.location.replace("login.html");
        });

    function cambiarOcupado(valor) {
        ocupado = valor;

        guardar.disabled = valor;
        cancelar.disabled = valor;
        recargar.disabled = valor;
        direccion.disabled = valor;
        descripcion.disabled = valor;
        estado.disabled = valor || idEdicion === null;

        cuerpo.querySelectorAll("button").forEach((boton) => {
            boton.disabled = valor;
        });
    }

    function prepararCreacion() {
        idEdicion = null;
        formulario.reset();
        estado.value = "registrado";
        estado.disabled = true;
        titulo.textContent = "Crear reporte";
        guardar.textContent = "Crear reporte";
        cancelar.hidden = true;
    }

    function prepararEdicion(reporte) {
        if (ocupado) return;

        idEdicion = reporte.id;

        direccion.value = reporte.direccion ?? "";
        descripcion.value = reporte.descripcion ?? "";
        estado.value = reporte.estado;
        estado.disabled = false;

        titulo.textContent = "Editar " + reporte.codigo_seguimiento;
        guardar.textContent = "Guardar cambios";
        cancelar.hidden = false;
        mensaje.textContent = "";

        formulario.scrollIntoView({ block: "start" });
        direccion.focus();
    }

    cancelar.addEventListener("click", () => {
        prepararCreacion();
        mensaje.textContent = "Edición cancelada.";
    });

    async function cargarReportes() {
        mensajeListado.textContent = "Cargando reportes...";
        cuerpo.replaceChildren();

        try {
            const reportes = await sql`
                SELECT
                    r.id,
                    r.codigo_seguimiento,
                    r.direccion,
                    r.descripcion,
                    r.estado,
                    r.fecha_registro,
                    u.nombre AS nombre_vecino
                FROM reportes_residuos r
                LEFT JOIN usuarios u ON r.id_usuario = u.id
                ORDER BY r.fecha_registro DESC, r.id DESC;
            `;

            for (const reporte of reportes) {
                const fila = document.createElement("tr");

                agregarCelda(fila, reporte.codigo_seguimiento);

                agregarCelda(
                    fila,
                    reporte.nombre_vecino ??
                    "Atención presencial o telefónica"
                );

                agregarCelda(fila, reporte.direccion);
                agregarCelda(fila, reporte.descripcion);
                agregarCelda(fila, reporte.estado);

                agregarCelda(
                    fila,
                    new Date(reporte.fecha_registro)
                        .toLocaleString("es-PE")
                );

                const acciones = document.createElement("td");

                const editar = document.createElement("button");
                editar.type = "button";
                editar.textContent = "Editar";
                editar.disabled = ocupado;
                editar.addEventListener("click", () => {
                    prepararEdicion(reporte);
                });

                const eliminar = document.createElement("button");
                eliminar.type = "button";
                eliminar.textContent = "Eliminar";
                eliminar.className = "boton-eliminar";
                eliminar.disabled = ocupado;
                eliminar.addEventListener("click", () => {
                    eliminarReporte(reporte);
                });

                acciones.append(editar, eliminar);
                fila.appendChild(acciones);
                cuerpo.appendChild(fila);
            }

            mensajeListado.textContent = reportes.length === 0
                ? "Todavía no hay reportes."
                : "Total de reportes: " + reportes.length;
        } catch (error) {
            mensajeListado.textContent =
                "No se pudo cargar el listado. Pulsa Actualizar listado.";
        }
    }

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        if (ocupado) return;

        const nuevaDireccion = direccion.value.trim();
        const nuevaDescripcion = descripcion.value.trim();
        const nuevoEstado = estado.value;

        if (!nuevaDireccion || !nuevaDescripcion) {
            mensaje.textContent = "Completa dirección y descripción.";
            return;
        }

        if (nuevaDireccion.length > 200) {
            mensaje.textContent =
                "La dirección no puede superar los 200 caracteres.";
            return;
        }

        if (
            idEdicion !== null &&
            !["registrado", "atendido", "rechazado"].includes(nuevoEstado)
        ) {
            mensaje.textContent = "Selecciona un estado válido.";
            return;
        }

        cambiarOcupado(true);
        mensaje.textContent = "Guardando...";

        try {
            if (idEdicion === null) {
                const codigo = await crearReporte(
                    nuevaDireccion,
                    nuevaDescripcion
                );

                mensaje.textContent =
                    "Reporte creado. Código: " + codigo;
            } else {
                const resultado = await sql`
                    UPDATE reportes_residuos
                    SET direccion = ${nuevaDireccion},
                        descripcion = ${nuevaDescripcion},
                        estado = ${nuevoEstado}
                    WHERE id = ${idEdicion}
                    RETURNING id;
                `;

                mensaje.textContent = resultado.length > 0
                    ? "Reporte actualizado correctamente."
                    : "El reporte ya no existe.";
            }

            prepararCreacion();
            await cargarReportes();
        } catch (error) {
            mensaje.textContent =
                "No se pudo guardar. Intenta nuevamente.";
        } finally {
            cambiarOcupado(false);
        }
    });

    async function eliminarReporte(reporte) {
        if (ocupado) return;

        const confirmado = window.confirm(
            "¿Eliminar el reporte " +
            reporte.codigo_seguimiento +
            "? Esta acción no se puede deshacer."
        );

        if (!confirmado) return;

        cambiarOcupado(true);

        try {
            const resultado = await sql`
                DELETE FROM reportes_residuos
                WHERE id = ${reporte.id}
                RETURNING id;
            `;

            if (idEdicion === reporte.id) {
                prepararCreacion();
            }

            mensaje.textContent = resultado.length > 0
                ? "Reporte eliminado."
                : "El reporte ya había sido eliminado.";

            await cargarReportes();
        } catch (error) {
            mensaje.textContent =
                "No se pudo eliminar el reporte.";
        } finally {
            cambiarOcupado(false);
        }
    }

    recargar.addEventListener("click", async () => {
        if (ocupado) return;

        cambiarOcupado(true);

        try {
            await cargarReportes();
        } finally {
            cambiarOcupado(false);
        }
    });

    cargarReportes();
}

function agregarCelda(fila, contenido) {
    const celda = document.createElement("td");
    celda.textContent = contenido ?? "";
    fila.appendChild(celda);
}

async function crearReporte(direccion, descripcion) {
    for (let intento = 0; intento < 3; intento++) {
        const valores = new Uint32Array(1);
        crypto.getRandomValues(valores);

        const codigo = "RES-" +
            valores[0].toString(16).padStart(8, "0").toUpperCase();

        try {
            const resultado = await sql`
                INSERT INTO reportes_residuos (
                    codigo_seguimiento,
                    direccion,
                    descripcion,
                    estado,
                    id_usuario
                )
                VALUES (
                    ${codigo},
                    ${direccion},
                    ${descripcion},
                    'registrado',
                    NULL
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