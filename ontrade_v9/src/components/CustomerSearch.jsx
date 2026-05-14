function CustomerSearch({ disabled, query, resultCount, totalCount, onQueryChange }) {
  return (
    <section className="card search-card" aria-label="Búsqueda de clientes">
      <label htmlFor="customer-search">Buscar cliente</label>
      <input
        disabled={disabled}
        id="customer-search"
        placeholder="Cliente, comuna, ruta, zona o canal"
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <p>
        {totalCount > 0
          ? `${resultCount} de ${totalCount} clientes`
          : "Carga un Excel para ver clientes detectados"}
      </p>
    </section>
  );
}

export default CustomerSearch;
