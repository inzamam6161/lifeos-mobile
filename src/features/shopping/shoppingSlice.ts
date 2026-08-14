import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';
import {shoppingRepository} from '../../data/repositories/shoppingRepository';
import type {ShoppingSnapshot} from './types';
import {moneyRepository} from '../../data/repositories/moneyRepository';

const initialSnapshot: ShoppingSnapshot = {lists: [], items: []};
type ShoppingState = ShoppingSnapshot & {status: 'idle' | 'loading' | 'ready' | 'error'; error: string | null; lastCheckoutMinor: number | null};
const initialState: ShoppingState = {...initialSnapshot, status: 'idle', error: null, lastCheckoutMinor: null};

export const loadShopping = createAsyncThunk('shopping/load', async () => shoppingRepository.loadSnapshot());
export const addShoppingItem = createAsyncThunk('shopping/addItem', async ({listId, title, unitPriceMinor}: {listId: string; title: string; unitPriceMinor?: number | null}) => shoppingRepository.addItem(listId, title, unitPriceMinor));
export const toggleShoppingItem = createAsyncThunk('shopping/toggleItem', async (id: string) => shoppingRepository.toggleItem(id));
export const removeShoppingItem = createAsyncThunk('shopping/removeItem', async (id: string) => shoppingRepository.removeItem(id));
export const checkoutShopping = createAsyncThunk('shopping/checkout', async ({listId, accountId, categoryId}: {listId: string; accountId: string; categoryId: string}) => {
  const result = await shoppingRepository.checkout(listId, accountId, categoryId);
  const money = await moneyRepository.loadSnapshot();
  return {...result, money};
});

const shoppingSlice = createSlice({
  name: 'shopping',
  initialState,
  reducers: {
    clearCheckoutNotice(state) { state.lastCheckoutMinor = null; },
    replaceShoppingSnapshot(state, action: PayloadAction<ShoppingSnapshot>) {
      Object.assign(state, action.payload);
      state.status = 'ready';
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadShopping.pending, state => { state.status = 'loading'; state.error = null; })
      .addCase(loadShopping.fulfilled, (state, action) => { Object.assign(state, action.payload); state.status = 'ready'; })
      .addCase(loadShopping.rejected, (state, action) => { state.status = 'error'; state.error = action.error.message ?? 'Unable to load shopping.'; });
    const replace = (state: ShoppingState, action: PayloadAction<ShoppingSnapshot>) => { Object.assign(state, action.payload); state.status = 'ready'; };
    builder.addCase(addShoppingItem.fulfilled, replace).addCase(toggleShoppingItem.fulfilled, replace).addCase(removeShoppingItem.fulfilled, replace);
    builder.addCase(checkoutShopping.fulfilled, (state, action) => {
      Object.assign(state, action.payload.shopping);
      state.lastCheckoutMinor = action.payload.totalMinor;
      state.status = 'ready';
    });
  },
});

export const {clearCheckoutNotice, replaceShoppingSnapshot} = shoppingSlice.actions;
export const shoppingReducer = shoppingSlice.reducer;
