import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppSelector} from '../app/hooks';
import {selectCategorySpend, selectMoneySummary} from '../features/money/selectors';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import type {RootStackParamList} from '../types/navigation';
import {formatMoney} from '../utils/money';

type Props = NativeStackScreenProps<RootStackParamList, 'Money'>;

export function MoneyScreen({navigation}: Props) {
  const summary = useAppSelector(selectMoneySummary);
  const categorySpend = useAppSelector(selectCategorySpend);
  const transactions = useAppSelector(state => state.money.transactions.slice(0, 8));
  const categories = useAppSelector(state => state.money.categories);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>MONEY</Text><Text style={styles.title}>Financial Command Center</Text></View>
          <Pressable onPress={() => navigation.goBack()} style={styles.secondaryButton}><Text style={styles.secondaryText}>Close</Text></Pressable>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.muted}>Current balance</Text>
          <Text style={styles.balance}>{formatMoney(summary.balanceMinor)}</Text>
          <View style={styles.balanceRow}>
            <View><Text style={styles.smallLabel}>This month in</Text><Text style={styles.positive}>{formatMoney(summary.incomeMinor)}</Text></View>
            <View><Text style={styles.smallLabel}>This month out</Text><Text style={styles.negative}>{formatMoney(summary.expenseMinor)}</Text></View>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.statCard}><Text style={styles.smallLabel}>SAFE TO SPEND</Text><Text style={styles.statValue}>{formatMoney(summary.safeToSpendMinor)}</Text><Text style={styles.muted}>After next 30-day obligations</Text></View>
          <View style={styles.statCard}><Text style={styles.smallLabel}>UPCOMING</Text><Text style={styles.statValue}>{formatMoney(summary.upcomingObligationsMinor)}</Text><Text style={styles.muted}>Bills & subscriptions</Text></View>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('TransactionEditor', {})}><Text style={styles.primaryText}>＋ Add transaction</Text></Pressable>
          <Pressable style={styles.secondaryAction} onPress={() => navigation.navigate('Budgets')}><Text style={styles.secondaryActionText}>Budgets</Text></Pressable>
          <Pressable style={styles.secondaryAction} onPress={() => navigation.navigate('RecurringPayments')}><Text style={styles.secondaryActionText}>Bills</Text></Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Budget health</Text><Text style={styles.muted}>{summary.monthKey}</Text></View>
          {categorySpend.length ? categorySpend.map(row => {
            const ratio = row.budgetMinor ? Math.min(1, row.spentMinor / row.budgetMinor) : 0;
            return (
              <View key={row.category.id} style={styles.budgetRow}>
                <View style={styles.rowBetween}><Text style={styles.rowTitle}>{row.category.icon} {row.category.name}</Text><Text style={styles.muted}>{formatMoney(row.spentMinor)}{row.budgetMinor !== null ? ` / ${formatMoney(row.budgetMinor)}` : ''}</Text></View>
                {row.budgetMinor !== null ? <View style={styles.track}><View style={[styles.fill, {width: `${Math.round(ratio * 100)}%` as `${number}%`}]} /></View> : null}
              </View>
            );
          }) : <Text style={styles.muted}>No budget activity yet.</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          {transactions.map(item => {
            const category = categories.find(value => value.id === item.categoryId);
            const signed = item.kind === 'expense' ? -item.amountMinor : item.amountMinor;
            return (
              <View style={styles.transactionRow} key={item.id}>
                <View style={styles.transactionIcon}><Text>{category?.icon ?? '◎'}</Text></View>
                <View style={styles.transactionText}><Text style={styles.rowTitle}>{item.merchant || category?.name || 'Transaction'}</Text><Text style={styles.muted}>{category?.name} · {new Date(item.occurredAt).toLocaleDateString()}</Text></View>
                <Text style={item.kind === 'expense' ? styles.negative : styles.positive}>{formatMoney(signed)}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background}, content: {padding: spacing.md, paddingBottom: 80, gap: spacing.md},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12}, eyebrow: {color: colors.shopping, fontWeight: '900', fontSize: 11, letterSpacing: 1.5}, title: {color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 4},
  secondaryButton: {paddingHorizontal: 14, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, justifyContent: 'center'}, secondaryText: {color: colors.text, fontWeight: '800'},
  balanceCard: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: spacing.lg, gap: 10}, muted: {color: colors.textMuted, fontSize: 12}, balance: {color: colors.text, fontSize: 34, fontWeight: '900'}, balanceRow: {flexDirection: 'row', justifyContent: 'space-between', gap: 20, marginTop: 8}, smallLabel: {color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: .8}, positive: {color: colors.success, fontWeight: '900', marginTop: 4}, negative: {color: colors.danger, fontWeight: '900', marginTop: 4},
  grid: {flexDirection: 'row', gap: spacing.sm}, statCard: {flex: 1, minHeight: 120, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: spacing.md, justifyContent: 'space-between'}, statValue: {color: colors.text, fontSize: 19, fontWeight: '900'},
  actionRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}, primaryButton: {backgroundColor: colors.shopping, minHeight: 48, borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center'}, primaryText: {color: colors.background, fontWeight: '900'}, secondaryAction: {minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, justifyContent: 'center'}, secondaryActionText: {color: colors.text, fontWeight: '800'},
  section: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: spacing.md, gap: 14}, sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}, sectionTitle: {color: colors.text, fontWeight: '900', fontSize: 17}, budgetRow: {gap: 8}, rowBetween: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12}, rowTitle: {color: colors.text, fontWeight: '700'}, track: {height: 7, backgroundColor: colors.surfaceElevated, borderRadius: 99, overflow: 'hidden'}, fill: {height: '100%', backgroundColor: colors.shopping, borderRadius: 99},
  transactionRow: {flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58}, transactionIcon: {width: 38, height: 38, borderRadius: 13, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center'}, transactionText: {flex: 1, gap: 3},
});
