const pool = require('../db/pool')

// GET /courses — get all courses for logged-in faculty
const getCourses = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM courses WHERE faculty_id = $1 ORDER BY created_at DESC',
      [req.faculty.id]
    )
    return res.json(result.rows.map(row => ({
      id: row.id,
      name: row.name,
      code: row.code,
      facultyId: row.faculty_id,
      createdAt: row.created_at,
    })))
  } catch (err) {
    console.error('Get courses error:', err.message)
    return res.status(500).json({ message: 'Failed to fetch courses.' })
  }
}

// POST /courses — create a new course
const createCourse = async (req, res) => {
  const { name, code } = req.body

  if (!name || !code) {
    return res.status(400).json({ message: 'Course name and code are required.' })
  }

  try {
    const result = await pool.query(
      'INSERT INTO courses (name, code, faculty_id) VALUES ($1, $2, $3) RETURNING *',
      [name, code, req.faculty.id]
    )
    const row = result.rows[0]
    return res.status(201).json({
      id: row.id,
      name: row.name,
      code: row.code,
      facultyId: row.faculty_id,
      createdAt: row.created_at,
    })
  } catch (err) {
    console.error('Create course error:', err.message)
    return res.status(500).json({ message: 'Failed to create course.' })
  }
}

// GET /courses/:id/attendance-summary
const getAttendanceSummary = async (req, res) => {
  const { id: courseId } = req.params

  try {
    // Verify course belongs to this faculty
    const courseCheck = await pool.query(
      'SELECT id FROM courses WHERE id = $1 AND faculty_id = $2',
      [courseId, req.faculty.id]
    )
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found.' })
    }

    // Total sessions for this course
    const sessionsResult = await pool.query(
      'SELECT COUNT(*) FROM sessions WHERE course_id = $1',
      [courseId]
    )
    const totalSessions = parseInt(sessionsResult.rows[0].count)

    // Per-student attendance count
    const summaryResult = await pool.query(
      `SELECT
        a.student_id,
        a.student_name,
        COUNT(*) AS attended
       FROM attendance a
       JOIN sessions s ON a.session_id = s.id
       WHERE s.course_id = $1 AND a.verified = true
       GROUP BY a.student_id, a.student_name
       ORDER BY a.student_name ASC`,
      [courseId]
    )

    const summary = summaryResult.rows.map(row => {
      const attended = parseInt(row.attended)
      const percentage = totalSessions > 0 ? (attended / totalSessions) * 100 : 0
      return {
        studentId: row.student_id,
        studentName: row.student_name,
        totalSessions,
        attended,
        percentage: Math.round(percentage * 10) / 10,
        belowThreshold: percentage < 75,
      }
    })

    return res.json(summary)
  } catch (err) {
    console.error('Attendance summary error:', err.message)
    return res.status(500).json({ message: 'Failed to fetch attendance summary.' })
  }
}

module.exports = { getCourses, createCourse, getAttendanceSummary }
