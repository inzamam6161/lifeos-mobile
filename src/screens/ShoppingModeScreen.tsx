import React, {useMemo, useState} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../app/hooks';
import {replaceMoneySnapshot} from '../features/money/moneySlice';
import {addShoppingItem, checkoutShopping, clearCheckoutNotice, removeShoppingItem, toggleShoppingItem} from '../features/shopping/shoppingSlice';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import type {RootStackParamList} from '../types/navigation';
import {formatMoney, parseMoneyToMinor} from '../utils/money';

type Props = NativeStackScreenProps<RootStackParamList, 'ShoppingMode'>;

export function ShoppingModeScreen({navigation}: Props) {
  const dispatch = useAppDispatch();
  const lists = useAppSelector(state => state.shopping.lists);
  const items = useAppSelector(state => state.shopping.items);
  const checkoutNotice = useAppSelector(state => state.shopping.lastCheckoutMinor);
  const accounts = useAppSelector(state => state.money.accounts);
  const categories = useAppSelector(state => state.money.categories);
  const list = lists.find(item => item.status === 'active');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const listItems = useMemo(() => items.filter(item => item.listId === list?.id), [items, list?.id]);
  const estimatedMinor = listItems.reduce((sum, item) => sum + Math.round((item.unitPriceMinor ?? 0) * item.quantity), 0);
  const checkedMinor = listItems.filter(item => item.checked).reduce((sum, item) => sum + Math.round((item.unitPriceMinor ?? 0) * item.quantity), 0);
  const checkedCount = listItems.filter(item => item.checked).length;

  const add = async () => {
    if (!list) return;
    const priceMinor = price.trim() ? parseMoneyToMinor(price) : null;
    if (price.trim() && priceMinor === null) return Alert.alert('Invalid price', 'Use an amount such as 12.50.');
    try {
      await dispatch(addShoppingItem({listId: list.id, title, unitPriceMinor: priceMinor})).unwrap();
      setTitle(''); setPrice('');
    } catch (error) { Alert.alert('Could not add item', error instanceof Error ? error.message : 'Unknown error'); }
  };

  const checkout = async () => {
    if (!list || !accounts[0]) return;
    const grocery = categories.find(item => item.id === 'cat_groceries') ?? categories.find(item => item.kind === 'expense');
    if (!grocery) return;
    try {
      const result = await dispatch(checkoutShopping({listId: list.id, accountId: accounts[0].id, categoryId: grocery.id})).unwrap();
      dispatch(replaceMoneySnapshot(result.money));
    } catch (error) { Alert.alert('Checkout failed', error instanceof Error ? error.message : 'Unknown error'); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><View><Text style={styles.eyebrow}>🛒 SHOPPING MODE</Text><Text style={styles.title}>{list?.name ?? 'Shopping'}</Text></View><Pressable onPress={() => navigation.goBack()} style={styles.exit}><Text style={styles.exitText}>Exit</Text></Pressable></View>
        {checkoutNotice !== null ? <Pressable onPress={() => dispatch(clearCheckoutNotice())} style={styles.success}><Text style={styles.successTitle}>Expense recorded · {formatMoney(checkoutNotice)}</Text><Text style={styles.successText}>A fresh shopping list is ready. Tap to dismiss.</Text></Pressable> : null}
        <View style={styles.hero}><View><Text style={styles.muted}>Estimated list</Text><Text style={styles.heroValue}>{formatMoney(estimatedMinor)}</Text></View><View style={styles.heroRight}><Text style={styles.muted}>Budget</Text><Text style={styles.heroBudget}>{list?.budgetMinor != null ? formatMoney(list.budgetMinor) : 'Not set'}</Text></View></View>
        <View style={styles.progress}><View style={[styles.progressFill, {width: `${listItems.length ? Math.round((checkedCount / listItems.length) * 100) : 0}%` as `${number}%`}]} /></View>
        <Text style={styles.muted}>{checkedCount} of {listItems.length} picked · checkout total {formatMoney(checkedMinor)}</Text>

        <View style={styles.addCard}><TextInput value={title} onChangeText={setTitle} placeholder="Add item" placeholderTextColor={colors.textMuted} style={[styles.input, styles.flex]} /><TextInput value={price} onChangeText={setPrice} placeholder="AED" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={styles.priceInput} /><Pressable onPress={() => void add()} style={styles.addButton}><Text style={styles.addButtonText}>＋</Text></Pressable></View>

        <View style={styles.list}>
          {listItems.length ? listItems.map(item => <View style={styles.row} key={item.id}><Pressable onPress={() => void dispatch(toggleShoppingItem(item.id))} style={[styles.check, item.checked && styles.checkActive]}><Text style={styles.checkText}>{item.checked ? '✓' : ''}</Text></Pressable><View style={styles.rowText}><Text style={[styles.rowTitle, item.checked && styles.checkedTitle]}>{item.title}</Text><Text style={styles.muted}>{item.unitPriceMinor == null ? 'Price not set' : formatMoney(item.unitPriceMinor)} · qty {item.quantity}</Text></View><Pressable onPress={() => void dispatch(removeShoppingItem(item.id))} style={styles.remove}><Text style={styles.removeText}>×</Text></Pressable></View>) : <Text style={styles.muted}>Your active list is empty.</Text>}
        </View>

        <Pressable onPress={() => void checkout()} disabled={checkedMinor <= 0} style={[styles.checkout, checkedMinor <= 0 && styles.disabled]}><Text style={styles.checkoutText}>Checkout & record {formatMoney(checkedMinor)}</Text></Pressable>
        <Pressable onPress={() => navigation.navigate('Money')}><Text style={styles.moneyLink}>View Money Command Center →</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background}, content: {padding: spacing.md, gap: spacing.md, paddingBottom: 70}, header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}, eyebrow: {color: colors.shopping, fontWeight: '900', fontSize: 11, letterSpacing: 1.2}, title: {color: colors.text, fontSize: 27, fontWeight: '900', marginTop: 4}, exit: {minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, justifyContent: 'center'}, exitText: {color: colors.text, fontWeight: '800'},
  success: {backgroundColor: colors.gymSoft, borderWidth: 1, borderColor: colors.success, borderRadius: 16, padding: 14, gap: 3}, successTitle: {color: colors.success, fontWeight: '900'}, successText: {color: colors.textMuted, fontSize: 11}, hero: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', backgroundColor: colors.shoppingSoft, borderWidth: 1, borderColor: colors.shopping, borderRadius: 22, padding: spacing.lg}, heroValue: {color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 4}, heroRight: {alignItems: 'flex-end'}, heroBudget: {color: colors.shopping, fontWeight: '900', marginTop: 5}, muted: {color: colors.textMuted, fontSize: 11},
  progress: {height: 7, borderRadius: 99, backgroundColor: colors.surfaceElevated, overflow: 'hidden'}, progressFill: {height: '100%', backgroundColor: colors.shopping}, addCard: {flexDirection: 'row', gap: 8}, flex: {flex: 1}, input: {minHeight: 48, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, color: colors.text}, priceInput: {width: 88, minHeight: 48, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, color: colors.text}, addButton: {width: 48, height: 48, borderRadius: 13, backgroundColor: colors.shopping, alignItems: 'center', justifyContent: 'center'}, addButtonText: {color: colors.background, fontSize: 24, fontWeight: '900'},
  list: {backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 4}, row: {minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border}, check: {width: 30, height: 30, borderRadius: 9, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center'}, checkActive: {backgroundColor: colors.shopping, borderColor: colors.shopping}, checkText: {color: colors.background, fontWeight: '900'}, rowText: {flex: 1, gap: 3}, rowTitle: {color: colors.text, fontWeight: '800'}, checkedTitle: {textDecorationLine: 'line-through', color: colors.textMuted}, remove: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'}, removeText: {color: colors.danger, fontSize: 22}, checkout: {minHeight: 54, borderRadius: 16, backgroundColor: colors.shopping, alignItems: 'center', justifyContent: 'center'}, checkoutText: {color: colors.background, fontWeight: '900'}, disabled: {opacity: .4}, moneyLink: {color: colors.shopping, textAlign: 'center', fontWeight: '800'},
});
