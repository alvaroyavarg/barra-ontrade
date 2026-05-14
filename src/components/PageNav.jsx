const PAGES = [
  { key: "general", label: "Vista General", requiresSalesFile: true },
  { key: "agreements", label: "Vista Acuerdos Comerciales", requiresSalesFile: true },
  { key: "account", label: "Vista por Cuenta", requiresSalesFile: true },
];

const BUTTON_BASE =
  "rounded-lg px-3 py-1.5 text-left text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";
const BUTTON_INACTIVE = "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";
const BUTTON_ACTIVE = "border border-slate-900 bg-slate-900 text-white hover:bg-slate-800";

function PageNav({ activePage, hasSalesFile, onChangePage }) {
  return (
    <nav
      aria-label="Vistas principales"
      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      {PAGES.map((page) => {
        const disabled = page.requiresSalesFile && !hasSalesFile;
        const isActive = activePage === page.key;

        return (
          <button
            key={page.key}
            className={`${BUTTON_BASE} ${isActive ? BUTTON_ACTIVE : BUTTON_INACTIVE}`}
            disabled={disabled}
            type="button"
            onClick={() => onChangePage(page.key)}
          >
            {page.label}
          </button>
        );
      })}
    </nav>
  );
}

export default PageNav;
