const pool = require('../db/pool')
const { verifyGeofence } = require('../utils/haversine')

// POST /attendance/submit — student submits attendance
const submitAttendance = async (req, res) => {
  const { studentName, studentId, sessionCode, latitude, longitude, faceVerified = false } = req.body

  if (!studentName || !studentId || !sessionCode || !latitude || !longitude) {
    return res.status(400).json({ message: 'All fields are required.' })
  }

  try {
    // Find the active session matching this code
    const sessionResult = await pool.query(
      `SELECT s.*, c.name AS course_name
       FROM sessions s
       JOIN courses c ON s.course_id = c.id
       WHERE s.session_code = $1`,
      [sessionCode]
    )

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid session code. Please check with your lecturer.',
        verified: false,
      })
    }

    const session = sessionResult.rows[0]

    // Check session is still active
    if (session.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'This session is closed. Attendance is no longer being accepted.',
        verified: false,
      })
    }

    // Check for duplicate submission
    const duplicate = await pool.query(
      'SELECT id FROM attendance WHERE session_id = $1 AND student_id = $2',
      [session.id, studentId]
    )
    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Attendance already submitted for this session with your student ID.',
        verified: false,
      })
    }

    // Get faculty GPS coordinates from the session
    // Faculty location is stored when they create the session
    const facultyResult = await pool.query(
      'SELECT latitude, longitude FROM faculty_locations WHERE session_id = $1',
      [session.id]
    )

    let verified = false
    let distance = 0

    if (facultyResult.rows.length > 0) {
      // Verify student is within the lecturer-defined geofence radius
      const { latitude: classLat, longitude: classLon } = facultyResult.rows[0]
      const result = verifyGeofence(classLat, classLon, latitude, longitude, session.geofence_radius)
      verified = result.verified
      distance = result.distance
    } else {
      // No faculty location set — auto-verify (fallback)
      verified = true
      distance = 0
    }

    // Save attendance record
    await pool.query(
      `INSERT INTO attendance (session_id, student_name, student_id, latitude, longitude, distance, verified, face_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [session.id, studentName, studentId, latitude, longitude, distance, verified, faceVerified]
    )

    if (!verified) {
      return res.status(200).json({
        success: false,
        message: `You are outside the allowed classroom area (${Math.round(distance)}m away, limit is ${session.geofence_radius}m).`,
        verified: false,
        distance,
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully.',
      verified: true,
      distance,
    })
  } catch (err) {
    console.error('Submit attendance error:', err.message)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
}

module.exports = { submitAttendance }
