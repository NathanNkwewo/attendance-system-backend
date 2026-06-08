const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth')
const faceRoutes = require('./faceRoutes')

const { register, login }                              = require('../controllers/authController')
const { getCourses, createCourse, getAttendanceSummary } = require('../controllers/courseController')
const { createSession, closeSession, getSession }      = require('../controllers/sessionController')
const { submitAttendance }                             = require('../controllers/attendanceController')
const { setFacultyLocation }                           = require('../controllers/locationController')
const { getCourseAnalytics, manualMarkAttendance }     = require('../controllers/analyticsController')

// ── Auth (public) ─────────────────────────────────────────────────────────
router.post('/auth/register', register)
router.post('/auth/login',    login)

// ── Courses (protected) ───────────────────────────────────────────────────
router.get('/courses',                          auth, getCourses)
router.post('/courses',                         auth, createCourse)
router.get('/courses/:id/attendance-summary',   auth, getAttendanceSummary)
router.get('/courses/:courseId/analytics',      auth, getCourseAnalytics)

// ── Sessions (protected) ──────────────────────────────────────────────────
router.post('/sessions',                        auth, createSession)
router.patch('/sessions/:id/close',             auth, closeSession)
router.get('/sessions/:id',                     auth, getSession)
router.post('/sessions/:id/location',           auth, setFacultyLocation)
router.post('/sessions/:sessionId/manual-attendance', auth, manualMarkAttendance)

// ── Attendance (public — students have no accounts) ───────────────────────
router.post('/attendance/submit', submitAttendance)

// ── Face recognition (public) ─────────────────────────────────────────────
router.use('/face', faceRoutes)

module.exports = router
