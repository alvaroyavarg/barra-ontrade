function Header() {
  return (
    <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl"
        >
          🪩
        </div>
        <span>Diageo Chile</span>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">BARRA</h1>
        <p className="text-base text-slate-500">
          On Trade Execution · Brief comercial antes de negociar
        </p>
      </div>
    </header>
  );
}

export default Header;
