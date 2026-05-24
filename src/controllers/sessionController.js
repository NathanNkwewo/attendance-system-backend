const pool = require('../db/pool')

const generateSessionCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// POST /sessions — start a new session for a course
const createSession = async (req, res) => {
  const { courseId, durationMinutes } = req.body

  if (!courseId) {
    return res.status(400).json({ message: 'courseId is required.' })
  }

  const duration = durationMinutes || 15 // default 15 minutes

  try {
    const courseCheck = await pool.query(
      'SELECT id, name FROM courses WHERE id = $1 AND faculty_id = $2',
      [courseId, req.faculty.id]
    )
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found.' })
    }

    const course = courseCheck.rows[0]
    const sessionCode = generateSessionCode()
    const sessionId = require('crypto').randomUUID()
    const sessionUrl = `${process.env.FRONTEND_URL}/attend/${sessionId}`

    const result = await pool.query(
      `INSERT INTO sessions (id, course_id, session_code, session_url, duration_minutes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [sessionId, courseId, sessionCode, sessionUrl, duration]
    )

    const row = result.rows[0]

    // Schedule auto-close
    setTimeout(async () => {
      try {
        await pool.query(
          `UPDATE sessions SET status = 'closed', closed_at = NOW()
           WHERE id = $1 AND status = 'active'`,
          [sessionId]
        )
        console.log(`Session ${sessionId} auto-closed after ${duration} minutes`)
      } catch (err) {
        console.error('Auto-close error:', err.message)
      }
    }, duration * 60 * 1000)

    return res.status(201).json({
      id: row.id,
      courseId: row.course_id,
      courseName: course.name,
      sessionCode: row.session_code,
      sessionUrl: row.session_url,
      status: row.status,
      durationMinutes: row.duration_minutes,
      createdAt: row.created_at,
      closedAt: row.closed_at,
    })
  } catch (err) {
    console.error('Create session error:', err.message)
    return res.status(500).json({ message: 'Failed to create session.' })
  }
}

// PATCH /sessions/:id/close
const closeSession = async (req, res) => {
  const { id } = req.params

  try {
    const check = await pool.query(
      `SELECT s.id FROM sessions s
       JOIN courses c ON s.course_id = c.id
       WHERE s.id = $1 AND c.faculty_id = $2`,
      [id, req.faculty.id]
    )
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found.' })
    }

    const result = await pool.query(
      `UPDATE sessions SET status = 'closed', closed_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    )

    const row = result.rows[0]
    const courseResult = await pool.query('SELECT name FROM courses WHERE id = $1', [row.course_id])

    return res.json({
      id: row.id,
      courseId: row.course_id,
      courseName: courseResult.rows[0]?.name,
      sessionCode: row.session_code,
      sessionUrl: row.session_url,
      status: row.status,
      durationMinutes: row.duration_minutes,
      createdAt: row.created_at,
      closedAt: row.closed_at,
    })
  } catch (err) {
    console.error('Close session error:', err.message)
    return res.status(500).json({ message: 'Failed to close session.' })
  }
}

// GET /sessions/:id
const getSession = async (req, res) => {
  const { id } = req.params

  try {
    const sessionResult = await pool.query(
      `SELECT s.*, c.name AS course_name
       FROM sessions s
       JOIN courses c ON s.course_id = c.id
       WHERE s.id = $1 AND c.faculty_id = $2`,
      [id, req.faculty.id]
    )

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found.' })
    }

    const row = sessionResult.rows[0]

    const attendeesResult = await pool.query(
      `SELECT * FROM attendance WHERE session_id = $1 ORDER BY submitted_at ASC`,
      [id]
    )

    const attendees = attendeesResult.rows.map(a => ({
      id: a.id,
      sessionId: a.session_id,
      studentName: a.student_name,
      studentId: a.student_id,
      latitude: a.latitude,
      longitude: a.longitude,
      distance: a.distance,
      verified: a.verified,
      submittedAt: a.submitted_at,
    }))

    return res.json({
      id: row.id,
      courseId: row.course_id,
      courseName: row.course_name,
      sessionCode: row.session_code,
      sessionUrl: row.session_url,
      status: row.status,
      durationMinutes: row.duration_minutes,
      createdAt: row.created_at,
      closedAt: row.closed_at,
      attendees,
    })
  } catch (err) {
    console.error('Get session error:', err.message)
    return res.status(500).json({ message: 'Failed to fetch session.' })
  }
}

module.exports = { createSession, closeSession, getSession }
