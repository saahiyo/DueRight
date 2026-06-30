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

  // Urgency dynamic style map
  const cardBorderColors = {
    critical: 'border-[#c8442e]/18',
    high: 'border-[#d98a33]/18',
    medium: 'border-[#3b6fa0]/18',
    low: 'border-[#9a9a95]/18',
  }

  const countdownStyles = {
    critical: 'bg-[#fdf4f2] text-[#c8442e] border border-[#c8442e]/12',
    high: 'bg-[#fdf8f2] text-[#d98a33] border border-[#d98a33]/12',
    medium: 'bg-[#f0f5fa] text-[#3b6fa0] border border-[#3b6fa0]/12',
    low: 'bg-[#f6f6f5] text-[#9a9a95] border border-[#9a9a95]/12',
  }

  const badgeStyles = {
    critical: 'bg-[#fbeae6] text-[#c8442e]',
    high: 'bg-[#fcf1e2] text-[#d98a33]',
    medium: 'bg-[#e9f0f7] text-[#3b6fa0]',
    low: 'bg-[#f1f1ef] text-[#9a9a95]',
  }

  return (
    <article className={`flex gap-3.5 sm:gap-5 bg-white border rounded-[14px] p-4 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04),0_2px_4px_rgba(0,0,0,0.01)] ${cardBorderColors[deadline.urgency] || 'border-[#e6e4df]'}`}>
      <div className={`flex flex-col items-center justify-center min-w-[56px] sm:min-w-[68px] py-2 sm:py-3 px-1 sm:px-1.5 rounded-[10px] font-mono self-start mt-0.5 ${countdownStyles[deadline.urgency]}`}>
        <span className="font-sans font-bold text-xl sm:text-2xl leading-none tracking-tight">{overdue ? Math.abs(days) : days}</span>
        <span className="text-[8px] sm:text-[9px] uppercase tracking-wider font-semibold mt-1 text-center opacity-80 leading-none">
          {overdue ? 'days over' : days === 1 ? 'day' : 'days'}
        </span>
        {deadline.recurrence && deadline.recurrence !== 'none' && (
          <span className="text-[7.5px] sm:text-[8px] text-[#6b6b70] mt-1 flex items-center gap-0.5 leading-none">
            <i className="ri-refresh-line text-[9px] sm:text-[10px]"></i>
            {deadline.recurrence}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold m-0 text-[#1c1b1f]">{deadline.title}</h3>
          <div className="flex gap-2 items-center">
            <button 
              type="button" 
              className="border-none bg-none text-[#1c1b1f] text-xs font-semibold cursor-pointer p-0 hover:text-[#6b6b70]"
              onClick={handleExportICS} 
              title="Export to Calendar (.ics)" 
              style={{ textDecoration: 'none', fontSize: '14px', padding: '2px 4px', display: 'flex', items: 'center' }}
            >
              <i className="ri-calendar-event-line"></i>
            </button>
            <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap ${badgeStyles[deadline.urgency]}`}>
              {URGENCY_LABEL[deadline.urgency]}
            </span>
          </div>
        </div>

        {deadline.consequence && (
          <p className="text-[13px] text-[#6b6b70] mt-1.5 mb-0">{deadline.consequence}</p>
        )}

        {deadline.drafted_action && (
          <div className="mt-3 p-3 bg-[#f7f6f3] rounded-lg text-[13.5px] leading-relaxed">
            <p className="m-0 mb-2 whitespace-pre-wrap">{deadline.drafted_action}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" className="border-none bg-none text-[#1c1b1f] text-xs font-semibold underline cursor-pointer p-0 hover:text-[#6b6b70]" onClick={handleCopy}>
                <i className={copied ? "ri-checkbox-circle-fill" : "ri-file-copy-line"} style={{ marginRight: '4px', verticalAlign: 'middle' }}></i>
                {copied ? 'Copied' : 'Copy'}
              </button>
              <span className="text-[#e6e4df] text-xs">•</span>
              <a href={mailtoUrl} className="border-none bg-none text-[#1c1b1f] text-xs font-semibold underline cursor-pointer p-0 hover:text-[#6b6b70] inline-flex items-center" target="_blank" rel="noopener noreferrer">
                <i className="ri-mail-send-line mr-1"></i>
                Email
              </a>
              <span className="text-[#e6e4df] text-xs">•</span>
              <a href={whatsappUrl} className="border-none bg-none text-[#1c1b1f] text-xs font-semibold underline cursor-pointer p-0 hover:text-[#6b6b70] inline-flex items-center" target="_blank" rel="noopener noreferrer">
                <i className="ri-whatsapp-line mr-1"></i>
                WhatsApp
              </a>
            </div>
          </div>
        )}

        {deadline.status !== 'resolved' && (
          <div className="flex gap-2 mt-3.5 w-full">
            <button 
              type="button" 
              className="flex-1 py-1.5 px-2 sm:py-2 sm:px-4 rounded-lg text-[12px] sm:text-[13px] font-semibold cursor-pointer border border-[#e6e4df] bg-[#1c1b1f] text-white hover:bg-[#2c2b30] hover:border-[#2c2b30] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap"
              onClick={handleDraft} 
              disabled={drafting}
            >
              <i className="ri-sparkling-2-line align-middle"></i>
              <span className="truncate">
                {drafting
                  ? 'Drafting…'
                  : deadline.drafted_action
                  ? 'Redraft'
                  : 'Draft action'}
              </span>
            </button>
            <button 
              type="button" 
              className="flex-1 py-1.5 px-2 sm:py-2 sm:px-4 rounded-lg text-[12px] sm:text-[13px] font-semibold cursor-pointer border border-[#e6e4df] bg-white text-[#1c1b1f] transition-all duration-200 hover:bg-[#f7f6f3] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap"
              onClick={handleResolve}
            >
              <i className="ri-checkbox-circle-line align-middle"></i>
              <span className="truncate">Mark resolved</span>
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
