/**
 * routes/faceRoutes.js
 */

const express = require('express')
const router  = express.Router()
const pool    = require('../db/pool')

const DESCRIPTOR_LENGTH = 128
const MATCH_THRESHOLD   = 0.6

function euclideanDistance(a, b) {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0))
}

function isValidDescriptor(descriptor) {
  return (
    Array.isArray(descriptor) &&
    descriptor.length === DESCRIPTOR_LENGTH &&
    descriptor.every((v) => typeof v === 'number' && isFinite(v))
  )
}

// GET /face/status/:studentId
router.get('/status/:studentId', async (req, res) => {
  const { studentId } = req.params
  try {
    const result = await pool.query(
      'SELECT enrolled_at FROM student_faces WHERE student_id = $1',
      [studentId]
    )
    const enrolled = result.rows.length > 0
    return res.status(200).json({
      enrolled,
      enrolledAt: enrolled ? result.rows[0].enrolled_at : null,
    })
  } catch (err) {
    console.error('[faceRoutes] /status error:', err.message)
    return res.status(500).json({ error: 'Database error.' })
  }
})

// POST /face/enrol/:studentId
router.post('/enrol/:studentId', async (req, res) => {
  const { studentId } = req.params
  const { descriptor } = req.body

  if (!isValidDescriptor(descriptor)) {
    return res.status(400).json({ error: 'Invalid face descriptor.' })
  }

  try {
    await pool.query(
      `INSERT INTO student_faces (student_id, face_descriptor, enrolled_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (student_id)
       DO UPDATE SET face_descriptor = $2, enrolled_at = NOW()`,
      [studentId, JSON.stringify(descriptor)]
    )
    return res.status(200).json({ success: true, message: 'Face enrolled successfully.' })
  } catch (err) {
    console.error('[faceRoutes] /enrol error:', err.message)
    return res.status(500).json({ error: 'Database error during enrolment.' })
  }
})

// POST /face/verify/:studentId
router.post('/verify/:studentId', async (req, res) => {
  const { studentId } = req.params
  const { descriptor: liveDescriptor } = req.body

  if (!isValidDescriptor(liveDescriptor)) {
    return res.status(400).json({ error: 'Invalid face descriptor.' })
  }

  try {
    const result = await pool.query(
      'SELECT face_descriptor FROM student_faces WHERE student_id = $1',
      [studentId]
    )

    if (!result.rows.length) {
      return res.status(422).json({ error: 'No face enrolled for this student.' })
    }

    const storedDescriptor = JSON.parse(result.rows[0].face_descriptor)
    const distance = euclideanDistance(liveDescriptor, storedDescriptor)
    const match    = distance < MATCH_THRESHOLD

    return res.status(200).json({ match, distance: parseFloat(distance.toFixed(4)) })
  } catch (err) {
    console.error('[faceRoutes] /verify error:', err.message)
    return res.status(500).json({ error: 'Verification error.' })
  }
})

module.exports = router
