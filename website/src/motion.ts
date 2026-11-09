import { useLayoutEffect } from "react";

// Things that fade and rise into place as they scroll into view. The hero animates on load in CSS.
const TARGETS = [
  ".section .eyebrow",
  ".section h2",
  ".section-lead",
  ".section .card",
  ".step",
  ".segmented",
  ".pickers",
  ".big-shot",
  ".split > div",
  ".faq details",
  ".cta",
  ".page .container > *",
  ".os-grid + p",
].join(",");

/** Gives the header a shadow once the page moves. */
export function useHeaderShadow() {
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    const onScroll = () => header?.toggleAttribute("data-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

/** Marks the page's elements to fade up as they scroll into view. Mount it inside the page, after its content. */
export function Reveal() {
  useLayoutEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    document.querySelectorAll<HTMLElement>(TARGETS).forEach((el) => {
      if (el.closest(".hero")) return;
      // Stagger siblings that arrive together, such as a row of cards.
      const index = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
      el.style.setProperty("--d", `${Math.min(index, 6) * 70}ms`);
      el.classList.add("reveal");
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return null;
}
