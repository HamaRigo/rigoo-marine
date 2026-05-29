-- Add bilingual columns
ALTER TABLE services ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Clear old seed data (wrong categories, missing images)
-- work_order_services has no FK constraint so this is safe in dev
DELETE FROM services;

-- Re-insert the 9 canonical services with correct category, image_url, and Arabic text
INSERT INTO services (name, name_ar, description, description_ar, category, price, active, image_url) VALUES
(
  'Engine Diagnostics',
  'تشخيص المحرك',
  'Complete engine computer diagnostics and troubleshooting for optimal performance.',
  'تشخيص كامل لحاسوب المحرك وإصلاح الأعطال لضمان الأداء الأمثل.',
  'Mechanical', 150.00, TRUE,
  '/services_img/posters/Engine Diagnostics.jpeg'
),
(
  'Oil Change',
  'تغيير الزيت',
  'Full engine oil change with premium marine-grade oil and filter replacement.',
  'تغيير كامل لزيت المحرك بزيت بحري فاخر مع استبدال الفلتر.',
  'Mechanical', 250.00, TRUE,
  '/services_img/posters/Oil Change.jpg'
),
(
  'Generator Service',
  'خدمة المولد',
  'On-board generator full maintenance, inspection, and service.',
  'صيانة وفحص وخدمة شاملة للمولد الكهربائي المدمج على متن السفينة.',
  'Mechanical', 300.00, TRUE,
  '/services_img/posters/Generator Service.jpg'
),
(
  'Transmission Service',
  'خدمة ناقل الحركة',
  'Transmission fluid change, inspection and precise adjustment.',
  'تغيير سائل ناقل الحركة وفحصه وضبطه بدقة.',
  'Mechanical', 400.00, TRUE,
  '/services_img/posters/Transmission.jpg'
),
(
  'Hull Cleaning',
  'تنظيف الهيكل',
  'Professional underwater hull cleaning and anti-fouling inspection.',
  'تنظيف احترافي لهيكل السفينة تحت الماء مع فحص مقاومة الأصداف.',
  'Structural', 200.00, TRUE,
  '/services_img/posters/Hull Cleaning.jpg'
),
(
  'Propeller Repair',
  'إصلاح المراوح',
  'Propeller inspection, straightening, repair and dynamic balancing.',
  'فحص المراوح وتقويمها وإصلاحها وموازنتها ديناميكياً.',
  'Structural', 350.00, TRUE,
  '/services_img/posters/Propeller Repair.jpeg'
),
(
  'Bottom Paint',
  'طلاء قاع السفينة',
  'Anti-fouling bottom paint application to protect the hull and improve performance.',
  'تطبيق طلاء مضاد للأصداف على قاع السفينة لحماية الهيكل وتحسين الأداء.',
  'Cosmetic', 600.00, TRUE,
  '/services_img/posters/bottom-paint.jpeg'
),
(
  'Complete Electrical System Inspection',
  'فحص النظام الكهربائي الكامل',
  'Comprehensive inspection of all onboard electrical systems, wiring, and components.',
  'فحص شامل لجميع الأنظمة الكهربائية والأسلاك والمكونات على متن السفينة.',
  'Specialized', 175.00, TRUE,
  '/services_img/posters/complete-electrical-inspection.jpeg'
),
(
  'De-winterization',
  'إزالة الشتوة',
  'Full spring commissioning: engine flush, systems check, and sea trial preparation.',
  'تجهيز كامل لموسم الربيع: تنظيف المحرك وفحص الأنظمة والتحضير للاختبار البحري.',
  'Renovation', 450.00, TRUE,
  '/services_img/posters/De-winterization.jpeg'
);
