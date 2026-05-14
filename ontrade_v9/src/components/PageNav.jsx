const PAGES = [
  { key: "general", label: "Vista General", requiresSalesFile: true },
  { key: "agreements", label: "Vista Acuerdos Comerciales", requiresSalesFile: true },
  { key: "account", label: "Vista por Cuenta", requiresSalesFile: true },
];

function PageNav({ activePage, hasSalesFile, onChangePage }) {
  return (
    <nav className="card page-nav" aria-label="Vistas principales">
      {PAGES.map((page) => {
        const disabled = page.requiresSalesFile && !hasSalesFile;

        return (
          <button
            key={page.key}
            className={activePage === page.key ? "page-nav__button page-nav__button--active" : "page-nav__button"}
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
