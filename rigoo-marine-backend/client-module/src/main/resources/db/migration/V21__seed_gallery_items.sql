-- Seed the 6 hardcoded before/after gallery items from the public home page
INSERT INTO gallery_items (title, title_ar, description, description_ar, category, before_url, after_url, display_order, published, created_at, updated_at) VALUES
(
  'Engine Rebuild',
  'إعادة بناء المحرك',
  'Full engine disassembly, inspection, and rebuild to factory specifications.',
  'تفكيك كامل للمحرك وفحصه وإعادة بنائه وفق المواصفات الأصلية.',
  'engine_repair',
  '/gallery/engine-rebuild-before.jpg',
  '/gallery/engine-rebuild-after.jpg',
  1, TRUE, NOW(), NOW()
),
(
  'Hull Restoration',
  'ترميم الهيكل',
  'Structural repair and fiberglass restoration to bring the hull back to original strength.',
  'إصلاح هيكلي وترميم الألياف الزجاجية لاستعادة متانة الهيكل الأصلية.',
  'restoration',
  '/gallery/hull-restoration-before.jpg',
  '/gallery/hull-restoration-after.jpg',
  2, TRUE, NOW(), NOW()
),
(
  'Gel Coat Polish',
  'تلميع الطلاء الهلامي',
  'Full gel coat cut, polish, and ceramic sealant for a showroom finish.',
  'جلخ كامل وتلميع للطلاء الهلامي مع سيراميك واقٍ لمظهر معرض.',
  'detailing',
  '/gallery/gel-coat-polish-before.jpg',
  '/gallery/gel-coat-polish-after.jpg',
  3, TRUE, NOW(), NOW()
),
(
  'Bottom Paint',
  'طلاء القاع',
  'Anti-fouling bottom paint application to protect against marine growth.',
  'تطبيق طلاء قاع مضاد للتآكل للحماية من نمو الكائنات البحرية.',
  'painting',
  '/gallery/bottom-paint-before.jpg',
  '/gallery/bottom-paint-after.jpg',
  4, TRUE, NOW(), NOW()
),
(
  'Propeller Repair',
  'إصلاح المروحة',
  'Propeller straightening, balancing, and pitch correction for smooth operation.',
  'تقويم وموازنة وتصحيح ميل المروحة لتشغيل سلس.',
  'engine_repair',
  '/gallery/propeller-repair-before.jpg',
  '/gallery/propeller-repair-after.jpg',
  5, TRUE, NOW(), NOW()
),
(
  'Transom Replacement',
  'استبدال الحامل الخلفي',
  'Full transom replacement with marine-grade plywood and fiberglass lamination.',
  'استبدال كامل للحامل الخلفي بخشب رقائقي بحري وطبقات ألياف زجاجية.',
  'restoration',
  '/gallery/transom-replacement-before.jpg',
  '/gallery/transom-replacement-after.jpg',
  6, TRUE, NOW(), NOW()
);
