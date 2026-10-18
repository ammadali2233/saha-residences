// Fallback reveals for browsers without CSS scroll-driven animations (motion.css). Runs once per element,
// then stops observing, so nothing animates off-screen or loops. Skipped entirely for reduced motion.
const supportsScrollTimeline = CSS.supports('animation-timeline: view()');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!supportsScrollTimeline && !reduced && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('motion-io');
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  for (const el of document.querySelectorAll('.reveal-rise, .reveal-wipe, .reveal-wipe-right, .draw-on-scroll')) io.observe(el);
}
