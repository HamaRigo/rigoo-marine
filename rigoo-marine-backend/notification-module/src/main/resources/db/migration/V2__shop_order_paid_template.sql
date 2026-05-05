-- Email template for ORDER_PAID — sent when a shop order transitions to PAID.
-- Bilingual (en + ar). Placeholders: {{orderNumber}}, {{totalQar}}, {{currency}}, {{itemCount}}.
-- Idempotent: do nothing if a template with this name already exists (notification-service shares
-- the email_templates table with client-module — first-writer-wins is fine).

INSERT INTO email_templates (name, subject, body, subject_ar, body_ar, type, active)
SELECT
    'ORDER_PAID',
    'Your Rigoo Marine order is confirmed - {{orderNumber}}',
    'Hi,

Thanks for your order. Your payment has been received and we''re preparing your items.

Order: {{orderNumber}}
Items: {{itemCount}}
Total: {{currency}} {{totalQar}}

We''ll be in touch via WhatsApp to coordinate delivery.

— Rigoo Marine',
    'تم تأكيد طلبك من Rigoo Marine - {{orderNumber}}',
    'مرحباً،

شكراً لطلبك. تم استلام الدفع ونعمل الآن على تجهيز طلبك.

رقم الطلب: {{orderNumber}}
عدد العناصر: {{itemCount}}
الإجمالي: {{currency}} {{totalQar}}

سنتواصل معك عبر واتساب لتنسيق التسليم.

— Rigoo Marine',
    'TRANSACTIONAL',
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'ORDER_PAID');
