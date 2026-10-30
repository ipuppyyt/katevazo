import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** The right-hand area of the window toolbar; views portal their controls into it. */
export const ToolbarSlotContext = createContext<HTMLElement | null>(null);

export function ToolbarSlot({ children }: { children: ReactNode }) {
  const slot = useContext(ToolbarSlotContext);
  return slot ? createPortal(children, slot) : null;
}
