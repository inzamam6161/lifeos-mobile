import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';
import {moneyRepository} from '../../data/repositories/moneyRepository';
import type {
  CreateRecurringPaymentInput,
  CreateTransactionInput,
  MoneySnapshot,
  SetBudgetInput,
} from './types';

const initialSnapshot: MoneySnapshot = {
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  recurringPayments: [],
};

type MoneyState = MoneySnapshot & {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
};

const initialState: MoneyState = {
  ...initialSnapshot,
  status: 'idle',
  error: null,
};

export const loadMoney = createAsyncThunk('money/load', async () => moneyRepository.loadSnapshot());
export const addTransaction = createAsyncThunk('money/addTransaction', async (input: CreateTransactionInput) => moneyRepository.createTransaction(input));
export const removeTransaction = createAsyncThunk('money/removeTransaction', async (id: string) => moneyRepository.deleteTransaction(id));
export const saveBudget = createAsyncThunk('money/saveBudget', async (input: SetBudgetInput) => moneyRepository.setBudget(input));
export const addRecurringPayment = createAsyncThunk('money/addRecurring', async (input: CreateRecurringPaymentInput) => moneyRepository.createRecurringPayment(input));
export const setRecurringActive = createAsyncThunk('money/setRecurringActive', async ({id, active}: {id: string; active: boolean}) => moneyRepository.toggleRecurringPayment(id, active));

const moneySlice = createSlice({
  name: 'money',
  initialState,
  reducers: {
    replaceMoneySnapshot(state, action: PayloadAction<MoneySnapshot>) {
      Object.assign(state, action.payload);
      state.status = 'ready';
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadMoney.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadMoney.fulfilled, (state, action) => {
        Object.assign(state, action.payload);
        state.status = 'ready';
      })
      .addCase(loadMoney.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? 'Unable to load money data.';
      });

    const replace = (state: MoneyState, action: PayloadAction<MoneySnapshot>) => {
      Object.assign(state, action.payload);
      state.status = 'ready';
      state.error = null;
    };
    builder
      .addCase(addTransaction.fulfilled, replace)
      .addCase(removeTransaction.fulfilled, replace)
      .addCase(saveBudget.fulfilled, replace)
      .addCase(addRecurringPayment.fulfilled, replace)
      .addCase(setRecurringActive.fulfilled, replace);
  },
});

export const {replaceMoneySnapshot} = moneySlice.actions;
export const moneyReducer = moneySlice.reducer;
