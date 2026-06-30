import { useState } from 'react'
import { api } from '../api'

export default function AddDeadline({ onAdded, showToast }) {
  const [mode, setMode] = useState('ai') // 'ai' or 'manual'
  
  // AI fields
  const [text, setText] = useState('')
  const [aiSubmitting, setAiSubmitting] = useState(false)
  const [aiError, setAiError] = useState(null)

  // Manual fields
  const [title, setTitle] = useState('')
  const [type, setType] = useState('other')
  const [dueDate, setDueDate] = useState('')
  const [consequence, setConsequence] = useState('')
  const [recurrence, setRecurrence] = useState('none')
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [manualError, setManualError] = useState(null)

  async function handleAiSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setAiSubmitting(true)
    setAiError(null)
    try {
      await api.createFromText(text.trim())
      setText('')
      onAdded()
      if (showToast) showToast('Deadline successfully parsed and added!')
    } catch (err) {
      setAiError(
        'Could not understand that. Try something like "car insurance renews June 30".'
      )
      if (showToast) showToast('Failed to parse deadline. Please try again.', 'error')
    } finally {
      setAiSubmitting(false)
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !dueDate) return
    setManualSubmitting(true)
    setManualError(null)
    try {
      await api.createManual({
        title: title.trim(),
        type,
        due_date: dueDate,
        consequence: consequence.trim() || null,
        recurrence,
      })
      // Reset fields
      setTitle('')
      setType('other')
      setDueDate('')
      setConsequence('')
      setRecurrence('none')
      onAdded()
      if (showToast) showToast('Deadline added successfully!')
    } catch (err) {
      setManualError(err.message || 'Failed to create deadline. Please check fields.')
      if (showToast) showToast('Failed to create deadline. Please check fields.', 'error')
    } finally {
      setManualSubmitting(false)
    }
  }

  return (
    <div className="add-deadline-container">
      <div className="toggle-tabs">
        <button
          type="button"
          className={`tab-btn ${mode === 'ai' ? 'active' : ''}`}
          onClick={() => setMode('ai')}
        >
          <i className="ri-sparkling-2-line" style={{ marginRight: '6px', verticalAlign: 'middle' }}></i>
          Quick Add (AI)
        </button>
        <button
          type="button"
          className={`tab-btn ${mode === 'manual' ? 'active' : ''}`}
          onClick={() => setMode('manual')}
        >
          <i className="ri-file-list-3-line" style={{ marginRight: '6px', verticalAlign: 'middle' }}></i>
          Detailed Add
        </button>
      </div>

      {mode === 'ai' ? (
        <form className="add-bar" onSubmit={handleAiSubmit}>
          <input
            type="text"
            placeholder='e.g. "phone bill due July 5"'
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={aiSubmitting}
          />
          <button type="submit" disabled={aiSubmitting || !text.trim()}>
            {aiSubmitting ? 'Adding…' : 'Add'}
          </button>
          {aiError && <p className="field-error">{aiError}</p>}
        </form>
      ) : (
        <form className="manual-form" onSubmit={handleManualSubmit}>
          <div className="form-group full-width">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              type="text"
              placeholder="e.g. Rent Payment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={manualSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Category</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={manualSubmitting}
            >
              <option value="bill">Bill</option>
              <option value="renewal">Renewal</option>
              <option value="application">Application</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="dueDate">Due Date *</label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              disabled={manualSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="recurrence">Recurrence</label>
            <select
              id="recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              disabled={manualSubmitting}
            >
              <option value="none">One-time (None)</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="consequence">Consequence of Missing</label>
            <input
              id="consequence"
              type="text"
              placeholder="e.g. $15 late fee"
              value={consequence}
              onChange={(e) => setConsequence(e.target.value)}
              disabled={manualSubmitting}
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={manualSubmitting || !title.trim() || !dueDate}>
              {manualSubmitting ? 'Adding…' : 'Add Deadline'}
            </button>
          </div>
          {manualError && <p className="field-error full-width">{manualError}</p>}
        </form>
      )}
    </div>
  )
}
