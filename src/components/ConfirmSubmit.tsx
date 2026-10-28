"use client";
// Botón de envío que pide confirmación antes de ejecutar la acción
export function ConfirmSubmit({ message, children, className = "btn" }: { message: string; children: React.ReactNode; className?: string }) {
  return (
    <button className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
