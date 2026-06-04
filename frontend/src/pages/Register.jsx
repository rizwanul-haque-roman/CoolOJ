import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    try {
      const res = await api.post('/auth/register', formData)
      setMessage(res.data.message || 'Registration successful')
      setTimeout(() => navigate('/login'), 1000)
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    }
  }

  return (
    <div className="auth-wrapper">
      <section className="auth-showcase">
        <div>
          <h2>Build. Submit. Conquer the judge.</h2>
          <p>
            CoolOJ gives you a sleek modern coding space to solve problems, track
            verdicts, and level up your competitive programming workflow.
          </p>
        </div>

        <div className="auth-stats">
          <div className="stat-box">
            <h3>100+</h3>
            <p>Problems ready to solve</p>
          </div>
          <div className="stat-box">
            <h3>Fast</h3>
            <p>Instant frontend experience</p>
          </div>
          <div className="stat-box">
            <h3>24/7</h3>
            <p>Your coding arena stays open</p>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <h2>Create account</h2>
        <p className="subtext">Join the platform and start your coding journey.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              name="username"
              placeholder="Enter your username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button className="primary-btn" type="submit">
            Register
          </button>
        </form>

        {message && <p className="message-success">{message}</p>}
        {error && <p className="message-error">{error}</p>}

        <p className="helper-text">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </div>
  )
}

export default Register