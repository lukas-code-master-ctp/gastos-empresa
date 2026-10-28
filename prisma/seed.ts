import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // En Vercel el build corre el seed en cada deploy: solo carga la demo si la base está vacía.
  if (process.env.SEED_ONLY_IF_EMPTY && (await db.company.count()) > 0) return console.log("Base con datos, seed omitido");
  await db.approval.deleteMany();
  await db.expense.deleteMany();
  await db.report.deleteMany();
  await db.fund.deleteMany();
  await db.whatsappSession.deleteMany();
  await db.user.updateMany({ data: { managerId: null } });
  await db.user.deleteMany();
  await db.category.deleteMany();
  await db.project.deleteMany();
  await db.company.deleteMany();

  const company = await db.company.create({ data: { name: "Empresa Demo SpA", rut: "76.123.456-7" } });
  const c = company.id;

  for (const [name, erpAccount] of [
    ["Alimentación", "5101"],
    ["Transporte", "5102"],
    ["Combustible", "5103"],
    ["Alojamiento", "5104"],
    ["Materiales y suministros", "5105"],
    ["Estacionamiento y peajes", "5106"],
    ["Otros", "5199"],
  ])
    await db.category.create({ data: { name, erpAccount, companyId: c } });

  for (const [name, code] of [
    ["Administración", "ADM"],
    ["Proyecto Norte", "PN-01"],
    ["Proyecto Sur", "PS-02"],
  ])
    await db.project.create({ data: { name, code, companyId: c } });

  const mk = (name: string, email: string, role: string, managerId?: string, phone?: string) =>
    db.user.create({ data: { name, email, role, managerId, phone, companyId: c } });

  const controller = await mk("Carla Controller", "controller@demo.cl", "CONTROLLER");
  const conta = await mk("Pedro Contabilidad", "contabilidad@demo.cl", "CONTABILIDAD");
  const teso = await mk("Tamara Tesorería", "tesoreria@demo.cl", "TESORERIA");
  const jefe = await mk("Jorge Jefe", "jefe@demo.cl", "JEFE");
  await mk("Ana Empleada", "ana@demo.cl", "EMPLEADO", jefe.id, "56911111111");
  await mk("Bruno Empleado", "bruno@demo.cl", "EMPLEADO", jefe.id, "56922222222");
  await mk("Admin", "admin@demo.cl", "ADMIN");
  console.log("Seed listo", { controller: controller.id, conta: conta.id, teso: teso.id });
}

main().finally(() => db.$disconnect());
