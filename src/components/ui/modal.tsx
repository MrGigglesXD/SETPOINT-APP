import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children?: React.ReactNode;
  actions?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps["variant"];
  }[];
  cancelLabel?: string;
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  actions,
  cancelLabel = "Cancelar",
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 z-[100] flex items-end p-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border2 rounded-2xl p-5 w-full max-w-[480px] mx-auto animate-float-up">
        <div className="text-[17px] font-extrabold mb-1.5">{title}</div>
        {description && (
          <div className="text-[13px] text-muted mb-4 leading-relaxed">{description}</div>
        )}
        {children && <div className="flex flex-col gap-2 mb-4">{children}</div>}
        {actions ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={onClose}>
              {cancelLabel}
            </Button>
            {actions.map((a, i) => (
              <Button
                key={i}
                variant={a.variant ?? "red"}
                onClick={() => {
                  a.onClick();
                }}
              >
                {a.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
