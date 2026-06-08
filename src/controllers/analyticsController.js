const pool = require('../db/pool')

// GET /courses/:courseId/analytics
const getCourseAnalytics = async (req, res) => {
  const { courseId } = req.params
  const facultyId = req.faculty.id

  try {
    const courseCheck = await pool.query(
      'SELECT id, name, code FROM courses WHERE id = $1 AND faculty_id = $2',
      [courseId, facultyId]
    )
    if (!courseCheck.rows.length) {
      return res.status(404).json({ message: 'Course not found.' })
    }

    const result = await pool.query(
      `SELECT
         s.id,
         s.session_code,
         s.created_at,
         s.status,
         COUNT(a.id)                              AS total,
         COUNT(CASE WHEN a.verified    THEN 1 END) AS verified,
         COUNT(CASE WHEN a.is_late     THEN 1 END) AS late,
         COUNT(CASE WHEN a.is_manual   THEN 1 END) AS manual
       FROM sessions s
       LEFT JOIN attendance a ON a.session_id = s.id
       WHERE s.course_id = $1
       GROUP BY s.id, s.session_code, s.created_at, s.status
       ORDER BY s.created_at ASC`,
      [courseId]
    )

    return res.status(200).json({
      courseId,
      courseName: courseCheck.rows[0].name,
      courseCode: courseCheck.rows[0].code,
      sessions: result.rows.map((r, i) => ({
        id:          r.id,
        label:       `Session ${i + 1}`,
        sessionCode: r.session_code,
        date:        r.created_at,
        status:      r.status,
        total:       parseInt(r.total),
        verified:    parseInt(r.verified),
        late:        parseInt(r.late),
        manual:      parseInt(r.manual),
      })),
    })
  } catch (err) {
    console.error('[analyticsController]', err.message)
    return res.status(500).json({ message: 'Failed to fetch analytics.' })
  }
}

// POST /sessions/:sessionId/manual-attendance
const manualMarkAttendance = async (req, res) => {
  const { sessionId } = req.params
  const { studentName, studentId } = req.body
  const facultyId = req.faculty.id

  if (!studentName?.trim() || !studentId?.trim()) {
    return res.status(400).json({ message: 'Student name and ID are required.' })
  }

  try {
    // Verify session belongs to this faculty
    const sessionCheck = await pool.query(
      `SELECT s.id, s.status FROM sessions s
       JOIN courses c ON c.id = s.course_id
       WHERE s.id = $1 AND c.faculty_id = $2`,
      [sessionId, facultyId]
    )
    if (!sessionCheck.rows.length) {
      return res.status(404).json({ message: 'Session not found.' })
    }

    // Check for duplicate
    const dupCheck = await pool.query(
      'SELECT id FROM attendance WHERE session_id = $1 AND student_id = $2',
      [sessionId, studentId.trim()]
    )
    if (dupCheck.rows.length) {
      return res.status(409).json({ message: 'Attendance already recorded for this student.' })
    }

    await pool.query(
      `INSERT INTO attendance
         (session_id, student_name, student_id, latitude, longitude,
          distance, verified, is_manual, is_late, submitted_at)
       VALUES ($1, $2, $3, 0, 0, 0, true, true, false, NOW())`,
      [sessionId, studentName.trim(), studentId.trim()]
    )

    return res.status(201).json({
      success: true,
      message: `${studentName} marked present manually.`,
    })
  } catch (err) {
    console.error('[manualMarkAttendance]', err.message)
    return res.status(500).json({ message: 'Failed to mark attendance.' })
  }
}

module.exports = { getCourseAnalytics, manualMarkAttendance }
