// Categorías y proyectos que cada empresa mantiene en Configuraciones → Categorías y proyectos.
// Estos son los valores iniciales (los mismos con que partió la demo); el admin los puede cargar
// con un clic si su empresa aún no tiene.
export const DEFAULT_CATEGORIES: [name: string, erpAccount: string][] = [
  ["Alimentación", "5101"],
  ["Transporte", "5102"],
  ["Combustible", "5103"],
  ["Alojamiento", "5104"],
  ["Materiales y suministros", "5105"],
  ["Estacionamiento y peajes", "5106"],
  ["Otros", "5199"],
];

export const DEFAULT_PROJECTS: [name: string, code: string][] = [
  ["Administración", "ADM"],
  ["Proyecto Norte", "PN-01"],
  ["Proyecto Sur", "PS-02"],
];
