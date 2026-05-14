function CustomerSearch({ disabled, query, resultCount, totalCount, onQueryChange }) {
  return (
    <section
      aria-label="Búsqueda de clientes"
      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <label
        className="text-[10px] font-semibold uppercase tracking-wide text-slate-500"
        htmlFor="customer-search"
      >
        Buscar cliente
      </label>
      <input
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        disabled={disabled}
        id="customer-search"
        placeholder="Cliente, comuna, ruta, zona o canal"
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <p className="text-[12px] text-slate-500">
        {totalCount > 0
          ? `${resultCount} de ${totalCount} clientes`
          : "Carga un Excel para ver clientes detectados"}
      </p>
    </section>
  );
}

export default CustomerSearch;
