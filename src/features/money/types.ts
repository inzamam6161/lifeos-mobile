export type CurrencyCode = 'AED';
export type AccountType = 'cash' | 'bank' | 'card';
export type TransactionKind = 'expense' | 'income';
export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';
export type RecurringPaymentType = 'bill' | 'subscription';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  openingBalanceMinor: number;
  position: number;
};

export type FinanceCategory = {
  id: string;
  name: string;
  kind: TransactionKind;
  icon: string;
  tone: string;
  position: number;
};

export type MoneyTransaction = {
  id: string;
  accountId: string;
  categoryId: string;
  kind: TransactionKind;
  amountMinor: number;
  merchant: string | null;
  notes: string | null;
  occurredAt: string;
  source: 'manual' | 'shopping';
  shoppingListId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Budget = {
  id: string;
  categoryId: string;
  monthKey: string;
  limitMinor: number;
  createdAt: string;
  updatedAt: string;
};

export type RecurringPayment = {
  id: string;
  title: string;
  accountId: string;
  categoryId: string;
  amountMinor: number;
  frequency: RecurringFrequency;
  paymentType: RecurringPaymentType;
  nextDueAt: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateTransactionInput = {
  accountId: string;
  categoryId: string;
  kind: TransactionKind;
  amountMinor: number;
  merchant?: string;
  notes?: string;
  occurredAt?: string;
  source?: 'manual' | 'shopping';
  shoppingListId?: string | null;
};

export type SetBudgetInput = {
  categoryId: string;
  monthKey: string;
  limitMinor: number;
};

export type CreateRecurringPaymentInput = {
  title: string;
  accountId: string;
  categoryId: string;
  amountMinor: number;
  frequency: RecurringFrequency;
  paymentType: RecurringPaymentType;
  nextDueAt: string;
};

export type MoneySnapshot = {
  accounts: Account[];
  categories: FinanceCategory[];
  transactions: MoneyTransaction[];
  budgets: Budget[];
  recurringPayments: RecurringPayment[];
};
