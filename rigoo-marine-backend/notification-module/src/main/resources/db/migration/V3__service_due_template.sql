-- Email template fired by ServiceDueEventConsumer when maintenance-service publishes
-- a ServiceDueEvent. Bilingual (en + ar). Placeholders:
--   {{customerName}}  — recipient first-name (falls back to empty)
--   {{serviceType}}   — humanised service type (e.g. "Oil change")
--   {{urgency}}       — OVERDUE or DUE_SOON
--   {{vesselId}}      — vessel id (numeric); UI surfaces the name from cache
--   {{nextDueDate}}   — ISO date (dd/MM/yyyy renderable client-side)
--   {{daysUntilDue}}  — signed integer; negative when overdue
--
-- Idempotent insert: skip if a SERVICE_DUE row already exists.

INSERT INTO email_templates (name, subject, body, subject_ar, body_ar, type, active)
SELECT
    'SERVICE_DUE',
    'Maintenance reminder — {{serviceType}}',
    'Hi {{customerName}},

A scheduled service is approaching for your vessel:

  Service: {{serviceType}}
  Status : {{urgency}}
  Due    : {{nextDueDate}}

Log in to your Rigoo Marine dashboard to book a slot, snooze the reminder, or update your engine-hour reading.

— Rigoo Marine',
    'تذكير صيانة — {{serviceType}}',
    'مرحباً {{customerName}}،

اقتربت صيانة دورية لسفينتك:

  الخدمة: {{serviceType}}
  الحالة: {{urgency}}
  الموعد: {{nextDueDate}}

سجّل دخولك إلى لوحة Rigoo Marine لحجز موعد أو تأجيل التذكير أو تحديث ساعات تشغيل المحرك.

— Rigoo Marine',
    'TRANSACTIONAL',
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'SERVICE_DUE');
