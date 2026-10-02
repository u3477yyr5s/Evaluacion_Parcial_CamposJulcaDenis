import { sql } from "../config/neon-config.js";

export async function registrarUsuario(nombre, correo, contrasena) {
    await sql`
        INSERT INTO usuarios (nombre, correo, contrasena)
        VALUES (${nombre}, ${correo}, ${contrasena});
    `;
}

export async function iniciarSesion(correo, contrasena) {
    const usuarios = await sql`
        SELECT id, nombre, rol
        FROM usuarios
        WHERE correo = ${correo}
          AND contrasena = ${contrasena};
    `;

    if (usuarios.length === 0) {
        return null;
    }

    const usuario = usuarios[0];

    sessionStorage.setItem("usuario", JSON.stringify(usuario));

    return usuario;
}

export function cerrarSesion() {
    sessionStorage.removeItem("usuario");
}

export function exigirSesion() {
    const datos = sessionStorage.getItem("usuario");

    if (!datos) {
        window.location.href = "login.html";
        return null;
    }

    return JSON.parse(datos);
}