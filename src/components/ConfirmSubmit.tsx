"use client";
// Botón de envío que pide confirmación antes de ejecutar la acción.
// formAction permite usarlo dentro de otro formulario con una acción distinta.
export function ConfirmSubmit({
  message,
  children,
  className = "btn",
  formAction,
  title,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  title?: string;
}) {
  return (
    <button className={className} formAction={formAction} title={title} formNoValidate={Boolean(formAction)} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
