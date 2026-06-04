import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
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
    setError('')

    try {
      const res = await api.post('/auth/login', formData)
      localStorage.setItem('token', res.data.token)
      navigate('/problems')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div className="auth-wrapper">
      <section className="auth-showcase">
        <div>
          <h2>Welcome back to your command center.</h2>
          <p>
            Log in to continue solving problems, checking verdicts, and managing
            your coding progress inside a modern dark interface.
          </p>
        </div>

        <div className="auth-stats">
          <div className="stat-box">
            <h3>Secure</h3>
            <p>Protected login flow</p>
          </div>
          <div className="stat-box">
            <h3>Smart</h3>
            <p>Built for coding workflows</p>
          </div>
          <div className="stat-box">
            <h3>Focused</h3>
            <p>Dark UI for long sessions</p>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <h2>Login</h2>
        <p className="subtext">Enter your credentials to access CoolOJ.</p>

        <form onSubmit={handleSubmit}>
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
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button className="primary-btn" type="submit">
            Login
          </button>
        </form>

        {error && <p className="message-error">{error}</p>}

        <p className="helper-text">
          Don’t have an account? <Link to="/register">Register</Link>
        </p>
      </section>
    </div>
  )
}

export default Login