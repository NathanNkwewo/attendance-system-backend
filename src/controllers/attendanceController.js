const pool = require('../db/pool')
const { verifyGeofence } = require('../utils/haversine')

// POST /attendance/submit
const submitAttendance = async (req, res) => {
  const { studentName, studentId, sessionCode, latitude, longitude, deviceFingerprint } = req.body

  if (!studentName || !studentId || !sessionCode || !latitude || !longitude) {
    return res.status(400).json({ message: 'All fields are required.' })
  }

  try {
    // Find active session matching this code
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

    // Check session is active
    if (session.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'This session is closed. Attendance is no longer being accepted.',
        verified: false,
      })
    }

    // Check duplicate student ID
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

    // One device per session check
    if (deviceFingerprint) {
      const deviceCheck = await pool.query(
        'SELECT id, student_name FROM attendance WHERE session_id = $1 AND device_fingerprint = $2',
        [session.id, deviceFingerprint]
      )
      if (deviceCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `This device was already used to submit attendance for ${deviceCheck.rows[0].student_name} in this session.`,
          verified: false,
        })
      }
    }

    // Get faculty GPS coordinates
    const facultyResult = await pool.query(
      'SELECT latitude, longitude FROM faculty_locations WHERE session_id = $1',
      [session.id]
    )

    let verified = false
    let distance = 0

    if (facultyResult.rows.length > 0) {
      const { latitude: classLat, longitude: classLon } = facultyResult.rows[0]
      const result = verifyGeofence(classLat, classLon, latitude, longitude)
      verified = result.verified
      distance = result.distance
    } else {
      verified = true
      distance = 0
    }

    // Save attendance record
    await pool.query(
      `INSERT INTO attendance (session_id, student_name, student_id, latitude, longitude, distance, verified, device_fingerprint)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [session.id, studentName, studentId, latitude, longitude, distance, verified, deviceFingerprint || null]
    )

    if (!verified) {
      return res.status(200).json({
        success: false,
        message: `You are outside the allowed classroom area (${Math.round(distance)}m away, limit is 150m).`,
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
