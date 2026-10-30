# Rindefi

Rindefi es la web app para que las empresas rindan gastos de **reembolsos**, **fondos fijos** y **caja chica**, siguiendo el flujo del diagrama `Gastos.jpg`.

## Qué hace (MVP)

| Paso del diagrama | Dónde está |
|---|---|
| Usuario sube boleta a la web → IA (OCR) lee y captura datos → usuario corrige o completa | `/gastos/nuevo` → `/api/ocr` → `/gastos/[id]` (campos dudosos en amarillo) |
| Usuario sube boleta por WhatsApp → IA lee → por mensaje se pide lo faltante o dudoso | `/api/whatsapp/webhook` (Meta WhatsApp Cloud API) y simulador en `/whatsapp` |
| Datos: comercio, monto + IVA, categoría, RUT proveedor, tipo y n° de documento, proyecto, nota | modelo `Expense` |
| Se juntan gastos en un informe (reembolso, fondo fijo, caja chica) y se envía | `/informes/nuevo`, `/informes/[id]` |
| Solicitud de fondo fijo o caja chica: monto y motivo → ciclo de aprobación | `/fondos/nuevo`, `/fondos/[id]` |
| Flujo de aprobación configurable por empresa (el admin lo arma en `/admin/flujos`: pasos por jefe directo, rol o persona, con monto mínimo opcional y un flujo por tipo). Sin flujo propio se usa el estándar: jefe directo → contabilidad → controller. Cada aprobador aprueba o rechaza (con motivo) el informe completo o gastos puntuales; los gastos rechazados quedan bloqueados y no se contabilizan | `/aprobaciones`, `/admin/flujos`, `src/lib/workflow.ts`, `src/lib/flows.ts`, acción `decide` |
| Contabilidad, controller y tesorería pueden editar gastos de informes en curso; cada cambio queda en el historial | acción `updateExpense` |
| Gasto aprobado → integración ERP | `src/lib/erp.ts` (POST a `ERP_WEBHOOK_URL`, o simulado) |
| Tesorería: reembolso → depósito · caja chica → se descuenta del monto de caja · fondo fijo → ¿calzó? cierra / ¿sobró? pide devolución / faltó → deposita diferencia → cierra | `/tesoreria`, acciones `settleReport`, `confirmReturn`, `deliverFund` |

Roles: Empleado, Jefe directo, Contabilidad, Controller, Tesorería, Admin.

## Correr en local

```bash
npm install
cp .env.example .env        # agrega OPENROUTER_API_KEY para activar la lectura con IA
npm run setup               # crea la base SQLite y carga datos de demo
npm run dev                 # http://localhost:3000
```

Sin las variables de Google, en `/login` eliges un usuario de demo (Ana y Bruno son empleados con jefe Jorge; Pedro es contabilidad, Carla controller, Tamara tesorería).

## Publicar en Vercel

El proyecto de Vercel está conectado al repo: cada push a `main` despliega solo. En Vercel corre `npm run vercel-build` (`scripts/vercel-build.mjs`), que pasa la schema a Postgres, sincroniza tablas con `prisma db push`, carga la demo solo si la base está vacía y hace `next build`.

Variables en Vercel (Settings → Environment Variables):

| Variable | Para qué |
|---|---|
| `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` | Postgres de Supabase (las crea la integración al conectar la base; también sirve `DATABASE_URL` a mano o Neon) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob privado para boletas y comprobantes (lo crea el store de Blob) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Ingreso con Google (OAuth). Con ellas el selector de demo se apaga y la clave `APP_PASSWORD` deja de pedirse |
| `ADMIN_EMAILS` | Correos (separados por coma) que entran como administrador la primera vez aunque no estén creados |
| `AUTH_SECRET` | Firma de la cookie de sesión (opcional: si falta se usa `GOOGLE_CLIENT_SECRET`) |
| `DEMO_LOGIN` | `1` para mostrar también el selector de demo con Google activo (opcional) |
| `APP_PASSWORD` | Clave que pide el navegador antes de entrar, solo mientras el login sea de demo |
| `OPENROUTER_API_KEY` | Lectura de boletas con IA vía OpenRouter (opcional) |
| `OPENROUTER_MODEL` | Modelo de visión a usar (opcional, por defecto `google/gemini-3.1-flash-lite`; varios separados por coma hacen de respaldo) |

## Ingreso con Google

Cada persona entra con su cuenta Google. Solo entran los correos que el administrador agregó en `/admin/usuarios` (ahí se elige rol y jefe directo); los de `ADMIN_EMAILS` entran como administradores la primera vez. La sesión es una cookie firmada de 30 días (`src/lib/auth.ts`, rutas en `src/app/api/auth/google`).

En Google Cloud Console (APIs y servicios → Credenciales → ID de cliente OAuth, tipo "Aplicación web") la URI de redireccionamiento autorizada es `https://app.rindefi.cl/api/auth/google/callback` (y `http://localhost:3000/api/auth/google/callback` para local).

## Diseño

Paleta Ciruela y Mandarina, tipografías Bricolage Grotesque (títulos), Geist (texto) y Geist Mono (etiquetas), animaciones con `motion`. Los colores viven en `src/app/globals.css` (las escalas de Tailwind están redefinidas con la marca) y el logo en `src/components/Brand.tsx` e `src/app/icon.svg`.

## Stack

Next.js 15 (App Router, server actions) · TypeScript · Tailwind · Prisma (SQLite en dev, Postgres en prod) · OCR con modelos de visión vía OpenRouter (por defecto `google/gemini-3.1-flash-lite`) y salida JSON estructurada.

## Pendiente para producción

- Conector real del ERP que usen (hoy webhook genérico con el asiento por línea: cuenta contable por categoría y centro de costo por proyecto).
- Número de WhatsApp Business y credenciales de Meta (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`).
- Mantenedores de empresas, categorías y proyectos (hoy vienen del seed; usuarios ya se administran en `/admin/usuarios`).
- Notificaciones por correo/WhatsApp al aprobador de turno.
- Validación de RUT y detección de boletas duplicadas.
