import { useMemo, useState } from "react";
import Header from "./Header.jsx";
import UploadCard from "./UploadCard.jsx";
import CustomerSearch from "./CustomerSearch.jsx";
import CustomerList from "./CustomerList.jsx";
import CustomerBrief from "./CustomerBrief.jsx";
import GeneralViews from "./GeneralViews.jsx";
import AgreementsPage from "./AgreementsPage.jsx";
import PageNav from "./PageNav.jsx";
import PortfolioPage from "./PortfolioPage.jsx";
import RecordFilters from "./RecordFilters.jsx";
import { parseExcelFile } from "../utils/excelParser.js";
import { buildCustomerBriefs } from "../utils/insightEngine.js";
import { buildGeneralViews } from "../utils/overviewEngine.js";
import { normalizeColumnName } from "../utils/columnMapping.js";
import { applyRecordFilters } from "../utils/filterEngine.js";
import {
  enrichCustomersWithAgreements,
  getAgreementCustomers,
  getAgreementRecords,
  getAgreementStats,
  getPendingAgreementsWithoutId,
} from "../utils/agreementEngine.js";

function CommercialConsultationModule({ onBackHome }) {
  const [activePage, setActivePage] = useState("general");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [fileSummary, setFileSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [query, setQuery] = useState("");
  const [portfolioFilters, setPortfolioFilters] = useState([]);
  const [agreementFilters, setAgreementFilters] = useState([]);
  const [accountFilters, setAccountFilters] = useState([]);
  const [yearBasis, setYearBasis] = useState("calendar");

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? customers[0] ?? null,
    [customers, selectedCustomerId],
  );

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = normalizeColumnName(query);

    if (!normalizedQuery) {
      return customers;
    }

    return customers.filter((customer) => customer.searchText.includes(normalizedQuery));
  }, [customers, query]);

  const portfolioFilteredRecords = useMemo(
    () => applyRecordFilters(records, portfolioFilters),
    [portfolioFilters, records],
  );

  const portfolioViews = useMemo(() => {
    if (!fileSummary || records.length === 0) {
      return null;
    }

    return buildGeneralViews(portfolioFilteredRecords, fileSummary, { scope: "portfolio", yearBasis });
  }, [fileSummary, portfolioFilteredRecords, records.length, yearBasis]);

  const agreementRecords = useMemo(() => getAgreementRecords(records), [records]);
  const agreementFilteredRecords = useMemo(
    () => applyRecordFilters(agreementRecords, agreementFilters),
    [agreementFilters, agreementRecords],
  );
  const agreementCustomerIds = useMemo(
    () => new Set(agreementFilteredRecords.map((record) => String(record.customerId)).filter(Boolean)),
    [agreementFilteredRecords],
  );
  const agreementCustomers = useMemo(
    () => getAgreementCustomers(customers).filter((customer) => agreementCustomerIds.has(String(customer.customerId))),
    [agreementCustomerIds, customers],
  );
  const agreementViews = useMemo(() => {
    if (!fileSummary || agreementRecords.length === 0) {
      return null;
    }

    return buildGeneralViews(agreementFilteredRecords, fileSummary, { scope: "portfolio", yearBasis });
  }, [agreementFilteredRecords, agreementRecords.length, fileSummary, yearBasis]);
  const agreementStats = useMemo(
    () => getAgreementStats(agreementFilteredRecords, agreementCustomers),
    [agreementCustomers, agreementFilteredRecords],
  );
  const pendingAgreements = useMemo(() => getPendingAgreementsWithoutId(), []);

  const selectedCustomerRecords = useMemo(() => {
    if (!selectedCustomer) {
      return [];
    }

    if (selectedCustomer.customerId) {
      return records.filter((record) => String(record.customerId) === String(selectedCustomer.customerId));
    }

    const selectedName = normalizeColumnName(selectedCustomer.customerName);
    return records.filter((record) => normalizeColumnName(record.customerName) === selectedName);
  }, [records, selectedCustomer]);

  const selectedCustomerFilteredRecords = useMemo(
    () => applyRecordFilters(selectedCustomerRecords, accountFilters),
    [accountFilters, selectedCustomerRecords],
  );

  const selectedCustomerViews = useMemo(() => {
    if (!fileSummary || selectedCustomerRecords.length === 0) {
      return null;
    }

    return buildGeneralViews(selectedCustomerFilteredRecords, fileSummary, { scope: "customer", yearBasis });
  }, [fileSummary, selectedCustomerFilteredRecords, selectedCustomerRecords.length, yearBasis]);

  async function handleFileSelected(file) {
    if (!file) {
      return;
    }

    setIsLoading(true);
    setError("");
    setWarnings([]);
    setFileSummary(null);
    setRecords([]);
    setCustomers([]);
    setSelectedCustomerId("");
    setQuery("");
    setPortfolioFilters([]);
    setAgreementFilters([]);
    setAccountFilters([]);

    try {
      const parsed = await parseExcelFile(file);
      const customerBriefs = enrichCustomersWithAgreements(buildCustomerBriefs(parsed.records, parsed.summary));

      setFileSummary(parsed.summary);
      setRecords(parsed.records);
      setWarnings(parsed.warnings);
      setCustomers(customerBriefs);
      setSelectedCustomerId(customerBriefs[0]?.id ?? "");
      setActivePage("general");
    } catch (uploadError) {
      setError(uploadError.message || "No pude procesar el archivo. Intenta con otro Excel.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3.5 pb-3 pt-1.5 text-[13px] font-black uppercase text-slate-500">
        <button
          className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
          type="button"
          onClick={onBackHome}
        >
          Volver al inicio
        </button>
        <span>Consulta Comercial PDV</span>
      </div>

      <Header />

      <section className="grid gap-4" aria-label="Consulta comercial PDV">
        <div className="grid gap-3.5 content-start">
          <UploadCard fileName={fileSummary?.fileName} isLoading={isLoading} onFileSelected={handleFileSelected} />

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3.5 text-rose-800" role="alert">
              <strong className="mb-1 block font-semibold">No se pudo cargar el archivo</strong>
              <p className="m-0 text-[13px]">{error}</p>
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5 text-amber-800" role="status">
              <strong className="mb-1 block font-semibold">Datos revisados</strong>
              {warnings.map((warning) => (
                <p key={warning} className="m-0 text-[13px]">{warning}</p>
              ))}
            </div>
          ) : null}

          <PageNav
            activePage={activePage}
            hasSalesFile={Boolean(fileSummary)}
            onChangePage={(page) => setActivePage(page)}
          />

          {activePage === "general" ? (
            <RecordFilters
              baseRecords={records}
              filteredRecords={portfolioFilteredRecords}
              filters={portfolioFilters}
              scopeLabel="la cartera"
              onFiltersChange={setPortfolioFilters}
            />
          ) : null}

          {activePage === "agreements" ? (
            <RecordFilters
              baseRecords={agreementRecords}
              filteredRecords={agreementFilteredRecords}
              filters={agreementFilters}
              scopeLabel="acuerdos comerciales"
              onFiltersChange={setAgreementFilters}
            />
          ) : null}

          {activePage === "account" ? (
            <RecordFilters
              baseRecords={selectedCustomerRecords}
              filteredRecords={selectedCustomerFilteredRecords}
              filters={accountFilters}
              scopeLabel="la cuenta"
              onFiltersChange={setAccountFilters}
            />
          ) : null}

          {activePage === "account" ? (
            <>
              <CustomerSearch
                disabled={customers.length === 0}
                query={query}
                resultCount={filteredCustomers.length}
                totalCount={customers.length}
                onQueryChange={setQuery}
              />

              <CustomerList
                customers={filteredCustomers}
                hasFile={Boolean(fileSummary)}
                selectedCustomerId={selectedCustomer?.id ?? ""}
                onSelectCustomer={(customerId) => {
                  setSelectedCustomerId(customerId);
                  setAccountFilters([]);
                }}
              />
            </>
          ) : null}
        </div>

        <div className="grid gap-3.5 content-start">
          {activePage === "general" ? (
            <PortfolioPage
              fileSummary={fileSummary}
              views={portfolioViews}
              yearBasis={yearBasis}
              onYearBasisChange={setYearBasis}
            />
          ) : null}

          {activePage === "agreements" ? (
            <AgreementsPage
              customers={agreementCustomers}
              fileSummary={fileSummary}
              pendingAgreements={pendingAgreements}
              stats={agreementStats}
              views={agreementViews}
              yearBasis={yearBasis}
              onYearBasisChange={setYearBasis}
              onOpenCustomer={(customerId) => {
                setSelectedCustomerId(customerId);
                setAccountFilters([]);
                setActivePage("account");
              }}
            />
          ) : null}

          {activePage === "account" ? (
            <>
              <GeneralViews
                scope="customer"
                scopeName={selectedCustomer?.customerName}
                views={selectedCustomerViews}
                yearBasis={yearBasis}
                onYearBasisChange={setYearBasis}
              />
              <CustomerBrief customer={selectedCustomer} fileSummary={fileSummary} />
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}

export default CommercialConsultationModule;
