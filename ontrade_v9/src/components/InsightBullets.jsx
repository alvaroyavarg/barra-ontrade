function InsightBullets({ bullets }) {
  return (
    <section className="card insights-card">
      <div className="section-heading">
        <span className="eyebrow">Antes de negociar</span>
        <h2>Bullets comerciales</h2>
      </div>
      <ul className="insight-list">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </section>
  );
}

export default InsightBullets;
