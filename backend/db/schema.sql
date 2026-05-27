CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 VARCHAR(200) NOT NULL,
  email                VARCHAR(200) UNIQUE NOT NULL,
  password_hash        TEXT NOT NULL,
  phone                VARCHAR(20) NOT NULL,
  industry             VARCHAR(100),
  bio                  TEXT,
  verification_type    VARCHAR(20) NOT NULL DEFAULT 'pending',
  verification_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
  verification_notes   TEXT,
  din_number           VARCHAR(20),
  din_director_name    VARCHAR(200),
  linkedin_url         TEXT,
  succession_prev_din  VARCHAR(20),
  succession_new_din   VARCHAR(20),
  succession_doc_url   TEXT,
  is_admin             BOOLEAN DEFAULT FALSE,
  lat                  DECIMAL(10,7),
  lng                  DECIMAL(10,7),
  city                 VARCHAR(100),
  is_active            BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE connection_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(20) DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

CREATE TABLE connections (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a_id, user_b_id)
);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification ON users(verification_status);
CREATE INDEX idx_users_location ON users(lat, lng);
CREATE INDEX idx_users_din ON users(din_number);
CREATE INDEX idx_conn_req_sender ON connection_requests(sender_id);
CREATE INDEX idx_conn_req_receiver ON connection_requests(receiver_id);
CREATE INDEX idx_connections_a ON connections(user_a_id);
CREATE INDEX idx_connections_b ON connections(user_b_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_conn_req_updated BEFORE UPDATE ON connection_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Default admin account (password: Admin@1234)
-- Change this password immediately after first login!
INSERT INTO users (name, email, password_hash, phone, verification_type, verification_status, is_admin, city, lat, lng)
VALUES (
  'Admin',
  'admin@bsquare.in',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGgPnBpSk9Xu7Z5kNv8XmG1v5Iq',
  '0000000000',
  'admin', 'approved', TRUE, 'Hyderabad', 17.385, 78.4867
);
