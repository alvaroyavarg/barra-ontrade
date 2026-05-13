import { COMMERCIAL_AGREEMENTS } from "../data/commercialAgreements.js";
import { normalizeColumnName } from "./columnMapping.js";

const AGREEMENTS_WITH_ID = COMMERCIAL_AGREEMENTS.filter((agreement) => agreement.customerId);
const AGREEMENTS_WITHOUT_ID = COMMERCIAL_AGREEMENTS.filter((agreement) => !agreement.customerId);
const AGREEMENTS_BY_ID = new Map();

for (const agreement of AGREEMENTS_WITH_ID) {
  if (!AGREEMENTS_BY_ID.has(agreement.customerId)) {
    AGREEMENTS_BY_ID.set(agreement.customerId, agreement);
  }
}

export function enrichCustomersWithAgreements(customers) {
  return customers.map((customer) => {
    const agreement = getAgreementByCustomerId(customer.customerId);

    return {
      ...customer,
      agreement,
      hasAgreement: Boolean(agreement),
      searchText: [customer.searchText, agreement?.account, agreement?.chainAccount].filter(Boolean).join(" "),
    };
  });
}

export function getAgreementByCustomerId(customerId) {
  if (!customerId) {
    return null;
  }

  return AGREEMENTS_BY_ID.get(String(customerId)) ?? null;
}

export function getAgreementRecords(records) {
  return records.filter((record) => AGREEMENTS_BY_ID.has(String(record.customerId)));
}

export function getAgreementCustomers(customers) {
  return customers.filter((customer) => customer.hasAgreement);
}

export function getAgreementStats(records, customers) {
  const recordIds = new Set(records.map((record) => String(record.customerId)).filter(Boolean));
  const matchedAgreementIds = new Set(AGREEMENTS_WITH_ID.map((agreement) => agreement.customerId).filter((id) => recordIds.has(id)));
  const matchedCustomers = getAgreementCustomers(customers);
  const matchedChains = new Set(matchedCustomers.map((customer) => customer.agreement?.chainAccount).filter(Boolean));

  return {
    agreementsInFile: matchedAgreementIds.size,
    chainsInFile: matchedChains.size,
    customersInFile: matchedCustomers.length,
    pendingWithoutId: AGREEMENTS_WITHOUT_ID.length,
    totalAgreements: COMMERCIAL_AGREEMENTS.length,
    totalWithId: AGREEMENTS_WITH_ID.length,
  };
}

export function getPendingAgreementsWithoutId() {
  return AGREEMENTS_WITHOUT_ID;
}

export function getAgreementCatalogSearchText(agreement) {
  return normalizeColumnName(
    [agreement.account, agreement.chainAccount, agreement.bottler, agreement.customerId, agreement.rawId].filter(Boolean).join(" "),
  );
}
