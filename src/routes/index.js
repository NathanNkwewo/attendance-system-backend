const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')

const { register, login } = require('../controllers/authController')
const { getCourses, createCourse, getAttendanceSummary } = require('../controllers/courseController')
const { createSession, closeSession, getSession } = require('../controllers/sessionController')
const { submitAttendance } = require('../controllers/attendanceController')

const { setFacultyLocation } = require('../controllers/locationController')

// ─── Auth (public) ────────────────────────────────────────────────────────────
router.post('/auth/register', register)
router.post('/auth/login', login)

// ─── Courses (protected) ──────────────────────────────────────────────────────
router.get('/courses', auth, getCourses)
router.post('/courses', auth, createCourse)
router.get('/courses/:id/attendance-summary', auth, getAttendanceSummary)

// ─── Sessions (protected) ─────────────────────────────────────────────────────
router.post('/sessions', auth, createSession)
router.patch('/sessions/:id/close', auth, closeSession)
router.get('/sessions/:id', auth, getSession)

router.post('/sessions/:id/location', auth, setFacultyLocation)

// ─── Attendance (public — students don't have accounts) ───────────────────────
router.post('/attendance/submit', submitAttendance)

module.exports = router
