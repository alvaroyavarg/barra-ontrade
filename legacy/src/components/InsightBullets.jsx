function InsightBullets({ bullets }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Antes de negociar
        </span>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">Bullets comerciales</h2>
      </div>
      <ul className="flex flex-col gap-2 pl-4 text-[13px] leading-relaxed text-slate-700 [list-style-type:disc] marker:text-slate-400">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </section>
  );
}

export default InsightBullets;
