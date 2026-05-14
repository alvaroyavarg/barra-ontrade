function OpeningLine({ text }) {
  return (
    <section className="card opening-card">
      <span className="eyebrow">Frase de apertura</span>
      <blockquote>{text}</blockquote>
    </section>
  );
}

export default OpeningLine;
