# Política de seguridad

## Versiones soportadas

| Versión | Soporte de seguridad |
|---|---|
| `1.0.0-rc1` (rama `main`) | Sí |
| Versiones anteriores | No |

Las correcciones de seguridad se publican sobre la rama `main`.

## Cómo reportar una vulnerabilidad

**No publique detalles de vulnerabilidades, pruebas de concepto ni exploits en Issues, Pull Requests ni Discussions públicos.**

1. Use el mecanismo privado de GitHub: pestaña **Security → Report a vulnerability** (*Private vulnerability reporting*) de este repositorio, cuando esté habilitado.
2. Si esa opción no está disponible, abra un Issue **sin detalles técnicos** solicitando un canal privado de contacto con los mantenedores.

Incluya en el reporte privado:

- Componente afectado (API, PWA móvil, base de datos, scripts de despliegue o backups).
- Versión o commit.
- Pasos para reproducir e impacto estimado.
- Si involucra credenciales o datos personales, **no los adjunte**: describa su tipo y ubicación.

## Alcance

Dentro de alcance: autenticación y autorización (RBAC, aislamiento entre vendedores), integridad del Kárdex y de la sincronización móvil, exposición de datos, configuración de despliegue incluida en el repositorio y scripts de backup/restauración.

Fuera de alcance: datos de demostración ficticios (`database/seeds/001_*`, `002_*`) y sus contraseñas, que son públicas por diseño y nunca deben usarse en producción.

## Secretos expuestos

Si detecta un secreto real publicado en el repositorio o en su historial, repórtelo por el canal privado indicando **tipo de secreto, archivo/commit y riesgo**, sin reproducir su valor. Eliminar un secreto del último commit no lo invalida: la credencial debe rotarse o revocarse.
