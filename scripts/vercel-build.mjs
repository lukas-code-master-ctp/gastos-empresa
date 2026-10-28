// Build de producción en Vercel: misma schema que en local, pero con Postgres (Supabase o Neon).
// 1) genera prisma/schema.prod.prisma, 2) sincroniza las tablas, 3) carga datos de demo
// solo si la base está vacía, 4) next build.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

// Variables según de dónde venga la base: Supabase de Vercel Marketplace (POSTGRES_*),
// Neon (DATABASE_URL*) o una URL puesta a mano en DATABASE_URL.
const pick = (...keys) => keys.find((k) => process.env[k]?.startsWith("postgres"));
const urlVar = pick("POSTGRES_PRISMA_URL", "DATABASE_URL");
const directVar = pick("POSTGRES_URL_NON_POOLING", "DATABASE_URL_UNPOOLED", "DIRECT_URL");
if (!urlVar) {
  console.error("Falta la base Postgres. En Vercel: Storage → Create Database → Supabase, y conéctala al proyecto.");
  process.exit(1);
}
console.log(`Base: ${urlVar}${directVar ? ` (directa: ${directVar})` : ""}`);

const schema = readFileSync("prisma/schema.prisma", "utf8").replace(
  /provider = "sqlite"\n  url      = env\("DATABASE_URL"\)/,
  `provider = "postgresql"\n  url      = env("${urlVar}")${directVar ? `\n  directUrl = env("${directVar}")` : ""}`,
);
if (!schema.includes('provider = "postgresql"')) throw new Error("No se pudo pasar la schema a Postgres");
writeFileSync("prisma/schema.prod.prisma", schema);

const run = (cmd, env = {}) => execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });
run("npx prisma generate --schema prisma/schema.prod.prisma");
run("npx prisma db push --schema prisma/schema.prod.prisma --skip-generate");
run("npx tsx prisma/seed.ts", { SEED_ONLY_IF_EMPTY: "1" });
run("npx next build");
