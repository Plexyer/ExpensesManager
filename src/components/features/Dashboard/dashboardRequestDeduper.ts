import { getGridData, type GetGridDataResult } from "../../../services/fileService";
import { listPeriods } from "../../../services/periodService";
import type { PeriodBudgetInstance } from "../../../types/period.types";

let inFlightPeriodsRequest: Promise<PeriodBudgetInstance[]> | null = null;
const inFlightGridRequests = new Map<number, Promise<GetGridDataResult>>();

export const getDedupedPeriods = async (): Promise<PeriodBudgetInstance[]> => {
  if (inFlightPeriodsRequest) {
    return inFlightPeriodsRequest;
  }

  inFlightPeriodsRequest = listPeriods().finally(() => {
    inFlightPeriodsRequest = null;
  });

  return inFlightPeriodsRequest;
};

export const getDedupedGridData = async (
  budgetInstanceId: number
): Promise<GetGridDataResult> => {
  const inFlightRequest = inFlightGridRequests.get(budgetInstanceId);
  if (inFlightRequest) {
    return inFlightRequest;
  }

  const request = getGridData(budgetInstanceId).finally(() => {
    inFlightGridRequests.delete(budgetInstanceId);
  });
  inFlightGridRequests.set(budgetInstanceId, request);

  return request;
};

export const resetDashboardRequestDeduperForTests = (): void => {
  inFlightPeriodsRequest = null;
  inFlightGridRequests.clear();
};
