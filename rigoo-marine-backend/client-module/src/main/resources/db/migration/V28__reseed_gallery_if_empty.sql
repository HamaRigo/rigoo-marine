-- Safety net: re-seeds gallery_items using the final URLs from V22 if the
-- table is completely empty (happens when V21 applied but rows were lost, or
-- when the service was first deployed against a DB that already had V21 in
-- the Flyway history but not the actual data).
--
-- WHERE NOT EXISTS guard: inserts nothing when rows already exist, so this
-- migration is safe on databases where V21/V22 ran correctly.

INSERT INTO gallery_items (title, title_ar, description, description_ar, category,
                           before_url, after_url, display_order, published)
SELECT * FROM (VALUES
  (
    'Engine Rebuild',
    'إعادة بناء المحرك',
    'Full engine disassembly, inspection, and rebuild to factory specifications.',
    'تفكيك كامل للمحرك وفحصه وإعادة بنائه وفق المواصفات الأصلية.',
    'engine_repair',
    '/services_img/posters/Engine Diagnostics.jpeg',
    '/services_img/posters/Generator Service.jpg',
    1, TRUE
  ),
  (
    'Hull Restoration',
    'ترميم الهيكل',
    'Structural repair and fiberglass restoration to bring the hull back to original strength.',
    'إصلاح هيكلي وترميم الألياف الزجاجية لاستعادة متانة الهيكل الأصلية.',
    'restoration',
    '/services_img/posters/poster-structural.png',
    '/services_img/posters/Hull Cleaning.jpg',
    2, TRUE
  ),
  (
    'Gel Coat Polish',
    'تلميع الطلاء الهلامي',
    'Full gel coat cut, polish, and ceramic sealant for a showroom finish.',
    'جلخ كامل وتلميع للطلاء الهلامي مع سيراميك واقٍ لمظهر معرض.',
    'detailing',
    '/services_img/posters/poster-cosmetic.png',
    '/services_img/posters/complete-electrical-inspection.jpeg',
    3, TRUE
  ),
  (
    'Bottom Paint',
    'طلاء القاع',
    'Anti-fouling bottom paint application to protect against marine growth.',
    'تطبيق طلاء قاع مضاد للتآكل للحماية من نمو الكائنات البحرية.',
    'painting',
    '/services_img/posters/poster-renovation.png',
    '/services_img/posters/bottom-paint.jpeg',
    4, TRUE
  ),
  (
    'Propeller Repair',
    'إصلاح المروحة',
    'Propeller straightening, balancing, and pitch correction for smooth operation.',
    'تقويم وموازنة وتصحيح ميل المروحة لتشغيل سلس.',
    'engine_repair',
    '/services_img/posters/Transmission.jpg',
    '/services_img/posters/Propeller Repair.jpeg',
    5, TRUE
  ),
  (
    'Transom Replacement',
    'استبدال الحامل الخلفي',
    'Full transom replacement with marine-grade plywood and fiberglass lamination.',
    'استبدال كامل للحامل الخلفي بخشب رقائقي بحري وطبقات ألياف زجاجية.',
    'restoration',
    '/services_img/posters/Oil Change.jpg',
    '/services_img/posters/De-winterization.jpeg',
    6, TRUE
  )
) AS v(title, title_ar, description, description_ar, category,
        before_url, after_url, display_order, published)
WHERE NOT EXISTS (SELECT 1 FROM gallery_items LIMIT 1);
