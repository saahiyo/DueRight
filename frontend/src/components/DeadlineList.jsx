import DeadlineCard from './DeadlineCard'

export default function DeadlineList({ title, deadlines, emptyText, muted, onChanged, showToast }) {
  return (
    <section className={`list-section${muted ? ' muted' : ''}`}>
      <h2>{title}</h2>
      {deadlines.length === 0 && emptyText ? (
        <p className="empty">{emptyText}</p>
      ) : (
        <div className="card-stack">
          {deadlines.map((d) => (
            <DeadlineCard key={d.id} deadline={d} onChanged={onChanged} showToast={showToast} />
          ))}
        </div>
      )}
    </section>
  )
}
