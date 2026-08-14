import type {ShoppingSnapshot} from '../../features/shopping/types';

export interface ShoppingRepository {
  loadSnapshot(): Promise<ShoppingSnapshot>;
  addItem(listId: string, title: string, unitPriceMinor?: number | null): Promise<ShoppingSnapshot>;
  toggleItem(id: string): Promise<ShoppingSnapshot>;
  removeItem(id: string): Promise<ShoppingSnapshot>;
  checkout(listId: string, accountId: string, categoryId: string): Promise<{shopping: ShoppingSnapshot; totalMinor: number}>;
}
