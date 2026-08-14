import type {RootState} from '../../app/store';
import {monthKeyFor} from '../../utils/money';

export const selectMoney = (state: RootState) => state.money;

export const selectMoneySummary = (state: RootState) => {
  const {accounts, transactions, budgets, recurringPayments} = state.money;
  const now = new Date();
  const monthKey = monthKeyFor(now);
  const monthTransactions = transactions.filter(item => item.occurredAt.startsWith(monthKey));
  const incomeMinor = monthTransactions.filter(item => item.kind === 'income').reduce((sum, item) => sum + item.amountMinor, 0);
  const expenseMinor = monthTransactions.filter(item => item.kind === 'expense').reduce((sum, item) => sum + item.amountMinor, 0);
  const balanceMinor = accounts.reduce((sum, account) => sum + account.openingBalanceMinor, 0)
    + transactions.reduce((sum, item) => sum + (item.kind === 'income' ? item.amountMinor : -item.amountMinor), 0);

  const budgetRows = budgets.filter(item => item.monthKey === monthKey);
  const budgetLimitMinor = budgetRows.reduce((sum, item) => sum + item.limitMinor, 0);
  const budgetedCategoryIds = new Set(budgetRows.map(item => item.categoryId));
  const budgetedSpendMinor = monthTransactions
    .filter(item => item.kind === 'expense' && budgetedCategoryIds.has(item.categoryId))
    .reduce((sum, item) => sum + item.amountMinor, 0);
  const budgetRemainingMinor = Math.max(0, budgetLimitMinor - budgetedSpendMinor);

  const nextThirtyDays = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const upcomingObligationsMinor = recurringPayments
    .filter(item => item.active)
    .filter(item => {
      const due = new Date(item.nextDueAt).getTime();
      return due >= Date.now() && due <= nextThirtyDays;
    })
    .reduce((sum, item) => sum + item.amountMinor, 0);

  const safeToSpendMinor = Math.max(0, Math.min(balanceMinor - upcomingObligationsMinor, budgetLimitMinor > 0 ? budgetRemainingMinor : balanceMinor - upcomingObligationsMinor));

  return {
    monthKey,
    incomeMinor,
    expenseMinor,
    balanceMinor,
    budgetLimitMinor,
    budgetedSpendMinor,
    budgetRemainingMinor,
    upcomingObligationsMinor,
    safeToSpendMinor,
  };
};

export const selectCategorySpend = (state: RootState) => {
  const monthKey = monthKeyFor();
  const categories = state.money.categories.filter(item => item.kind === 'expense');
  return categories.map(category => ({
    category,
    spentMinor: state.money.transactions
      .filter(item => item.kind === 'expense' && item.categoryId === category.id && item.occurredAt.startsWith(monthKey))
      .reduce((sum, item) => sum + item.amountMinor, 0),
    budgetMinor: state.money.budgets.find(item => item.categoryId === category.id && item.monthKey === monthKey)?.limitMinor ?? null,
  })).filter(item => item.spentMinor > 0 || item.budgetMinor !== null).sort((a, b) => b.spentMinor - a.spentMinor);
};
