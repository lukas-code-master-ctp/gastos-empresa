// Build de producción en Vercel: misma schema que en local, pero con Postgres (Neon).
// 1) genera prisma/schema.prod.prisma, 2) sincroniza las tablas, 3) carga datos de demo
// solo si la base está vacía, 4) next build.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  console.error("Falta DATABASE_URL de Postgres. En Vercel: Storage → Create Database → Neon, y conéctala al proyecto.");
  process.exit(1);
}

const direct = process.env.DATABASE_URL_UNPOOLED ? '\n  directUrl = env("DATABASE_URL_UNPOOLED")' : "";
const schema = readFileSync("prisma/schema.prisma", "utf8").replace(
  /provider = "sqlite"\n  url      = env\("DATABASE_URL"\)/,
  `provider = "postgresql"\n  url      = env("DATABASE_URL")${direct}`,
);
if (!schema.includes('provider = "postgresql"')) throw new Error("No se pudo pasar la schema a Postgres");
writeFileSync("prisma/schema.prod.prisma", schema);

const run = (cmd, env = {}) => execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });
run("npx prisma generate --schema prisma/schema.prod.prisma");
run("npx prisma db push --schema prisma/schema.prod.prisma --skip-generate");
run("npx tsx prisma/seed.ts", { SEED_ONLY_IF_EMPTY: "1" });
run("npx next build");
