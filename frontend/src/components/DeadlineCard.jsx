import { useState } from 'react'
import { api } from '../api'

const URGENCY_LABEL = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

function daysUntil(dueDateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(`${dueDateStr}T00:00:00`)
  return Math.round((due - today) / (1000 * 60 * 60 * 24))
}

export default function DeadlineCard({ deadline, onChanged, showToast }) {
  const [drafting, setDrafting] = useState(false)
  const [copied, setCopied] = useState(false)

  const days = daysUntil(deadline.due_date)
  const overdue = days < 0

  async function handleDraft() {
    setDrafting(true)
    if (showToast) showToast('AI is generating your action draft...', 'info')
    try {
      await api.draftAction(deadline.id)
      onChanged()
      if (showToast) showToast('AI action draft generated successfully!')
    } catch (err) {
      if (showToast) showToast('Failed to generate action draft.', 'error')
    } finally {
      setDrafting(false)
    }
  }

  async function handleResolve() {
    await api.updateStatus(deadline.id, 'resolved')
    onChanged()
    if (showToast) {
      if (deadline.recurrence && deadline.recurrence !== 'none') {
        showToast('Deadline resolved! Scheduled next recurring instance.')
      } else {
        showToast('Deadline marked as resolved!')
      }
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(deadline.drafted_action || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    if (showToast) showToast('Draft copied to clipboard!')
  }

  function handleExportICS() {
    const formattedDate = deadline.due_date.replace(/-/g, '')
    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//DueRight//Deadline Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${deadline.id}@dueright.com`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${formattedDate}`,
      `SUMMARY:${deadline.title}`,
      `DESCRIPTION:${deadline.consequence || 'No consequence specified.'}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${deadline.title.toLowerCase().replace(/\s+/g, '_')}_deadline.ics`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    if (showToast) showToast('Calendar event (.ics) downloaded!')
  }

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(
    `Regarding: ${deadline.title}`
  )}&body=${encodeURIComponent(deadline.drafted_action || '')}`

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    deadline.drafted_action || ''
  )}`

  return (
    <article className={`card urgency-${deadline.urgency}`}>
      <div className="countdown">
        <span className="count">{overdue ? Math.abs(days) : days}</span>
        <span className="unit">
          {overdue ? 'days over' : days === 1 ? 'day' : 'days'}
        </span>
        {deadline.recurrence && deadline.recurrence !== 'none' && (
          <span className="unit" style={{ fontSize: '8px', color: 'var(--ink-soft)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
            <i className="ri-refresh-line" style={{ fontSize: '10px' }}></i>
            {deadline.recurrence}
          </span>
        )}
      </div>

      <div className="card-body">
        <div className="card-top">
          <h3>{deadline.title}</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              type="button" 
              className="link-btn" 
              onClick={handleExportICS} 
              title="Export to Calendar (.ics)" 
              style={{ textDecoration: 'none', fontSize: '14px', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
            >
              <i className="ri-calendar-event-line"></i>
            </button>
            <span className={`badge badge-${deadline.urgency}`}>
              {URGENCY_LABEL[deadline.urgency]}
            </span>
          </div>
        </div>

        {deadline.consequence && (
          <p className="consequence">{deadline.consequence}</p>
        )}

        {deadline.drafted_action && (
          <div className="draft-box">
            <p>{deadline.drafted_action}</p>
            <div className="draft-actions">
              <button type="button" className="link-btn" onClick={handleCopy}>
                <i className={copied ? "ri-checkbox-circle-fill" : "ri-file-copy-line"} style={{ marginRight: '4px', verticalAlign: 'middle' }}></i>
                {copied ? 'Copied' : 'Copy'}
              </button>
              <span className="divider">•</span>
              <a href={mailtoUrl} className="link-btn text-link" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <i className="ri-mail-send-line" style={{ marginRight: '4px' }}></i>
                Email
              </a>
              <span className="divider">•</span>
              <a href={whatsappUrl} className="link-btn text-link" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <i className="ri-whatsapp-line" style={{ marginRight: '4px' }}></i>
                WhatsApp
              </a>
            </div>
          </div>
        )}

        {deadline.status !== 'resolved' && (
          <div className="card-actions">
            <button type="button" onClick={handleDraft} disabled={drafting}>
              <i className="ri-sparkling-2-line" style={{ marginRight: '6px', verticalAlign: 'middle' }}></i>
              {drafting
                ? 'Drafting…'
                : deadline.drafted_action
                ? 'Redraft action'
                : 'Draft action'}
            </button>
            <button type="button" className="ghost-btn" onClick={handleResolve}>
              <i className="ri-checkbox-circle-line" style={{ marginRight: '6px', verticalAlign: 'middle' }}></i>
              Mark resolved
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
