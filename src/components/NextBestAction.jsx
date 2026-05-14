function NextBestAction({ text }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Siguiente mejor acción
      </span>
      <p className="text-[13px] leading-relaxed text-slate-700">{text}</p>
    </section>
  );
}

export default NextBestAction;
