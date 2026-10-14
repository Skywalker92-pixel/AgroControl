# Guía de contribución

## Instalación local

Requisitos: Node.js 24 LTS, npm, PostgreSQL 15 (o Docker).

```bash
# Base de datos de desarrollo/pruebas
for f in database/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
psql "$DATABASE_URL" -f database/seeds/000_seed_base.sql
psql "$DATABASE_URL" -f database/seeds/001_seed_usuarios_demo.sql   # solo desarrollo/pruebas

# Backend
cd backend
cp ../.env.example .env        # ajuste DATABASE_URL y JWT_SECRET locales
npm ci
npm run start:dev

# Frontend
cd ../frontend
npm ci
npm run dev                    # http://localhost:5173 (proxy /api -> :3000)
```

## Ramas

Trabaje siempre en una rama creada desde `main`; no se hace *push* directo a `main`.

| Prefijo | Uso |
|---|---|
| `feat/` | Funcionalidad nueva |
| `fix/` | Corrección de errores |
| `security/` | Correcciones de seguridad |
| `chore/` | Mantenimiento, dependencias, CI |
| `docs/` | Documentación |

## Commits

Formato [Conventional Commits](https://www.conventionalcommits.org/): `tipo(ámbito): descripción breve`.

```
fix(sync): evitar doble aplicación de ventas con el mismo UUID
security(deps): actualizar multer por GHSA-xxxx
```

Commits pequeños y enfocados; un cambio lógico por commit.

## Antes de abrir un Pull Request

```bash
cd backend
npm run lint          # 0 errores y 0 warnings (no modifica archivos; use npm run lint:fix localmente)
npm run build
npm run test:e2e
npm audit --omit=dev --audit-level=high

cd ../frontend
npm run typecheck
npm run build
npm audit --omit=dev --audit-level=high
```

## Pull Requests

- Describa el problema, la solución y cómo se probó.
- No elimine ni debilite pruebas para que CI pase. Si una prueba cambia por un cambio legítimo de comportamiento, explíquelo en el PR.
- Toda operación que afecte inventario debe registrar su movimiento de Kárdex y mantener `SUM(Kárdex) = stock_saldo`; agregue o actualice una prueba de conciliación.
- Los permisos se validan en el backend; un cambio de RBAC requiere pruebas E2E del rol afectado.
- Los cambios de esquema van en una nueva migración numerada en `database/migrations/` (y su copia en `database/init/`); nunca edite una migración ya aplicada.

## Secretos y datos

- **Nunca** versione `.env`, claves, certificados, backups, volcados de base de datos ni credenciales reales.
- Use solo los valores `CHANGE_ME` en las plantillas `.env.example`.
- Los seeds y fixtures deben contener **datos ficticios** (`example.com`, documentos `0000…`, teléfonos `9000000…`). No incluya datos de clientes, trabajadores, vehículos ni precios reales.
- No suba documentación interna del cliente, audios, transcripciones, proformas comerciales ni prompts internos.
- Si publica un secreto por error, avise de inmediato a los mantenedores: debe rotarse aunque se elimine del historial.
