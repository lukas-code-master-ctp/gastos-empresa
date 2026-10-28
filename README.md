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
| Cadena: jefe directo → contabilidad → controller. Cada aprobador aprueba o rechaza (con motivo) el informe completo o gastos puntuales; los gastos rechazados quedan bloqueados y no se contabilizan | `/aprobaciones`, `src/lib/workflow.ts`, acción `decide` |
| Contabilidad, controller y tesorería pueden editar gastos de informes en curso; cada cambio queda en el historial | acción `updateExpense` |
| Gasto aprobado → integración ERP | `src/lib/erp.ts` (POST a `ERP_WEBHOOK_URL`, o simulado) |
| Tesorería: reembolso → depósito · caja chica → se descuenta del monto de caja · fondo fijo → ¿calzó? cierra / ¿sobró? pide devolución / faltó → deposita diferencia → cierra | `/tesoreria`, acciones `settleReport`, `confirmReturn`, `deliverFund` |

Roles: Empleado, Jefe directo, Contabilidad, Controller, Tesorería, Admin.

## Correr en local

```bash
npm install
cp .env.example .env        # agrega ANTHROPIC_API_KEY para activar la lectura con IA
npm run setup               # crea la base SQLite y carga datos de demo
npm run dev                 # http://localhost:3000
```

En `/login` eliges un usuario de demo (Ana y Bruno son empleados con jefe Jorge; Pedro es contabilidad, Carla controller, Tamara tesorería).

## Publicar en Vercel

El proyecto de Vercel está conectado al repo: cada push a `main` despliega solo. En Vercel corre `npm run vercel-build` (`scripts/vercel-build.mjs`), que pasa la schema a Postgres, sincroniza tablas con `prisma db push`, carga la demo solo si la base está vacía y hace `next build`.

Variables en Vercel (Settings → Environment Variables):

| Variable | Para qué |
|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Postgres de Neon (las crea la integración al conectar la base) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob privado para boletas y comprobantes (lo crea el store de Blob) |
| `APP_PASSWORD` | Clave que pide el navegador antes de entrar, mientras el login sea de demo |
| `ANTHROPIC_API_KEY` | Lectura de boletas con IA (opcional) |

## Diseño

Paleta Ciruela y Mandarina, tipografías Bricolage Grotesque (títulos), Geist (texto) y Geist Mono (etiquetas), animaciones con `motion`. Los colores viven en `src/app/globals.css` (las escalas de Tailwind están redefinidas con la marca) y el logo en `src/components/Brand.tsx` e `src/app/icon.svg`.

## Stack

Next.js 15 (App Router, server actions) · TypeScript · Tailwind · Prisma (SQLite en dev, Postgres en prod) · Claude (`claude-opus-5-5`) para OCR con salida estructurada.

## Pendiente para producción

- Autenticación real (SSO / NextAuth) en vez del selector de usuario de demo.
- Conector real del ERP que usen (hoy webhook genérico con el asiento por línea: cuenta contable por categoría y centro de costo por proyecto).
- Número de WhatsApp Business y credenciales de Meta (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`).
- Mantenedores de empresas, usuarios, categorías y proyectos (hoy vienen del seed).
- Notificaciones por correo/WhatsApp al aprobador de turno.
- Validación de RUT y detección de boletas duplicadas.
