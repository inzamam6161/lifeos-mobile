import {database} from '../database/client';
import type {ShoppingItem, ShoppingList, ShoppingSnapshot} from '../../features/shopping/types';
import {createId} from '../../utils/createId';
import type {ShoppingRepository} from './ShoppingRepositoryContract';

type ListRow = {id: string; name: string; budget_minor: number | null; currency: 'AED'; status: ShoppingList['status']; created_at: string; updated_at: string};
type ItemRow = {id: string; list_id: string; title: string; quantity: number; unit_price_minor: number | null; checked: number; position: number; created_at: string; updated_at: string};

function mapList(row: ListRow): ShoppingList {
  return {id: row.id, name: row.name, budgetMinor: row.budget_minor == null ? null : Number(row.budget_minor), currency: row.currency, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at};
}
function mapItem(row: ItemRow): ShoppingItem {
  return {id: row.id, listId: row.list_id, title: row.title, quantity: Number(row.quantity), unitPriceMinor: row.unit_price_minor == null ? null : Number(row.unit_price_minor), checked: Boolean(row.checked), position: Number(row.position), createdAt: row.created_at, updatedAt: row.updated_at};
}

class SQLiteShoppingRepository implements ShoppingRepository {
  async loadSnapshot(): Promise<ShoppingSnapshot> {
    let lists: ListRow[] = [];
    let items: ItemRow[] = [];
    await database.transaction(async tx => {
      lists = (await tx.execute(`SELECT id, name, budget_minor, currency, status, created_at, updated_at FROM shopping_lists ORDER BY status ASC, created_at DESC;`)).rows as unknown as ListRow[];
      items = (await tx.execute(`SELECT id, list_id, title, quantity, unit_price_minor, checked, position, created_at, updated_at FROM shopping_items ORDER BY list_id, position, created_at;`)).rows as unknown as ItemRow[];
    });
    return {lists: lists.map(mapList), items: items.map(mapItem)};
  }

  async addItem(listId: string, title: string, unitPriceMinor?: number | null) {
    const trimmed = title.trim();
    if (!trimmed) throw new Error('Item title is required.');
    const now = new Date().toISOString();
    await database.transaction(async tx => {
      const result = await tx.execute(`SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM shopping_items WHERE list_id = ?;`, [listId]);
      const position = Number((result.rows[0] as {next_position?: number} | undefined)?.next_position ?? 1);
      await tx.execute(
        `INSERT INTO shopping_items(id, list_id, title, quantity, unit_price_minor, checked, position, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, 0, ?, ?, ?);`,
        [createId('shopping_item'), listId, trimmed, unitPriceMinor ?? null, position, now, now],
      );
    });
    return this.loadSnapshot();
  }

  async toggleItem(id: string) {
    await database.transaction(async tx => {
      await tx.execute(`UPDATE shopping_items SET checked = CASE checked WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?;`, [new Date().toISOString(), id]);
    });
    return this.loadSnapshot();
  }

  async removeItem(id: string) {
    await database.transaction(async tx => {
      await tx.execute(`DELETE FROM shopping_items WHERE id = ?;`, [id]);
    });
    return this.loadSnapshot();
  }

  async checkout(listId: string, accountId: string, categoryId: string) {
    const now = new Date().toISOString();
    let totalMinor = 0;
    await database.transaction(async tx => {
      const itemResult = await tx.execute(
        `SELECT quantity, unit_price_minor FROM shopping_items WHERE list_id = ? AND checked = 1 AND unit_price_minor IS NOT NULL;`,
        [listId],
      );
      totalMinor = (itemResult.rows as unknown as Array<{quantity: number; unit_price_minor: number}>).reduce(
        (sum, row) => sum + Math.round(Number(row.quantity) * Number(row.unit_price_minor)), 0,
      );
      if (totalMinor <= 0) throw new Error('Check at least one priced item before checkout.');
      await tx.execute(
        `INSERT INTO transactions(id, account_id, category_id, kind, amount_minor, merchant, notes, occurred_at, source, shopping_list_id, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, 'expense', ?, 'Shopping', ?, ?, 'shopping', ?, ?, ?, NULL);`,
        [createId('txn'), accountId, categoryId, totalMinor, 'Created from Shopping Mode', now, listId, now, now],
      );
      const listResult = await tx.execute(`SELECT name, budget_minor, currency FROM shopping_lists WHERE id = ? LIMIT 1;`, [listId]);
      const currentList = listResult.rows[0] as {name?: string; budget_minor?: number | null; currency?: string} | undefined;
      await tx.execute(`UPDATE shopping_lists SET status = 'completed', updated_at = ? WHERE id = ?;`, [now, listId]);
      await tx.execute(
        `INSERT INTO shopping_lists(id, name, budget_minor, currency, status, created_at, updated_at)
         VALUES (?, ?, ?, 'AED', 'active', ?, ?);`,
        [createId('shopping_list'), currentList?.name ?? 'Shopping list', currentList?.budget_minor ?? null, now, now],
      );
    });
    return {shopping: await this.loadSnapshot(), totalMinor};
  }
}

export const shoppingRepository: ShoppingRepository = new SQLiteShoppingRepository();
