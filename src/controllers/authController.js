const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db/pool')

// POST /auth/register
const register = async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' })
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' })
  }

  try {
    // Check if email already exists
    const existing = await pool.query('SELECT id FROM faculty WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const result = await pool.query(
      'INSERT INTO faculty (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    )

    const faculty = result.rows[0]
    const token = jwt.sign(
      { id: faculty.id, email: faculty.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.status(201).json({ token, faculty })
  } catch (err) {
    console.error('Register error:', err.message)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
}

// POST /auth/login
const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }

  try {
    const result = await pool.query('SELECT * FROM faculty WHERE email = $1', [email])
    const faculty = result.rows[0]

    if (!faculty) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const isMatch = await bcrypt.compare(password, faculty.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const token = jwt.sign(
      { id: faculty.id, email: faculty.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.json({
      token,
      faculty: { id: faculty.id, name: faculty.name, email: faculty.email },
    })
  } catch (err) {
    console.error('Login error:', err.message)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
}

module.exports = { register, login }
