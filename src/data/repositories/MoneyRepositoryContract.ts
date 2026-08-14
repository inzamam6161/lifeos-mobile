import type {
  CreateRecurringPaymentInput,
  CreateTransactionInput,
  MoneySnapshot,
  SetBudgetInput,
} from '../../features/money/types';

export interface MoneyRepository {
  loadSnapshot(): Promise<MoneySnapshot>;
  createTransaction(input: CreateTransactionInput): Promise<MoneySnapshot>;
  deleteTransaction(id: string): Promise<MoneySnapshot>;
  setBudget(input: SetBudgetInput): Promise<MoneySnapshot>;
  createRecurringPayment(input: CreateRecurringPaymentInput): Promise<MoneySnapshot>;
  toggleRecurringPayment(id: string, active: boolean): Promise<MoneySnapshot>;
}
