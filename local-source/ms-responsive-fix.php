<?php
/**
 * Plugin Name: MindStream Responsive Fix
 * Description: Injects mobile-first responsive CSS for all homepage sections
 */

add_action('wp_head', function() { ?>
<style id="ms-responsive">
/* ============================================================
   MISTR RESPONSIVE FIXES — All breakpoints
   ============================================================ */

/* ── NAV ── */
@media (max-width: 768px) {
  nav { padding: 0 16px !important; }
  nav .nav-links { display: none !important; }
}

/* ── HERO ── */
@media (max-width: 900px) {
  .hero { padding: 60px 20px 40px !important; text-align: center !important; }
  .hero-content { display: flex !important; flex-direction: column !important; align-items: center !important; gap: 32px !important; }
  .hero-mockup { display: none !important; }
  .hero h1, .hero-content h1 { font-size: clamp(32px, 8vw, 52px) !important; }
  .hero-label, .hero-eyebrow { font-size: 11px !important; }
  .chain { max-width: 100% !important; overflow: hidden !important; }
}
@media (max-width: 600px) {
  .hero { padding: 48px 16px 32px !important; }
  .hero h1 { font-size: 32px !important; line-height: 1.2 !important; }
}

/* ── PROOF BAR ── */
@media (max-width: 768px) {
  .proof-bar { padding: 24px 16px !important; }
  .proof-stats { gap: 12px !important; flex-wrap: wrap !important; justify-content: center !important; }
  .proof-stat { flex: 0 0 calc(50% - 12px) !important; text-align: center !important; }
  .proof-logos { flex-wrap: wrap !important; justify-content: center !important; gap: 12px !important; }
}

/* ── PAIN SECTION ── */
@media (max-width: 900px) {
  .pain-cards { grid-template-columns: 1fr 1fr !important; }
  .pain-section { padding: 60px 20px !important; }
}
@media (max-width: 600px) {
  .pain-cards { grid-template-columns: 1fr !important; }
  .pain-section { padding: 48px 16px !important; }
  .pain-card { padding: 20px !important; }
}

/* ── HOW IT WORKS ── */
@media (max-width: 900px) {
  .how-section { padding: 60px 20px !important; }
  .how-content { display: flex !important; flex-direction: column !important; gap: 32px !important; }
  .how-mockup { max-width: 100% !important; width: 100% !important; }
  .how-tabs { gap: 8px !important; flex-wrap: wrap !important; }
  .how-tabs button, .how-tab { font-size: 13px !important; padding: 8px 14px !important; }
}
@media (max-width: 600px) {
  .how-section { padding: 40px 16px !important; }
  .how-tabs { flex-direction: column !important; }
  .how-tabs button, .how-tab { width: 100% !important; text-align: left !important; }
  .chat-bubble { font-size: 13px !important; padding: 10px 14px !important; max-width: 90% !important; }
}

/* ── FEATURES GRID ── */
@media (max-width: 1024px) {
  .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (max-width: 600px) {
  .features-grid { grid-template-columns: 1fr !important; }
  .features-section { padding: 48px 16px !important; }
  .feature-card { padding: 20px !important; }
}

/* ── STORY / TESTIMONIAL ── */
@media (max-width: 768px) {
  .story-section { padding: 60px 16px !important; }
  .story-card { padding: 24px 20px !important; flex-direction: column !important; }
  .story-stats { flex-wrap: wrap !important; gap: 16px !important; }
}

/* ── INTEGRATIONS ── */
@media (max-width: 768px) {
  .integrations-section { padding: 60px 16px !important; }
  .integrations-grid { gap: 10px !important; justify-content: center !important; }
  .integration-tile { padding: 10px 14px !important; font-size: 12px !important; }
}

/* ── PRICING GRID ── */
@media (max-width: 1200px) {
  .pricing-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (max-width: 640px) {
  .pricing-grid { grid-template-columns: 1fr !important; }
  .pricing-section { padding: 48px 16px !important; }
  .pricing-card { padding: 24px 20px !important; }
}

/* ── BRAIN SECTION (supplement existing) ── */
@media (max-width: 900px) {
  .brain-section { padding: 60px 20px !important; }
  .brain-header h2 { font-size: clamp(28px, 7vw, 42px) !important; }
  .brain-flow-grid { grid-template-columns: 1fr !important; }
  .brain-center-col svg { max-width: 280px !important; }
  .brain-depts-col { padding-left: 0 !important; }
  .brain-inputs-col { flex-direction: row !important; flex-wrap: wrap !important; justify-content: center !important; }
}
@media (max-width: 600px) {
  .brain-section { padding: 48px 16px !important; }
  .brain-inputs-col { gap: 8px !important; }
  .input-item { font-size: 12px !important; padding: 8px 10px !important; }
  .dept-out-header { font-size: 12px !important; padding: 8px 12px !important; }
  .dept-task-pill { font-size: 10px !important; }
}

/* ── DEPT TEASER (supplement existing) ── */
@media (max-width: 600px) {
  .dept-teaser-section { padding: 48px 16px !important; }
  .dept-teaser-card { padding: 20px !important; }
}

/* ── FINAL CTA ── */
@media (max-width: 600px) {
  .final-cta { padding: 60px 16px !important; }
  .final-cta h2 { font-size: clamp(28px, 8vw, 42px) !important; }
  .final-cta a, .cta-btn { padding: 16px 28px !important; font-size: 15px !important; }
}

/* ── GLOBAL TYPOGRAPHY & SPACING ── */
@media (max-width: 600px) {
  .section-headline, h2 { font-size: clamp(24px, 7vw, 36px) !important; }
  .section-label { font-size: 10px !important; }
  p { font-size: 15px !important; }
}

/* ── PREVENT HORIZONTAL SCROLL ── */
html, body {
  overflow-x: hidden !important;
  max-width: 100vw !important;
}
* { box-sizing: border-box; }
img, svg, video { max-width: 100%; }
</style>
<?php
}, 99);


// Also inject via output buffer as fallback (catches templates that don't call wp_head)
add_action('template_redirect', function() {
    ob_start(function($html) {
        if (strpos($html, 'ms-responsive') !== false) return $html;
        $tag = '<meta name="viewport"';
        if (strpos($html, $tag) === false) {
            $html = str_replace('<head>', '<head><meta name="viewport" content="width=device-width, initial-scale=1.0">', $html);
        }
        return $html;
    });
}, 1);
