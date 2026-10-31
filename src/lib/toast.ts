import { create } from "zustand";

interface ToastState {
  message: string | null;
  show: (message: string) => void;
}

let timer: number | undefined;

/** A short message at the bottom of the window that goes away on its own. */
export const useToast = create<ToastState>((set) => ({
  message: null,
  show: (message) => {
    window.clearTimeout(timer);
    set({ message });
    timer = window.setTimeout(() => set({ message: null }), 3500);
  },
}));

export const toast = (message: string) => useToast.getState().show(message);
