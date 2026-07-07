# Estado de las correcciones de seguridad

Fecha de revisión: 2026-07-02.

## Resuelto en el repositorio

1. **Logs y errores:** redacción de credenciales, cookies, tokens, MFA y cuerpos sensibles; errores internos genéricos y `requestId` correlacionable.
2. **Configuración segura:** `APP_ENV` obligatorio; validación estricta de producción, secretos de 32 bytes, CORS HTTPS, docs desactivadas, proxy explícito, host loopback y rol DB runtime `ganaderia_app`.
3. **Aislamiento multitenant:** los administradores tenant sólo cambian roles de la membresía; las mutaciones incluyen `tenantId`; eliminación/democión del último admin se serializa con un lock transaccional; eliminar una membresía no suspende la identidad global.
4. **Sesiones:** refresh token sólo en cookie `HttpOnly`, rotación atómica, familia de tokens, detección de replay, límite de sesiones y endpoints para listar/revocar dispositivos. JWT fija algoritmo, issuer y audiences por scope.
5. **Registro y tenants:** registro productivo abierto prohibido; creación de tenant con política explícita, rol ADMIN, cuota y transacción serializada.
6. **Contraseñas y MFA:** mínimo 12, máximo 128, bloqueo básico de contraseñas comunes, bcrypt coste 12, cambio propio con contraseña actual, recuperación de uso único y MFA TOTP obligatorio para `platform_super_admin`.
7. **IP y rate limits:** Express sólo confía en loopback cuando el proxy está habilitado; límites separados para login, cuenta, registro, refresh, recuperación y plataforma.
8. **Red y health checks:** host configurable, loopback productivo, `/health/live` y `/health/ready` sin detalles internos.
9. **Dependencias:** lockfiles actualizados; auditoría completa en cero vulnerabilidades para API, web y plataforma.
10. **Frontend:** access token sólo en memoria, refresh por cookie, restauración de sesión al recargar, sin migración desde storage y sourcemaps productivos desactivados.
11. **Abuso de recursos:** límites de bulk create, cuota y creación atómicas, CSV con tamaño/filas/contenido limitados y neutralización de fórmulas, paginación máxima global.
12. **Base de datos:** arranque productivo exige el rol runtime, las migraciones siguen siendo un comando de despliegue explícito y se añadieron migraciones para familias de sesión, MFA y recuperación.
13. **Auditoría:** eventos sensibles de login, logout, replay, contraseña, recuperación, MFA, roles, soporte e impersonación; sin credenciales.
14. **CI:** instalación reproducible, escaneo de secretos, auditoría runtime, tipos, pruebas, builds, SBOM y artefactos.
15. **Pruebas:** regresiones para cookies/JSON, redacción, scope JWT, membresías, último administrador, límites bulk, CSV, MFA cifrado y contratos existentes.

## Acciones de infraestructura pendientes de ejecución

Estas acciones no deben automatizarse desde el código de la aplicación y requieren credenciales/acceso al entorno:

- Crear y limitar en PostgreSQL los roles separados de runtime (`ganaderia_app`) y migraciones; revocar superusuario al runtime.
- Configurar Nginx para aceptar `CF-Connecting-IP` sólo desde rangos oficiales de Cloudflare y normalizar `remote_addr` antes de Express.
- Aplicar CSP, `frame-ancestors` y demás cabeceras al frontend estático en Nginx/Cloudflare.
- Configurar el webhook HTTPS de entrega de recuperación de contraseña y sus secretos.
- Rotar secretos JWT/MFA/webhook, revocar sesiones existentes y sanear logs históricos después del despliegue.
- Ejecutar backup, migraciones, smoke tests, staging, aprobación manual y despliegue/rollback coordinado con `CORRECCIONES_SERVIDOR.md`.

## Verificación ejecutada

- API: TypeScript, build y 40 pruebas.
- Web: TypeScript, build y 13 pruebas.
- Plataforma: TypeScript y build.
- `npm audit`: 0 vulnerabilidades en los tres paquetes.
