import React, {useMemo, useState} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../app/hooks';
import {saveBudget} from '../features/money/moneySlice';
import {selectCategorySpend} from '../features/money/selectors';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import type {RootStackParamList} from '../types/navigation';
import {formatMoney, monthKeyFor, parseMoneyToMinor} from '../utils/money';

type Props = NativeStackScreenProps<RootStackParamList, 'Budgets'>;

export function BudgetScreen({navigation}: Props) {
  const dispatch = useAppDispatch();
  const rows = useAppSelector(selectCategorySpend);
  const categories = useAppSelector(state => state.money.categories.filter(item => item.kind === 'expense'));
  const currentBudgets = useAppSelector(state => state.money.budgets.filter(item => item.monthKey === monthKeyFor()));
  const [editingCategoryId, setEditingCategoryId] = useState(categories[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const totalLimit = currentBudgets.reduce((sum, item) => sum + item.limitMinor, 0);
  const totalSpent = useMemo(() => rows.reduce((sum, item) => sum + item.spentMinor, 0), [rows]);

  const save = async () => {
    const minor = parseMoneyToMinor(amount);
    if (minor === null || !editingCategoryId) return Alert.alert('Invalid budget', 'Choose a category and enter a valid amount.');
    await dispatch(saveBudget({categoryId: editingCategoryId, monthKey: monthKeyFor(), limitMinor: minor})).unwrap();
    setAmount('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><View><Text style={styles.eyebrow}>MONTHLY PLAN</Text><Text style={styles.title}>Budgets</Text></View><Pressable onPress={() => navigation.goBack()}><Text style={styles.close}>Close</Text></Pressable></View>
        <View style={styles.summary}><View><Text style={styles.muted}>Budgeted</Text><Text style={styles.summaryValue}>{formatMoney(totalLimit)}</Text></View><View><Text style={styles.muted}>Tracked spend</Text><Text style={styles.summaryValue}>{formatMoney(totalSpent)}</Text></View></View>

        <View style={styles.editor}>
          <Text style={styles.sectionTitle}>Set category budget</Text>
          <View style={styles.categoryWrap}>{categories.map(category => <Pressable key={category.id} onPress={() => setEditingCategoryId(category.id)} style={[styles.category, editingCategoryId === category.id && styles.categoryActive]}><Text>{category.icon}</Text><Text style={[styles.categoryText, editingCategoryId === category.id && styles.categoryTextActive]}>{category.name}</Text></Pressable>)}</View>
          <View style={styles.inputRow}><TextInput value={amount} onChangeText={setAmount} placeholder="e.g. 800" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={styles.input} /><Pressable onPress={() => void save()} style={styles.save}><Text style={styles.saveText}>Save</Text></Pressable></View>
        </View>

        <View style={styles.list}>
          <Text style={styles.sectionTitle}>This month</Text>
          {rows.map(row => {
            const percentage = row.budgetMinor ? Math.round((row.spentMinor / row.budgetMinor) * 100) : 0;
            const over = row.budgetMinor !== null && row.spentMinor > row.budgetMinor;
            return <View style={styles.row} key={row.category.id}><View style={styles.rowTop}><Text style={styles.rowTitle}>{row.category.icon} {row.category.name}</Text><Text style={over ? styles.over : styles.muted}>{row.budgetMinor !== null ? `${percentage}%` : 'No budget'}</Text></View><Text style={styles.amount}>{formatMoney(row.spentMinor)}{row.budgetMinor !== null ? ` of ${formatMoney(row.budgetMinor)}` : ''}</Text>{row.budgetMinor !== null ? <View style={styles.track}><View style={[styles.fill, over && styles.overFill, {width: `${Math.min(100, percentage)}%` as `${number}%`}]} /></View> : null}</View>;
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background}, content: {padding: spacing.md, gap: spacing.md, paddingBottom: 70}, header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}, eyebrow: {color: colors.shopping, fontSize: 10, fontWeight: '900', letterSpacing: 1.3}, title: {color: colors.text, fontSize: 27, fontWeight: '900', marginTop: 4}, close: {color: colors.accent, fontWeight: '800'}, muted: {color: colors.textMuted, fontSize: 12},
  summary: {flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.md, gap: 20}, summaryValue: {color: colors.text, fontWeight: '900', fontSize: 18, marginTop: 4}, editor: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.md, gap: 12}, sectionTitle: {color: colors.text, fontSize: 16, fontWeight: '900'}, categoryWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8}, category: {flexDirection: 'row', gap: 5, borderRadius: 12, borderWidth: 1, borderColor: colors.border, minHeight: 40, paddingHorizontal: 10, alignItems: 'center'}, categoryActive: {borderColor: colors.shopping, backgroundColor: colors.shoppingSoft}, categoryText: {color: colors.textMuted, fontSize: 11, fontWeight: '700'}, categoryTextActive: {color: colors.text}, inputRow: {flexDirection: 'row', gap: 8}, input: {flex: 1, minHeight: 48, backgroundColor: colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 12, color: colors.text}, save: {minWidth: 80, borderRadius: 12, backgroundColor: colors.shopping, alignItems: 'center', justifyContent: 'center'}, saveText: {color: colors.background, fontWeight: '900'},
  list: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.md, gap: 16}, row: {gap: 7}, rowTop: {flexDirection: 'row', justifyContent: 'space-between'}, rowTitle: {color: colors.text, fontWeight: '800'}, amount: {color: colors.textMuted, fontSize: 12}, over: {color: colors.danger, fontWeight: '900', fontSize: 12}, track: {height: 7, borderRadius: 99, backgroundColor: colors.surfaceElevated, overflow: 'hidden'}, fill: {height: '100%', backgroundColor: colors.shopping}, overFill: {backgroundColor: colors.danger},
});
