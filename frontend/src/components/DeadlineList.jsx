import DeadlineCard from './DeadlineCard'

export default function DeadlineList({ title, deadlines, emptyText, muted, onChanged, showToast }) {
  return (
    <section className={`mb-10 last:mb-0 ${muted ? 'opacity-60' : ''}`}>
      <h2 className="font-bold text-[13px] tracking-wider text-[#6b6b70] uppercase mb-4">{title}</h2>
      {deadlines.length === 0 && emptyText ? (
        <p className="text-sm text-[#6b6b70] italic my-4">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {deadlines.map((d) => (
            <DeadlineCard key={d.id} deadline={d} onChanged={onChanged} showToast={showToast} />
          ))}
        </div>
      )}
    </section>
  )
}
