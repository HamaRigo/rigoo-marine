-- Rigoo Marine Database Initialization Script
-- Creates tables for all microservices

-- ============================================
-- CLIENT SERVICE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS clients (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'CLIENT',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS client_profiles (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    tax_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    year INTEGER,
    length DECIMAL(10,2),
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
    price DECIMAL(12,2),
    duration_minutes INTEGER,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default services
INSERT INTO services (name, description, category, price, duration_minutes, available) VALUES
('Engine Diagnostics', 'Complete engine computer diagnostics and troubleshooting', 'Engine', 150.00, 60, TRUE),
('Oil Change', 'Full engine oil change with premium marine oil', 'Maintenance', 250.00, 90, TRUE),
('Propeller Repair', 'Propeller inspection, repair and balancing', 'Propulsion', 350.00, 180, TRUE),
('Hull Cleaning', 'Professional hull cleaning and inspection', 'Hull', 200.00, 120, TRUE),
('Electrical System Check', 'Complete electrical system inspection', 'Electrical', 175.00, 90, TRUE),
('Winterization', 'Complete winterization service', 'Seasonal', 500.00, 240, TRUE),
('De-winterization', 'Spring commissioning and de-winterization', 'Seasonal', 450.00, 180, TRUE),
('Bottom Paint', 'Anti-fouling bottom paint application', 'Hull', 600.00, 300, TRUE),
('Transmission Service', 'Transmission fluid change and inspection', 'Transmission', 400.00, 120, TRUE),
('Generator Service', 'On-board generator maintenance and service', 'Generator', 300.00, 90, TRUE);

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
    service_ids TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_work_orders_client_id ON work_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician ON work_orders(assigned_technician_id);

-- ============================================
-- TECHNICIAN SERVICE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS technicians (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    specialization VARCHAR(100),
    certifications TEXT,
    experience_years INTEGER,
    status VARCHAR(50) DEFAULT 'AVAILABLE',
    rating DECIMAL(3,2) DEFAULT 0.00,
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
    work_order_id BIGINT NOT NULL,
    client_id BIGINT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    payment_method VARCHAR(50),
    payment_date TIMESTAMP,
    due_date TIMESTAMP,
    pdf_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_work_order ON invoices(work_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    transaction_id VARCHAR(255),
    amount DECIMAL(12,2),
    status VARCHAR(50),
    payment_gateway VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON payment_transactions(invoice_id);

-- ============================================
-- NOTIFICATION SERVICE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    reference_id BIGINT,
    reference_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
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
('INVOICE_GENERATED', 'Invoice Generated', 'Your invoice is ready. Please proceed with payment.', 'INVOICE', TRUE);

-- ============================================
-- AUTHENTICATION / USERS TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'CLIENT',
    enabled BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- REFRESH TOKENS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
