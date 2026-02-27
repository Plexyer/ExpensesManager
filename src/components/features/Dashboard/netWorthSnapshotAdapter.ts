import {
  getNetWorthSnapshot,
} from "../../../services/accountService";
import type {
  NetWorthCurrencyTotal,
  NetWorthSnapshot,
} from "../../../types/account.types";

export interface DashboardNetWorthCardModel {
  currency: string;
  assetsTotal: number;
  liabilitiesTotal: number;
  netTotal: number;
}

export const mapNetWorthTotalsToDashboardCards = (
  totals: NetWorthCurrencyTotal[]
): DashboardNetWorthCardModel[] => {
  return totals.map((total) => ({
    currency: total.currency,
    assetsTotal: total.assets_total,
    liabilitiesTotal: total.liabilities_total,
    netTotal: total.net_total,
  }));
};

export const getDashboardNetWorthCards = async (
  asOfDate?: string
): Promise<{ snapshot: NetWorthSnapshot; cards: DashboardNetWorthCardModel[] }> => {
  const snapshot = await getNetWorthSnapshot(asOfDate);
  return {
    snapshot,
    cards: mapNetWorthTotalsToDashboardCards(snapshot.totals_by_currency),
  };
};
