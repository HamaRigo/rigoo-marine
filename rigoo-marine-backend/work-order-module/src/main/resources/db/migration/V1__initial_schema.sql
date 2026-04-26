-- Rigoo Marine Database Initialization Script
-- Creates tables for all microservices using Flyway

-- ============================================
-- CLIENT SERVICE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS clients (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'CLIENT',
    address VARCHAR(500),
    company VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_info (
    id BIGSERIAL PRIMARY KEY,
    key_name VARCHAR(100) UNIQUE NOT NULL,
    value VARCHAR(500) NOT NULL,
    category VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    uploaded_by BIGINT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- VESSEL SERVICE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS vessels (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    build_year VARCHAR(20),
    length VARCHAR(50),
    engine_type VARCHAR(100),
    hull_material VARCHAR(50),
    registration_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vessels_client_id ON vessels(client_id);

-- ============================================
-- SERVICE SERVICE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS services (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10,2),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default services
INSERT INTO services (name, description, category, price, active) VALUES
('Engine Diagnostics', 'Complete engine computer diagnostics and troubleshooting', 'Engine', 150.00, TRUE),
('Oil Change', 'Full engine oil change with premium marine oil', 'Maintenance', 250.00, TRUE),
('Propeller Repair', 'Propeller inspection, repair and balancing', 'Propulsion', 350.00, TRUE),
('Hull Cleaning', 'Professional hull cleaning and inspection', 'Hull', 200.00, TRUE),
('Electrical System Check', 'Complete electrical system inspection', 'Electrical', 175.00, TRUE),
('Winterization', 'Complete winterization service', 'Seasonal', 500.00, TRUE),
('De-winterization', 'Spring commissioning and de-winterization', 'Seasonal', 450.00, TRUE),
('Bottom Paint', 'Anti-fouling bottom paint application', 'Hull', 600.00, TRUE),
('Transmission Service', 'Transmission fluid change and inspection', 'Transmission', 400.00, TRUE),
('Generator Service', 'On-board generator maintenance and service', 'Generator', 300.00, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================
-- WORK ORDER SERVICE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS work_orders (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL,
    vessel_id BIGINT NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    priority VARCHAR(50) DEFAULT 'NORMAL',
    preferred_date TIMESTAMP,
    assigned_technician_id BIGINT,
    notes TEXT,
    media_urls TEXT,
    issue_category VARCHAR(50),
    severity VARCHAR(20),
    symptoms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_work_orders_client_id ON work_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician ON work_orders(assigned_technician_id);

-- Element collection table for WorkOrder.serviceIds
CREATE TABLE IF NOT EXISTS work_order_services (
    work_order_id BIGINT NOT NULL,
    service_id BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_order_services_wo ON work_order_services(work_order_id);

-- ============================================
-- TECHNICIAN SERVICE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS technicians (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    specialization TEXT,
    certification VARCHAR(255),
    available BOOLEAN DEFAULT TRUE,
    experience_years INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_order_notes (
    id BIGSERIAL PRIMARY KEY,
    work_order_id BIGINT NOT NULL,
    technician_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_work_order ON work_order_notes(work_order_id);

CREATE TABLE IF NOT EXISTS time_entries (
    id BIGSERIAL PRIMARY KEY,
    work_order_id BIGINT NOT NULL,
    technician_id BIGINT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    activity VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_time_entries_work_order ON time_entries(work_order_id);

-- ============================================
-- INVOICE SERVICE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    work_order_id BIGINT NOT NULL,
    client_id BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    issue_date TIMESTAMP NOT NULL,
    due_date TIMESTAMP NOT NULL,
    subtotal DECIMAL(10,2),
    tax_rate DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    total DECIMAL(10,2) NOT NULL,
    notes TEXT,
    terms TEXT,
    terms_arabic TEXT,
    logo_url TEXT,
    watermark VARCHAR(100),
    qr_code VARCHAR(500),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    amount DECIMAL(10,2)
);

CREATE TABLE IF NOT EXISTS invoice_inserted_images (
    invoice_id BIGINT NOT NULL,
    image_url VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_invoices_work_order ON invoices(work_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ============================================
-- QUOTATION SERVICE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS quotations (
    id BIGSERIAL PRIMARY KEY,
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    client_id BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT',
    issue_date TIMESTAMP NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    subtotal DECIMAL(10,2),
    tax_rate DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    total DECIMAL(10,2) NOT NULL,
    notes TEXT,
    terms TEXT,
    terms_arabic TEXT,
    logo_url TEXT,
    watermark VARCHAR(100),
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotation_items (
    id BIGSERIAL PRIMARY KEY,
    quotation_id BIGINT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    amount DECIMAL(10,2)
);

CREATE TABLE IF NOT EXISTS quotation_inserted_images (
    quotation_id BIGINT NOT NULL,
    image_url VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_quotations_client ON quotations(client_id);

-- ============================================
-- NOTIFICATION SERVICE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    channel VARCHAR(50),
    read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_client ON notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

CREATE TABLE IF NOT EXISTS email_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default email templates
INSERT INTO email_templates (name, subject, body, type, active) VALUES
('WELCOME', 'Welcome to Rigoo Marine', 'Welcome to Rigoo Marine! We are excited to serve you.', 'USER', TRUE),
('WORK_ORDER_CREATED', 'Work Order Created', 'Your work order has been created successfully. We will contact you shortly.', 'WORK_ORDER', TRUE),
('WORK_ORDER_ASSIGNED', 'Technician Assigned', 'A technician has been assigned to your work order.', 'WORK_ORDER', TRUE),
('WORK_ORDER_COMPLETED', 'Work Order Completed', 'Your work order has been completed. Please review and confirm.', 'WORK_ORDER', TRUE),
('INVOICE_GENERATED', 'Invoice Generated', 'Your invoice is ready. Please proceed with payment.', 'INVOICE', TRUE)
ON CONFLICT DO NOTHING;
