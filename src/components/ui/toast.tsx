import { create } from "zustand";
import { useEffect } from "react";

interface ToastState {
  message: string | null;
  show: (msg: string, duration?: number) => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message, duration = 2200) => {
    if (timer) clearTimeout(timer);
    set({ message });
    timer = setTimeout(() => set({ message: null }), duration);
  },
}));

export function showToast(msg: string, duration?: number) {
  useToastStore.getState().show(msg, duration);
}

export function Toast() {
  const message = useToastStore((s) => s.message);

  useEffect(() => {
    // no-op: visual transition handled via CSS below
  }, [message]);

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 bg-card3 border border-border2 rounded-xl px-4 py-2.5 text-[13px] font-semibold z-[200] text-center max-w-[90%] transition-transform duration-300 ${
        message ? "translate-y-0" : "-translate-y-20"
      }`}
    >
      {message}
    </div>
  );
}
