const pool = require('./pool')

const createTables = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS faculty (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS courses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) NOT NULL,
      faculty_id UUID NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      session_code VARCHAR(6) NOT NULL,
      session_url TEXT NOT NULL,
      status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
      duration_minutes INTEGER NOT NULL DEFAULT 15,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      closed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS faculty_locations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      student_name VARCHAR(255) NOT NULL,
      student_id VARCHAR(100) NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      distance DOUBLE PRECISION NOT NULL,
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      device_fingerprint VARCHAR(255),
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(session_id, student_id)
    );

    -- Add duration_minutes if it doesn't exist (for existing databases)
    DO $$ BEGIN
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 15;
    EXCEPTION WHEN others THEN NULL;
    END $$;

    -- Add device_fingerprint if it doesn't exist
    DO $$ BEGIN
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(255);
    EXCEPTION WHEN others THEN NULL;
    END $$;
  `

  try {
    await pool.query(query)
    console.log('Database tables created successfully')
  } catch (err) {
    console.error('Error creating tables:', err.message)
    throw err
  }
}

module.exports = createTables
