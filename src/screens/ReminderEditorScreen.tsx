import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppDispatch} from '../app/hooks';
import {addReminder} from '../features/reminders/remindersSlice';
import type {ReminderRepeat} from '../features/reminders/types';
import type {TaskContext} from '../features/tasks/types';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import type {RootStackParamList} from '../types/navigation';
import {schedulePreset, type SchedulePreset} from '../utils/dateTime';

function toLocalParts(iso: string) {
  const date = new Date(iso);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return {date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}`};
}

function parseLocal(dateValue: string, timeValue: string) {
  const matchDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  const matchTime = /^(\d{1,2}):(\d{2})$/.exec(timeValue.trim());
  if (!matchDate || !matchTime) return null;
  const hour = Number(matchTime[1]);
  const minute = Number(matchTime[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const value = new Date(Number(matchDate[1]), Number(matchDate[2]) - 1, Number(matchDate[3]), hour, minute, 0, 0);
  if (Number.isNaN(value.getTime())) return null;
  if (value.getFullYear() !== Number(matchDate[1]) || value.getMonth() !== Number(matchDate[2]) - 1 || value.getDate() !== Number(matchDate[3]) || value.getHours() !== hour || value.getMinutes() !== minute) return null;
  return value;
}

export function ReminderEditorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ReminderEditor'>>();
  const dispatch = useAppDispatch();
  const initialIso = useMemo(() => schedulePreset('in1h'), []);
  const initialParts = useMemo(() => toLocalParts(initialIso), [initialIso]);
  const [title, setTitle] = useState(route.params?.title ?? '');
  const [notes, setNotes] = useState('');
  const [context, setContext] = useState<TaskContext>(route.params?.context ?? 'personal');
  const [repeat, setRepeat] = useState<ReminderRepeat>('none');
  const [dateValue, setDateValue] = useState(initialParts.date);
  const [timeValue, setTimeValue] = useState(initialParts.time);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const applyPreset = (preset: SchedulePreset) => {
    const parts = toLocalParts(schedulePreset(preset));
    setDateValue(parts.date);
    setTimeValue(parts.time);
    setError('');
  };

  const save = async () => {
    const scheduled = parseLocal(dateValue, timeValue);
    if (!title.trim()) return setError('Add a title.');
    if (!scheduled) return setError('Use date YYYY-MM-DD and time HH:mm.');
    if (scheduled.getTime() <= Date.now()) return setError('Choose a future time.');
    setSaving(true);
    setError('');
    try {
      await dispatch(addReminder({
        title,
        notes,
        context,
        repeat,
        scheduledAt: scheduled.toISOString(),
        linkedTaskId: route.params?.taskId,
      })).unwrap();
      navigation.goBack();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create reminder.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <View><Text style={styles.eyebrow}>LOCAL FIRST</Text><Text style={styles.title}>New reminder</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="What should LifeOS remember?" placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>Notes</Text>
          <TextInput value={notes} onChangeText={setNotes} multiline style={[styles.input, styles.notes]} placeholder="Optional context" placeholderTextColor={colors.textMuted} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>When</Text>
          <View style={styles.presetRow}>
            {([['in1h', '+1 hour'], ['today18', '6 PM'], ['tomorrow9', 'Tomorrow 9'], ['tomorrow18', 'Tomorrow 6']] as const).map(([value, label]) => (
              <Pressable key={value} onPress={() => applyPreset(value)} style={styles.chip}><Text style={styles.chipText}>{label}</Text></Pressable>
            ))}
          </View>
          <View style={styles.dateRow}>
            <View style={styles.flex}><Text style={styles.label}>Date</Text><TextInput value={dateValue} onChangeText={setDateValue} style={styles.input} autoCapitalize="none" /></View>
            <View style={styles.timeBox}><Text style={styles.label}>Time</Text><TextInput value={timeValue} onChangeText={setTimeValue} style={styles.input} autoCapitalize="none" /></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Repeat</Text>
          <View style={styles.presetRow}>
            {(['none', 'daily', 'weekly'] as ReminderRepeat[]).map(value => (
              <Pressable key={value} onPress={() => setRepeat(value)} style={[styles.chip, repeat === value && styles.chipActive]}>
                <Text style={[styles.chipText, repeat === value && styles.chipTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.sectionTitle}>Context</Text>
          <View style={styles.presetRow}>
            {(['personal', 'work', 'study', 'gym', 'shopping'] as TaskContext[]).map(value => (
              <Pressable key={value} onPress={() => setContext(value)} style={[styles.chip, context === value && styles.chipActive]}>
                <Text style={[styles.chipText, context === value && styles.chipTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={saving} onPress={() => void save()} style={[styles.save, saving && styles.disabled]}>
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Create reminder'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, paddingBottom: 80, gap: spacing.md},
  header: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  back: {width: 42, height: 42, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center'},
  backText: {color: colors.text, fontSize: 30, marginTop: -3},
  eyebrow: {color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1},
  title: {color: colors.text, fontSize: 26, fontWeight: '900'},
  section: {backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm},
  sectionTitle: {color: colors.text, fontSize: 15, fontWeight: '900'},
  label: {color: colors.textMuted, fontSize: 11, fontWeight: '800'},
  input: {minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated, color: colors.text, paddingHorizontal: spacing.sm, fontSize: 16},
  notes: {minHeight: 90, paddingTop: spacing.sm, textAlignVertical: 'top'},
  presetRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {minHeight: 38, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center'},
  chipActive: {borderColor: colors.accent, backgroundColor: colors.accentSoft},
  chipText: {color: colors.textMuted, fontWeight: '800', fontSize: 11, textTransform: 'capitalize'},
  chipTextActive: {color: colors.text},
  dateRow: {flexDirection: 'row', gap: spacing.sm},
  flex: {flex: 1, gap: 5},
  timeBox: {width: 108, gap: 5},
  error: {color: colors.danger, fontWeight: '700'},
  save: {minHeight: 52, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center'},
  saveText: {color: colors.white, fontWeight: '900', fontSize: 15},
  disabled: {opacity: 0.5},
});
