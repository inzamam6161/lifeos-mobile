import React, {useMemo, useState} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../app/hooks';
import {addTransaction} from '../features/money/moneySlice';
import type {TransactionKind} from '../features/money/types';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import type {RootStackParamList} from '../types/navigation';
import {parseMoneyToMinor} from '../utils/money';

type Props = NativeStackScreenProps<RootStackParamList, 'TransactionEditor'>;

export function TransactionEditorScreen({navigation}: Props) {
  const dispatch = useAppDispatch();
  const accounts = useAppSelector(state => state.money.accounts);
  const categories = useAppSelector(state => state.money.categories);
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const visibleCategories = useMemo(() => categories.filter(item => item.kind === kind), [categories, kind]);
  const [categoryId, setCategoryId] = useState('cat_food');

  const switchKind = (next: TransactionKind) => {
    setKind(next);
    const first = categories.find(item => item.kind === next);
    if (first) setCategoryId(first.id);
  };

  const save = async () => {
    const amountMinor = parseMoneyToMinor(amount);
    if (!amountMinor) return Alert.alert('Invalid amount', 'Enter an amount such as 38.50.');
    if (!accounts[0]) return Alert.alert('No account', 'LifeOS needs an account before recording transactions.');
    try {
      await dispatch(addTransaction({accountId: accounts[0].id, categoryId, kind, amountMinor, merchant, notes})).unwrap();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><Text style={styles.title}>Add transaction</Text><Pressable onPress={() => navigation.goBack()}><Text style={styles.cancel}>Cancel</Text></Pressable></View>
        <View style={styles.segment}>{(['expense', 'income'] as const).map(value => <Pressable key={value} onPress={() => switchKind(value)} style={[styles.segmentItem, kind === value && styles.segmentActive]}><Text style={[styles.segmentText, kind === value && styles.segmentTextActive]}>{value === 'expense' ? 'Expense' : 'Income'}</Text></Pressable>)}</View>
        <View style={styles.amountWrap}><Text style={styles.currency}>AED</Text><TextInput value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={styles.amountInput} /></View>
        <TextInput value={merchant} onChangeText={setMerchant} placeholder={kind === 'expense' ? 'Merchant / payee' : 'Source'} placeholderTextColor={colors.textMuted} style={styles.input} />
        <Text style={styles.label}>Category</Text>
        <View style={styles.categories}>{visibleCategories.map(category => <Pressable key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.category, categoryId === category.id && styles.categoryActive]}><Text style={styles.categoryEmoji}>{category.icon}</Text><Text style={[styles.categoryText, categoryId === category.id && styles.categoryTextActive]}>{category.name}</Text></Pressable>)}</View>
        <TextInput value={notes} onChangeText={setNotes} placeholder="Notes (optional)" placeholderTextColor={colors.textMuted} multiline style={[styles.input, styles.notes]} />
        <Pressable onPress={() => void save()} style={styles.save}><Text style={styles.saveText}>Save {kind}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background}, content: {padding: spacing.md, gap: spacing.md, paddingBottom: 60}, header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}, title: {color: colors.text, fontSize: 26, fontWeight: '900'}, cancel: {color: colors.accent, fontWeight: '800'},
  segment: {flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 4}, segmentItem: {flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center'}, segmentActive: {backgroundColor: colors.surfaceElevated}, segmentText: {color: colors.textMuted, fontWeight: '800'}, segmentTextActive: {color: colors.text},
  amountWrap: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 18}, currency: {color: colors.shopping, fontWeight: '900', fontSize: 18}, amountInput: {flex: 1, minHeight: 82, color: colors.text, fontSize: 36, fontWeight: '900', paddingHorizontal: 12}, input: {minHeight: 52, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, color: colors.text, fontSize: 16}, notes: {minHeight: 100, paddingTop: 14, textAlignVertical: 'top'}, label: {color: colors.text, fontWeight: '800'}, categories: {flexDirection: 'row', flexWrap: 'wrap', gap: 8}, category: {flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 11}, categoryActive: {backgroundColor: colors.shoppingSoft, borderColor: colors.shopping}, categoryEmoji: {fontSize: 15}, categoryText: {color: colors.textMuted, fontSize: 12, fontWeight: '700'}, categoryTextActive: {color: colors.text}, save: {minHeight: 54, borderRadius: 16, backgroundColor: colors.shopping, alignItems: 'center', justifyContent: 'center'}, saveText: {color: colors.background, fontWeight: '900', fontSize: 15},
});
