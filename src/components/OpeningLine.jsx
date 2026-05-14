function OpeningLine({ text }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Frase de apertura
      </span>
      <blockquote className="border-l-2 border-slate-200 pl-3 text-[13px] italic leading-relaxed text-slate-700">
        {text}
      </blockquote>
    </section>
  );
}

export default OpeningLine;
