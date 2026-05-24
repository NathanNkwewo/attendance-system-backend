const pool = require('../db/pool')

// POST /sessions/:id/location — faculty sets their GPS location for the session
const setFacultyLocation = async (req, res) => {
  const { id: sessionId } = req.params
  const { latitude, longitude } = req.body

  if (!latitude || !longitude) {
    return res.status(400).json({ message: 'Latitude and longitude are required.' })
  }

  try {
    // Verify session belongs to this faculty
    const check = await pool.query(
      `SELECT s.id FROM sessions s
       JOIN courses c ON s.course_id = c.id
       WHERE s.id = $1 AND c.faculty_id = $2`,
      [sessionId, req.faculty.id]
    )
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found.' })
    }

    // Upsert — replace if location already set for this session
    await pool.query(
      `INSERT INTO faculty_locations (session_id, latitude, longitude)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id) DO UPDATE SET latitude = $2, longitude = $3, recorded_at = NOW()`,
      [sessionId, latitude, longitude]
    )

    return res.json({ message: 'Location set successfully.' })
  } catch (err) {
    console.error('Set faculty location error:', err.message)
    return res.status(500).json({ message: 'Failed to set location.' })
  }
}

module.exports = { setFacultyLocation }
