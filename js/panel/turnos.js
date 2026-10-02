export const HORARIOS = {
    manana: "Mañana: 06:00–14:00",
    tarde: "Tarde: 14:00–22:00",
    noche: "Noche-madrugada: 22:00–06:00"
};

export function normalizarTurno(turno) {
    if (typeof turno !== "string") {
        return "";
    }

    const valor = turno.trim().toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (valor === "manana") return "manana";
    if (valor === "tarde") return "tarde";
    if (["noche", "noche-madrugada", "noche madrugada"].includes(valor)) {
        return "noche";
    }

    return "";
}

export function obtenerTurnoActual(fecha = new Date()) {
    const hora = Number(
        new Intl.DateTimeFormat("en-GB", {
            timeZone: "America/Lima",
            hour: "2-digit",
            hourCycle: "h23"
        }).format(fecha)
    );

    if (hora >= 6 && hora < 14) {
        return "manana";
    }

    if (hora >= 14 && hora < 22) {
        return "tarde";
    }

    return "noche";
}

export function puedeModificar(usuario, fecha = new Date()) {
    if (usuario.rol === "administrador") {
        return true;
    }

    return usuario.rol === "empleado" &&
        normalizarTurno(usuario.turno) === obtenerTurnoActual(fecha);
}