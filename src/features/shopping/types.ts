export type ShoppingList = {
  id: string;
  name: string;
  budgetMinor: number | null;
  currency: 'AED';
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
};

export type ShoppingItem = {
  id: string;
  listId: string;
  title: string;
  quantity: number;
  unitPriceMinor: number | null;
  checked: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type ShoppingSnapshot = {
  lists: ShoppingList[];
  items: ShoppingItem[];
};
