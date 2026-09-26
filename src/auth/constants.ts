/**
 * Secreto de firma de los JWT del ecosistema. Se lee del entorno
 * (JWT_SECRET): antes estaba escrito en el código, y cualquiera con acceso
 * al repositorio podía fabricar tokens válidos para todas las apps.
 *
 * Debe ser el MISMO valor que usan los demás backends para validar los
 * tokens de Authoriza (JWT_SECRET en InOut/FactoNet, AUTHORIZA_JWT_SECRET en
 * Shotra/Kiri). Sin él, Authoriza no arranca: nunca se firma con un valor
 * por defecto.
 */
function readJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      'JWT_SECRET no está configurado. Defínelo en el entorno (deploy/.env.production o .env local) ' +
        'con el mismo valor que usan los demás backends para validar los tokens de Authoriza.',
    );
  }
  if (secret.length < 32 && process.env.NODE_ENV === 'production') {
    // No se bloquea para no tumbar producción, pero se deja constancia.
    console.warn('[auth] JWT_SECRET tiene menos de 32 caracteres: genera uno más largo (openssl rand -hex 32).');
  }
  return secret;
}

export const jwtConstants = {
  secret: readJwtSecret(),
};
