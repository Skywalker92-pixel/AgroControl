# AgroControl Pro – Manual de Recuperación Rápida
### Versión 1.0 | Septiembre 2026 | Para el operador del local

> **¿Cuándo usar este manual?** Cuando el sistema dejó de funcionar, se formateó la PC o se cambió el equipo. Con este manual, una persona no técnica puede restaurar el sistema completo con ayuda remota en menos de 30 minutos.

---

## ✅ ANTES DE EMPEZAR — Lista de verificación

| ¿Tienes esto? | ¿Dónde está? |
|---|---|
| ☐ PC con Windows 10 u 11 de 64 bits | La PC del local |
| ☐ **Docker Desktop** instalado | Descárgalo de https://docker.com/products/docker-desktop |
| ☐ La carpeta `AgroControl` completa | En el disco `D:\` o copiada del USB/nube |
| ☐ El archivo de respaldo (termina en `.sql.gz`) | Carpeta `D:\AgroControl\backups\` o disco externo/nube |
| ☐ El archivo `.env` con contraseñas | Se lo proporciona el técnico de instalación |

---

## 🔧 PASO 1 — Abrir la terminal PowerShell

Presiona `Win + X` → selecciona **Terminal Windows (Administrador)** o **PowerShell (Administrador)**.

---

## 🗂 PASO 2 — Verificar archivos de configuración

```powershell
# Ir a la carpeta del proyecto
cd D:\AgroControl

# Verificar que existe el archivo de configuración .env
Test-Path .env
```
Si dice **False**, crea el archivo copiando la plantilla:
```powershell
Copy-Item .env.example .env
```
Luego edita `.env` con el Bloc de notas y completa las contraseñas (el técnico te las dará).

---

## 🗄 PASO 3 — Iniciar la base de datos

```powershell
docker compose -f docker/docker-compose.yml --env-file .env up -d agrocontrol-db agrocontrol-backup
```
Espera **30 segundos** y luego verifica que esté lista:
```powershell
docker ps
```
Debe aparecer `agrocontrol-db` con estado **healthy** (saludable).

---

## 💾 PASO 4 — Restaurar el respaldo

```powershell
# Reemplaza el nombre del archivo por el más reciente que tengas
.\docker\scripts\restore.bat agrocontrol_backup_20260929_160000.sql.gz
```
> 💡 **¿Cómo sé cuál es el más reciente?** En el Explorador de archivos, ve a `D:\AgroControl\backups\` y ordena por fecha de modificación. Usa el más nuevo.

El comando pedirá confirmación. Escribe `S` y presiona Enter.

---

## 🚀 PASO 5 — Levantar el sistema completo

```powershell
docker compose -f docker/docker-compose.yml --env-file .env up -d
```
Espera **1 minuto** para que todo inicie correctamente.

---

## 🌐 PASO 6 — Verificar que funciona

1. Abre el navegador (Chrome o Edge) y escribe: **`http://localhost`**
2. Debe aparecer la pantalla de inicio de sesión de AgroControl Pro.
3. Inicia sesión con tu usuario y contraseña habitual.
4. Para verificar el estado del sistema: **`http://localhost/api/health`**

---

## ❌ SI ALGO FALLA

| Síntoma | Qué hacer |
|---|---|
| Docker Desktop no abre | Reinicia la PC; si sigue fallando, reinstala Docker Desktop |
| `agrocontrol-db` no aparece como *healthy* | Espera 2 minutos más; si no mejora, llama al técnico |
| La restauración dice "archivo no encontrado" | Verifica que el archivo `.sql.gz` esté en la carpeta `backups/` |
| El navegador no carga la página | Asegúrate de que todos los contenedores estén activos: `docker ps` |

---

## 📞 Contacto técnico

Ante cualquier duda durante la reinstalación, contacta al técnico responsable.
**Tiempo estimado de recuperación total: 20–30 minutos** con asistencia remota.

---

## 🔒 Notas de seguridad importantes

- **Nunca compartas** el archivo `.env` por medios inseguros (WhatsApp, email).
- Los respaldos que se copian al disco externo o nube están **cifrados**; guarda la contraseña de cifrado en un lugar seguro.
- Cambia las contraseñas del sistema cada 6 meses.
