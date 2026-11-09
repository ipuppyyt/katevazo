import type { ReactNode } from "react";

export interface Question {
  q: string;
  a: ReactNode;
}

export function Faq({ items }: { items: Question[] }) {
  return (
    <div className="faq">
      {items.map((item) => (
        <details key={item.q}>
          <summary>{item.q}</summary>
          <div className="answer">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
