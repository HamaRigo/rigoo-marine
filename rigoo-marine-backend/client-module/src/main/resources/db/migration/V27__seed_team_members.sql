-- Seed initial team member entries.
-- V19 created the table; V20 updated the "last row" role to Software Engineer
-- but no row existed at the time so it was a no-op.  This migration provides
-- the canonical seed.  V20 will not re-run (Flyway marks it applied), so the
-- Software Engineer entry is included here directly.
--
-- ON CONFLICT: team_members has no natural unique key, so we guard with
-- WHERE NOT EXISTS to avoid duplicate seeds on re-runs.

INSERT INTO team_members (name, name_ar, role, role_ar, bio, bio_ar,
                          photo_url, department, display_order, active)
SELECT * FROM (VALUES
  (
    'Mohamed Bouallagui',
    'محمد بوعلاقي',
    'Founder & CEO',
    'المؤسس والرئيس التنفيذي',
    'Marine industry veteran with over 15 years of experience in vessel maintenance and repair services across the Gulf.',
    'خبير في صناعة الملاحة البحرية مع أكثر من 15 عامًا من الخبرة في خدمات صيانة وإصلاح السفن في منطقة الخليج.',
    NULL,
    'management',
    1,
    TRUE
  ),
  (
    'Fakhri Al-Rashid',
    'فخري الرشيد',
    'Operations Manager',
    'مدير العمليات',
    'Oversees all service operations and ensures every vessel receives the highest standard of care.',
    'يشرف على جميع عمليات الخدمة ويضمن حصول كل مركبة بحرية على أعلى معايير الرعاية.',
    NULL,
    'operations',
    2,
    TRUE
  ),
  (
    'Hama Rigo',
    'هاما ريغو',
    'Lead Marine Technician',
    'كبير الفنيين البحريين',
    'Specialist in engine overhaul, hull repair, and electrical systems with deep expertise in outboard and inboard engines.',
    'متخصص في إعادة بناء المحركات وإصلاح الهياكل والأنظمة الكهربائية مع خبرة عميقة في محركات الدفع الخارجي والداخلي.',
    NULL,
    'technical',
    3,
    TRUE
  ),
  (
    'Khalid Al-Mansoori',
    'خالد المنصوري',
    'Software Engineer',
    'مهندس برمجيات',
    'Drives the digital platform powering Rigoo Marine''s client portal and service management system.',
    'يقود المنصة الرقمية التي تدعم بوابة العملاء ونظام إدارة الخدمات في ريغو مارين.',
    NULL,
    'technology',
    4,
    TRUE
  )
) AS v(name, name_ar, role, role_ar, bio, bio_ar, photo_url, department, display_order, active)
WHERE NOT EXISTS (SELECT 1 FROM team_members LIMIT 1);
