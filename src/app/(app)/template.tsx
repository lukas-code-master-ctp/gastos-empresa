import { PageIn } from "@/components/motion";

// Se vuelve a montar en cada navegación, así cada pantalla entra con la misma animación
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageIn>{children}</PageIn>;
}
