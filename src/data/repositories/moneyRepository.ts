import {database} from '../database/client';
import type {
  Account,
  Budget,
  CreateRecurringPaymentInput,
  CreateTransactionInput,
  FinanceCategory,
  MoneySnapshot,
  MoneyTransaction,
  RecurringPayment,
  SetBudgetInput,
} from '../../features/money/types';
import {createId} from '../../utils/createId';
import type {MoneyRepository} from './MoneyRepositoryContract';

type AccountRow = {id: string; name: string; type: Account['type']; currency: 'AED'; opening_balance_minor: number; position: number};
type CategoryRow = {id: string; name: string; kind: FinanceCategory['kind']; icon: string; tone: string; position: number};
type TransactionRow = {id: string; account_id: string; category_id: string; kind: MoneyTransaction['kind']; amount_minor: number; merchant: string | null; notes: string | null; occurred_at: string; source: MoneyTransaction['source']; shopping_list_id: string | null; created_at: string; updated_at: string};
type BudgetRow = {id: string; category_id: string; month_key: string; limit_minor: number; created_at: string; updated_at: string};
type RecurringRow = {id: string; title: string; account_id: string; category_id: string; amount_minor: number; frequency: RecurringPayment['frequency']; payment_type: RecurringPayment['paymentType']; next_due_at: string; active: number; created_at: string; updated_at: string};

function mapAccount(row: AccountRow): Account {
  return {id: row.id, name: row.name, type: row.type, currency: row.currency, openingBalanceMinor: Number(row.opening_balance_minor), position: Number(row.position)};
}
function mapCategory(row: CategoryRow): FinanceCategory {
  return {id: row.id, name: row.name, kind: row.kind, icon: row.icon, tone: row.tone, position: Number(row.position)};
}
function mapTransaction(row: TransactionRow): MoneyTransaction {
  return {id: row.id, accountId: row.account_id, categoryId: row.category_id, kind: row.kind, amountMinor: Number(row.amount_minor), merchant: row.merchant, notes: row.notes, occurredAt: row.occurred_at, source: row.source, shoppingListId: row.shopping_list_id, createdAt: row.created_at, updatedAt: row.updated_at};
}
function mapBudget(row: BudgetRow): Budget {
  return {id: row.id, categoryId: row.category_id, monthKey: row.month_key, limitMinor: Number(row.limit_minor), createdAt: row.created_at, updatedAt: row.updated_at};
}
function mapRecurring(row: RecurringRow): RecurringPayment {
  return {id: row.id, title: row.title, accountId: row.account_id, categoryId: row.category_id, amountMinor: Number(row.amount_minor), frequency: row.frequency, paymentType: row.payment_type, nextDueAt: row.next_due_at, active: Boolean(row.active), createdAt: row.created_at, updatedAt: row.updated_at};
}

class SQLiteMoneyRepository implements MoneyRepository {
  async loadSnapshot(): Promise<MoneySnapshot> {
    let accounts: AccountRow[] = [];
    let categories: CategoryRow[] = [];
    let transactions: TransactionRow[] = [];
    let budgets: BudgetRow[] = [];
    let recurring: RecurringRow[] = [];
    await database.transaction(async tx => {
      accounts = (await tx.execute(`SELECT id, name, type, currency, opening_balance_minor, position FROM accounts WHERE archived_at IS NULL ORDER BY position, name;`)).rows as unknown as AccountRow[];
      categories = (await tx.execute(`SELECT id, name, kind, icon, tone, position FROM finance_categories ORDER BY kind, position, name;`)).rows as unknown as CategoryRow[];
      transactions = (await tx.execute(`SELECT id, account_id, category_id, kind, amount_minor, merchant, notes, occurred_at, source, shopping_list_id, created_at, updated_at FROM transactions WHERE deleted_at IS NULL ORDER BY occurred_at DESC, created_at DESC LIMIT 500;`)).rows as unknown as TransactionRow[];
      budgets = (await tx.execute(`SELECT id, category_id, month_key, limit_minor, created_at, updated_at FROM budgets ORDER BY month_key DESC;`)).rows as unknown as BudgetRow[];
      recurring = (await tx.execute(`SELECT id, title, account_id, category_id, amount_minor, frequency, payment_type, next_due_at, active, created_at, updated_at FROM recurring_payments ORDER BY active DESC, next_due_at ASC;`)).rows as unknown as RecurringRow[];
    });
    return {accounts: accounts.map(mapAccount), categories: categories.map(mapCategory), transactions: transactions.map(mapTransaction), budgets: budgets.map(mapBudget), recurringPayments: recurring.map(mapRecurring)};
  }

  async createTransaction(input: CreateTransactionInput) {
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Amount must be greater than zero.');
    const now = new Date().toISOString();
    const occurredAt = input.occurredAt ?? now;
    await database.transaction(async tx => {
      await tx.execute(
        `INSERT INTO transactions(id, account_id, category_id, kind, amount_minor, merchant, notes, occurred_at, source, shopping_list_id, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
        [createId('txn'), input.accountId, input.categoryId, input.kind, input.amountMinor, input.merchant?.trim() || null, input.notes?.trim() || null, occurredAt, input.source ?? 'manual', input.shoppingListId ?? null, now, now],
      );
    });
    return this.loadSnapshot();
  }

  async deleteTransaction(id: string) {
    await database.transaction(async tx => {
      await tx.execute(`UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?;`, [new Date().toISOString(), new Date().toISOString(), id]);
    });
    return this.loadSnapshot();
  }

  async setBudget(input: SetBudgetInput) {
    if (!/^\d{4}-\d{2}$/.test(input.monthKey)) throw new Error('Budget month must use YYYY-MM.');
    if (!Number.isSafeInteger(input.limitMinor) || input.limitMinor < 0) throw new Error('Invalid budget amount.');
    const now = new Date().toISOString();
    await database.transaction(async tx => {
      await tx.execute(
        `INSERT INTO budgets(id, category_id, month_key, limit_minor, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(category_id, month_key) DO UPDATE SET limit_minor = excluded.limit_minor, updated_at = excluded.updated_at;`,
        [createId('budget'), input.categoryId, input.monthKey, input.limitMinor, now, now],
      );
    });
    return this.loadSnapshot();
  }

  async createRecurringPayment(input: CreateRecurringPaymentInput) {
    if (!input.title.trim()) throw new Error('Recurring payment title is required.');
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Invalid recurring amount.');
    if (!Number.isFinite(new Date(input.nextDueAt).getTime())) throw new Error('Invalid due date.');
    const now = new Date().toISOString();
    await database.transaction(async tx => {
      await tx.execute(
        `INSERT INTO recurring_payments(id, title, account_id, category_id, amount_minor, frequency, payment_type, next_due_at, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
        [createId('recurring'), input.title.trim(), input.accountId, input.categoryId, input.amountMinor, input.frequency, input.paymentType, input.nextDueAt, now, now],
      );
    });
    return this.loadSnapshot();
  }

  async toggleRecurringPayment(id: string, active: boolean) {
    await database.transaction(async tx => {
      await tx.execute(`UPDATE recurring_payments SET active = ?, updated_at = ? WHERE id = ?;`, [active ? 1 : 0, new Date().toISOString(), id]);
    });
    return this.loadSnapshot();
  }
}

export const moneyRepository: MoneyRepository = new SQLiteMoneyRepository();
