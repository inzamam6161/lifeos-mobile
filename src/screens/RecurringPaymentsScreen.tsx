import React, {useState} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../app/hooks';
import {addRecurringPayment, setRecurringActive} from '../features/money/moneySlice';
import type {RecurringFrequency, RecurringPaymentType} from '../features/money/types';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import type {RootStackParamList} from '../types/navigation';
import {formatMoney, parseMoneyToMinor} from '../utils/money';

type Props = NativeStackScreenProps<RootStackParamList, 'RecurringPayments'>;

export function RecurringPaymentsScreen({navigation}: Props) {
  const dispatch = useAppDispatch();
  const items = useAppSelector(state => state.money.recurringPayments);
  const accounts = useAppSelector(state => state.money.accounts);
  const categories = useAppSelector(state => state.money.categories.filter(item => item.kind === 'expense'));
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 'cat_home');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [paymentType, setPaymentType] = useState<RecurringPaymentType>('bill');
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 7);
  const [dueDate, setDueDate] = useState(`${defaultDue.getFullYear()}-${String(defaultDue.getMonth() + 1).padStart(2, '0')}-${String(defaultDue.getDate()).padStart(2, '0')}`);

  const save = async () => {
    const amountMinor = parseMoneyToMinor(amount);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate.trim());
    if (!title.trim() || !amountMinor || !accounts[0]) return Alert.alert('Missing details', 'Add a title and valid amount.');
    if (!match) return Alert.alert('Invalid due date', 'Use YYYY-MM-DD.');
    const nextDue = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 9, 0, 0, 0);
    if (!Number.isFinite(nextDue.getTime()) || nextDue.getFullYear() !== Number(match[1]) || nextDue.getMonth() !== Number(match[2]) - 1 || nextDue.getDate() !== Number(match[3])) return Alert.alert('Invalid due date', 'Enter a real calendar date.');
    await dispatch(addRecurringPayment({title, amountMinor, accountId: accounts[0].id, categoryId, frequency, paymentType, nextDueAt: nextDue.toISOString()})).unwrap();
    setTitle(''); setAmount('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><View><Text style={styles.eyebrow}>OBLIGATIONS</Text><Text style={styles.title}>Bills & subscriptions</Text></View><Pressable onPress={() => navigation.goBack()}><Text style={styles.close}>Close</Text></Pressable></View>
        <View style={styles.editor}>
          <Text style={styles.sectionTitle}>Add recurring payment</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Internet, gym, streaming…" placeholderTextColor={colors.textMuted} style={styles.input} />
          <TextInput value={amount} onChangeText={setAmount} placeholder="Amount in AED" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={styles.input} />
          <View style={styles.chips}>{(['bill', 'subscription'] as const).map(value => <Pressable key={value} onPress={() => setPaymentType(value)} style={[styles.chip, paymentType === value && styles.chipActive]}><Text style={styles.chipText}>{value}</Text></Pressable>)}</View>
          <View style={styles.chips}>{(['weekly', 'monthly', 'yearly'] as const).map(value => <Pressable key={value} onPress={() => setFrequency(value)} style={[styles.chip, frequency === value && styles.chipActive]}><Text style={styles.chipText}>{value}</Text></Pressable>)}</View>
          <TextInput value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.input} />
          <View style={styles.chips}>{categories.slice(0, 7).map(category => <Pressable key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.chip, categoryId === category.id && styles.chipActive]}><Text style={styles.chipText}>{category.icon} {category.name}</Text></Pressable>)}</View>
          <Text style={styles.muted}>Due dates are stored as real local calendar dates; LifeOS uses them for the upcoming-obligations calculation.</Text>
          <Pressable onPress={() => void save()} style={styles.save}><Text style={styles.saveText}>Add recurring payment</Text></Pressable>
        </View>
        <View style={styles.list}><Text style={styles.sectionTitle}>Tracked obligations</Text>{items.map(item => <View key={item.id} style={styles.row}><View style={styles.rowText}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.muted}>{item.paymentType} · {item.frequency} · due {new Date(item.nextDueAt).toLocaleDateString()}</Text></View><View style={styles.right}><Text style={styles.amount}>{formatMoney(item.amountMinor)}</Text><Pressable onPress={() => void dispatch(setRecurringActive({id: item.id, active: !item.active}))}><Text style={item.active ? styles.active : styles.paused}>{item.active ? 'ACTIVE' : 'PAUSED'}</Text></Pressable></View></View>)}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background}, content: {padding: spacing.md, gap: spacing.md, paddingBottom: 70}, header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12}, eyebrow: {color: colors.shopping, fontSize: 10, fontWeight: '900', letterSpacing: 1.3}, title: {color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 4}, close: {color: colors.accent, fontWeight: '800'}, editor: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.md, gap: 10}, sectionTitle: {color: colors.text, fontSize: 16, fontWeight: '900'}, input: {minHeight: 48, backgroundColor: colors.surfaceElevated, borderRadius: 12, color: colors.text, paddingHorizontal: 12}, chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 7}, chip: {minHeight: 38, borderRadius: 11, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, justifyContent: 'center'}, chipActive: {backgroundColor: colors.shoppingSoft, borderColor: colors.shopping}, chipText: {color: colors.text, fontSize: 11, fontWeight: '700'}, muted: {color: colors.textMuted, fontSize: 11, lineHeight: 16}, save: {minHeight: 50, borderRadius: 14, backgroundColor: colors.shopping, justifyContent: 'center', alignItems: 'center'}, saveText: {color: colors.background, fontWeight: '900'}, list: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.md, gap: 14}, row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10}, rowText: {flex: 1, gap: 3}, rowTitle: {color: colors.text, fontWeight: '800'}, right: {alignItems: 'flex-end', gap: 5}, amount: {color: colors.text, fontWeight: '900'}, active: {color: colors.success, fontSize: 9, fontWeight: '900'}, paused: {color: colors.textMuted, fontSize: 9, fontWeight: '900'},
});
