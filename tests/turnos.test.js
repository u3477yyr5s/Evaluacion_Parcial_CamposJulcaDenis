import test from "node:test";
import assert from "node:assert/strict";
import {
    normalizarTurno,
    obtenerTurnoActual,
    puedeModificar
} from "../js/panel/turnos.js";

test("normaliza los nombres de los tres turnos", () => {
    assert.equal(normalizarTurno("mañana"), "manana");
    assert.equal(normalizarTurno("manana"), "manana");
    assert.equal(normalizarTurno("tarde"), "tarde");
    assert.equal(normalizarTurno("noche-madrugada"), "noche");
    assert.equal(normalizarTurno("noche madrugada"), "noche");
    assert.equal(normalizarTurno("noche"), "noche");
    assert.equal(normalizarTurno("turno desconocido"), "");
});

test("asigna correctamente las horas de cambio en hora de Lima", () => {
    const casos = [
        ["2026-10-02T10:59:00Z", "noche"],
        ["2026-10-02T11:00:00Z", "manana"],
        ["2026-10-02T18:59:00Z", "manana"],
        ["2026-10-02T19:00:00Z", "tarde"],
        ["2026-10-03T02:59:00Z", "tarde"],
        ["2026-10-03T03:00:00Z", "noche"]
    ];

    for (const [instante, turnoEsperado] of casos) {
        assert.equal(obtenerTurnoActual(new Date(instante)), turnoEsperado);
    }
});

test("solo el empleado del turno actual y el administrador pueden modificar", () => {
    const inicioManana = new Date("2026-10-02T11:00:00Z");

    assert.equal(
        puedeModificar({ rol: "empleado", turno: "mañana" }, inicioManana),
        true
    );
    assert.equal(
        puedeModificar({ rol: "empleado", turno: "tarde" }, inicioManana),
        false
    );
    assert.equal(
        puedeModificar({ rol: "empleado", turno: "noche-madrugada" }, inicioManana),
        false
    );
    assert.equal(
        puedeModificar({ rol: "administrador", turno: null }, inicioManana),
        true
    );
    assert.equal(
        puedeModificar({ rol: "cliente", turno: "mañana" }, inicioManana),
        false
    );
});