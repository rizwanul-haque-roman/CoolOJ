import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api/axios'

function ProblemDetails() {
  const { id } = useParams()
  const [problem, setProblem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await api.get(`/problems/${id}`)
        setProblem(res.data)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load problem details')
      } finally {
        setLoading(false)
      }
    }

    fetchProblem()
  }, [id])

  const getDifficultyClass = (difficulty) => {
    const value = (difficulty || '').toLowerCase()

    if (value === 'easy') return 'badge badge-easy'
    if (value === 'medium') return 'badge badge-medium'
    if (value === 'hard') return 'badge badge-hard'
    return 'badge'
  }

  if (loading) {
    return <div className="details-loading">Loading problem details...</div>
  }

  if (error) {
    return <div className="details-error">{error}</div>
  }

  if (!problem) {
    return <div className="details-error">Problem not found.</div>
  }

  return (
    <div className="details-layout">
      <div className="details-main">
        <section className="details-card">
          <div className="details-hero">
            <div>
              <h2 className="details-title">{problem.title}</h2>
              <p className="details-subtext">
                Solve the challenge carefully, follow the format, and prepare
                your solution for the judge pipeline.
              </p>
            </div>

            <span className={getDifficultyClass(problem.difficulty)}>
              {problem.difficulty || 'Unknown'}
            </span>
          </div>

          <div className="details-meta-grid">
            <div className="meta-box">
              <span>Problem ID</span>
              <strong>{problem.id}</strong>
            </div>
            <div className="meta-box">
              <span>Time Limit</span>
              <strong>{problem.time_limit_ms} ms</strong>
            </div>
            <div className="meta-box">
              <span>Memory Limit</span>
              <strong>{problem.memory_limit_kb} KB</strong>
            </div>
            <div className="meta-box">
              <span>Subject</span>
              <strong>{problem.subject_name || 'General'}</strong>
            </div>
          </div>
        </section>

        <section className="details-card">
          <h3 className="section-title">Statement</h3>
          <p className="statement-block">
            {problem.statement || 'No statement available.'}
          </p>
        </section>

        <section className="details-card">
          <h3 className="section-title">Input & Output</h3>

          <div className="format-list">
            <div className="format-item">
              <span>Input Format</span>
              <strong>{problem.input_format || 'Not provided'}</strong>
            </div>

            <div className="format-item">
              <span>Output Format</span>
              <strong>{problem.output_format || 'Not provided'}</strong>
            </div>

            <div className="format-item">
              <span>Constraints</span>
              <strong>{problem.constraints || 'Not provided'}</strong>
            </div>
          </div>
        </section>

        <section className="details-card">
          <h3 className="section-title">Sample Walkthrough</h3>

          <div className="sample-grid">
            <div className="sample-box">
              <h4>Sample Input</h4>
              <div className="code-preview">
                1 2
              </div>
            </div>

            <div className="sample-box">
              <h4>Sample Output</h4>
              <div className="code-preview">
                3
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="details-side">
        <section className="details-card">
          <h3 className="section-title">Actions</h3>
          <div className="cta-stack">
            <button className="primary-btn">Open Editor</button>
            <button className="secondary-btn">Submit Solution</button>
            <Link to="/problems" className="secondary-btn" style={{ textAlign: 'center' }}>
              Back to Problems
            </Link>
          </div>
        </section>

        <section className="details-card">
          <h3 className="section-title">Judge Notes</h3>
          <ul className="info-list">
            <li>Read the statement carefully before coding.</li>
            <li>Follow the input and output format exactly.</li>
            <li>Watch the time and memory limits before submission.</li>
          </ul>
        </section>

        <section className="details-card">
          <h3 className="section-title">Status</h3>
          <div className="mini-kpi">
            <span>Visibility</span>
            <strong>{problem.is_public ? 'Public' : 'Private'}</strong>
          </div>
          <div className="mini-kpi">
            <span>Difficulty</span>
            <strong>{problem.difficulty || 'Unknown'}</strong>
          </div>
          <div className="mini-kpi">
            <span>Route Param</span>
            <strong>{id}</strong>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProblemDetails