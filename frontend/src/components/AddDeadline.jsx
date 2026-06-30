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
    <div className="mb-8 bg-white border border-[#e6e4df] rounded-[10px] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
      <div className="flex gap-2 mb-4 border-b border-[#e6e4df] pb-3">
        <button
          type="button"
          className={`bg-none border-none py-1.5 px-3 text-[13.5px] font-semibold text-[#6b6b70] cursor-pointer rounded-md transition-all duration-200 hover:bg-[#f7f6f3] hover:text-[#1c1b1f] ${
            mode === 'ai' ? '!bg-[#1c1b1f] !text-white' : ''
          }`}
          onClick={() => setMode('ai')}
        >
          <i className="ri-sparkling-2-line mr-1.5 align-middle"></i>
          Quick Add (AI)
        </button>
        <button
          type="button"
          className={`bg-none border-none py-1.5 px-3 text-[13.5px] font-semibold text-[#6b6b70] cursor-pointer rounded-md transition-all duration-200 hover:bg-[#f7f6f3] hover:text-[#1c1b1f] ${
            mode === 'manual' ? '!bg-[#1c1b1f] !text-white' : ''
          }`}
          onClick={() => setMode('manual')}
        >
          <i className="ri-file-list-3-line mr-1.5 align-middle"></i>
          Detailed Add
        </button>
      </div>

      {mode === 'ai' ? (
        <form className="relative flex gap-2 w-full pb-5" onSubmit={handleAiSubmit}>
          <input
            type="text"
            className="flex-1 h-12 bg-white border border-[#e6e4df] rounded-lg px-4 text-sm font-medium placeholder-[#9a9a95] focus:outline-none focus:border-[#6b6b70] transition-colors disabled:bg-[#faf9f6]"
            placeholder='e.g. "phone bill due July 5"'
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={aiSubmitting}
          />
          <button
            type="submit"
            className="h-12 bg-[#1c1b1f] text-white border-none py-2 px-6 rounded-lg text-sm font-semibold hover:bg-[#2c2b30] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={aiSubmitting || !text.trim()}
          >
            {aiSubmitting ? 'Adding…' : 'Add'}
          </button>
          {aiError && <p className="absolute bottom-[-4px] left-0 text-xs font-semibold text-[#c8442e]">{aiError}</p>}
        </form>
      ) : (
        <form className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3.5 mt-2" onSubmit={handleManualSubmit}>
          <div className="flex flex-col gap-1.5 text-left md:col-span-2">
            <label htmlFor="title" className="font-semibold text-[13px] text-[#1c1b1f]">Title *</label>
            <input
              id="title"
              type="text"
              className="h-10 bg-white border border-[#e6e4df] rounded-lg px-3.5 text-sm placeholder-[#9a9a95] focus:outline-none focus:border-[#6b6b70] transition-colors disabled:bg-[#faf9f6]"
              placeholder="e.g. Rent Payment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={manualSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label htmlFor="type" className="font-semibold text-[13px] text-[#1c1b1f]">Category</label>
            <select
              id="type"
              className="h-10 bg-white border border-[#e6e4df] rounded-lg px-3.5 text-sm focus:outline-none focus:border-[#6b6b70] transition-colors disabled:bg-[#faf9f6]"
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

          <div className="flex flex-col gap-1.5 text-left">
            <label htmlFor="dueDate" className="font-semibold text-[13px] text-[#1c1b1f]">Due Date *</label>
            <input
              id="dueDate"
              type="date"
              className="h-10 bg-white border border-[#e6e4df] rounded-lg px-3.5 text-sm focus:outline-none focus:border-[#6b6b70] transition-colors disabled:bg-[#faf9f6]"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              disabled={manualSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label htmlFor="recurrence" className="font-semibold text-[13px] text-[#1c1b1f]">Recurrence</label>
            <select
              id="recurrence"
              className="h-10 bg-white border border-[#e6e4df] rounded-lg px-3.5 text-sm focus:outline-none focus:border-[#6b6b70] transition-colors disabled:bg-[#faf9f6]"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              disabled={manualSubmitting}
            >
              <option value="none">One-time (None)</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label htmlFor="consequence" className="font-semibold text-[13px] text-[#1c1b1f]">Consequence of Missing</label>
            <input
              id="consequence"
              type="text"
              className="h-10 bg-white border border-[#e6e4df] rounded-lg px-3.5 text-sm placeholder-[#9a9a95] focus:outline-none focus:border-[#6b6b70] transition-colors disabled:bg-[#faf9f6]"
              placeholder="e.g. $15 late fee"
              value={consequence}
              onChange={(e) => setConsequence(e.target.value)}
              disabled={manualSubmitting}
            />
          </div>

          <div className="col-span-full flex justify-end mt-2">
            <button
              type="submit"
              className="h-10 bg-[#1c1b1f] text-white border-none py-2 px-6 rounded-lg text-sm font-semibold hover:bg-[#2c2b30] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={manualSubmitting || !title.trim() || !dueDate}
            >
              {manualSubmitting ? 'Adding…' : 'Add Deadline'}
            </button>
          </div>
          {manualError && <p className="col-span-full text-xs font-semibold text-[#c8442e] mt-1">{manualError}</p>}
        </form>
      )}
    </div>
  )
}
