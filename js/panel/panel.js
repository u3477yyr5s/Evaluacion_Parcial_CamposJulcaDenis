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

const HORARIOS = {
    manana: "Mañana: 06:00–14:00",
    tarde: "Tarde: 14:00–22:00",
    noche: "Noche-madrugada: 22:00–06:00"
};

function obtenerTurnoActual() {
    const hora = Number(
        new Intl.DateTimeFormat("en-GB", {
            timeZone: "America/Lima",
            hour: "2-digit",
            hourCycle: "h23"
        }).format(new Date())
    );

    if (hora >= 6 && hora < 14) {
        return "manana";
    }

    if (hora >= 14 && hora < 22) {
        return "tarde";
    }

    return "noche";
}

function puedeModificar(usuario) {
    if (usuario.rol === "administrador") {
        return true;
    }

    return (
        usuario.rol === "empleado" &&
        usuario.turno === obtenerTurnoActual()
    );
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
    function mostrarTurno() {
    const autorizado = puedeModificar(usuario);

    document.getElementById("informacion-turno").textContent =
        usuario.rol === "administrador"
            ? "Administrador: acceso sin restricción horaria."
            : HORARIOS[usuario.turno] ?? "Sin turno asignado.";

    document.getElementById("hora-peru").textContent =
        "Hora de Perú: " +
        new Intl.DateTimeFormat("es-PE", {
            timeZone: "America/Lima",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23"
        }).format(new Date());

    const aviso = document.getElementById("permiso-turno");

    aviso.textContent = autorizado
        ? "Puedes crear, editar estados y eliminar reportes."
        : "Fuera de turno: únicamente puedes consultar.";

    aviso.className = autorizado
        ? "turno-activo"
        : "turno-inactivo";
}

function verificarPermiso() {
    if (puedeModificar(usuario)) {
        return true;
    }

    mensaje.textContent =
        "No puedes realizar esta operación fuera de tu turno.";

    cambiarOcupado(ocupado);
    return false;
}

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

        const bloquear = ocupado || !puedeModificar(usuario);

        guardar.disabled = bloquear;
        cancelar.disabled = ocupado;
        recargar.disabled = ocupado;

        direccion.disabled = bloquear;
        descripcion.disabled = bloquear;
        estado.disabled = bloquear || idEdicion === null;

        cuerpo.querySelectorAll("button").forEach((boton) => {
            boton.disabled = bloquear;
        });

        mostrarTurno();
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
        if (ocupado || !verificarPermiso()) return;

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
                editar.disabled = ocupado || !puedeModificar(usuario);
                editar.addEventListener("click", () => {
                    prepararEdicion(reporte);
                });

                const eliminar = document.createElement("button");
                eliminar.type = "button";
                eliminar.textContent = "Eliminar";
                eliminar.className = "boton-eliminar";
                eliminar.disabled = ocupado || !puedeModificar(usuario);
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

        mensaje.classList.remove("confirmacion");
        mensaje.textContent = "Guardando...";

        try {
            if (idEdicion === null) {
                const codigo = await crearReporte(
                    nuevaDireccion,
                    nuevaDescripcion
                );

                mensaje.textContent =
                    "Reporte creado. Código: " + codigo;
                animarConfirmacion(mensaje);
            } else {
                const resultado = await sql`
                    UPDATE reportes_residuos
                    SET direccion = ${nuevaDireccion},
                        descripcion = ${nuevaDescripcion},
                        estado = ${nuevoEstado}
                    WHERE id = ${idEdicion}
                    RETURNING id;
                `;

                if (resultado.length > 0) {
                    mensaje.textContent = "Reporte actualizado correctamente.";
                    animarConfirmacion(mensaje);
                } else {
                    mensaje.textContent = "El reporte ya no existe.";
                }
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

        mensaje.classList.remove("confirmacion");
        mensaje.textContent = "Eliminando reporte...";

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

            if (resultado.length > 0) {
                mensaje.textContent = "Reporte eliminado.";
                animarConfirmacion(mensaje);
            } else {
                mensaje.textContent = "El reporte ya había sido eliminado.";
                animarConfirmacion(mensaje);
            }

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

    cambiarOcupado(false);
    cargarReportes();

    setInterval(() => {
        cambiarOcupado(ocupado);
    }, 1000);
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
function animarConfirmacion(elemento) {
    elemento.classList.remove("confirmacion");
    void elemento.offsetWidth;
    elemento.classList.add("confirmacion");
}