import { useEffect } from "react";

export function ScrollAnimations() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let observer: IntersectionObserver | null = null;

    const start = () => {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>("main > section, [data-reveal]"),
      );
      const viewportHeight = window.innerHeight;

      elements.forEach((element) => {
        element.classList.add("koda-reveal");
        if (element.getBoundingClientRect().top < viewportHeight * 0.92) {
          element.classList.add("koda-visible");
        }
      });

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).classList.add("koda-visible");
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -5% 0px" },
      );

      elements
        .filter((element) => !element.classList.contains("koda-visible"))
        .forEach((element) => observer?.observe(element));
    };

    // Lazy route hydration can still be running when the root effect fires.
    // Delay DOM decoration so React always hydrates the server markup first.
    const timer = window.setTimeout(start, 500);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, []);

  return null;
}
