import { neon } from "https://esm.sh/@neondatabase/serverless";

const localConfig = await import("./neon-local.js").catch(() => null);
const connectionString = localConfig?.DATABASE_URL;
const connectionConfigured =
	typeof connectionString === "string" &&
	/^postgres(?:ql)?:\/\//.test(connectionString) &&
	!/(USUARIO|CONTRASENA|HOST|BASE_DE_DATOS)/i.test(connectionString);

export const sql = connectionConfigured
	? neon(connectionString)
	: () => {
		throw new Error(
			"Falta configurar la URL de Neon en js/config/neon-local.js."
		);
	};