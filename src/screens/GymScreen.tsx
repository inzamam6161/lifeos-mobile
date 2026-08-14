import React from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../app/hooks';
import {selectActiveWorkout, selectGymSummary} from '../features/gym/selectors';
import {startWorkout} from '../features/gym/gymSlice';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import type {RootStackParamList} from '../types/navigation';

function minutesForRoutine(targetSets: number) {
  return Math.max(30, Math.round(targetSets * 3.5));
}

type Props = NativeStackScreenProps<RootStackParamList, 'Gym'>;
export function GymScreen({navigation}: Props) {
  const dispatch = useAppDispatch();
  const routines = useAppSelector(state => state.gym.routines);
  const routineExercises = useAppSelector(state => state.gym.routineExercises);
  const active = useAppSelector(selectActiveWorkout);
  const summary = useAppSelector(selectGymSummary);
  const completed = useAppSelector(state => state.gym.sessions.filter(item => item.status === 'completed'));
  const last = completed[0];

  const begin = async (routineId: string) => {
    try {
      await dispatch(startWorkout(routineId)).unwrap();
      navigation.navigate('WorkoutSession');
    } catch (error) {
      Alert.alert('Could not start workout', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>🏋️ GYM MODE</Text><Text style={styles.title}>Train with intent</Text><Text style={styles.subtitle}>Offline routines, set tracking and progress.</Text></View>
          <Pressable onPress={() => navigation.goBack()} style={styles.exit}><Text style={styles.exitText}>Exit</Text></Pressable>
        </View>

        {active ? (
          <Pressable onPress={() => navigation.navigate('WorkoutSession')} style={styles.activeCard}>
            <View><Text style={styles.activeLabel}>ACTIVE WORKOUT</Text><Text style={styles.activeTitle}>{active.title}</Text><Text style={styles.subtitle}>Started {new Date(active.startedAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</Text></View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ) : null}

        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statLabel}>This week</Text><Text style={styles.statValue}>{summary.weekSessions}</Text><Text style={styles.statMeta}>sessions</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>All time</Text><Text style={styles.statValue}>{summary.totalSessions}</Text><Text style={styles.statMeta}>workouts</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>Volume</Text><Text style={styles.statValue}>{Math.round(summary.totalVolumeKg).toLocaleString()}</Text><Text style={styles.statMeta}>kg total</Text></View>
        </View>

        <View style={styles.rowBetween}><Text style={styles.sectionTitle}>Your routines</Text><Text style={styles.hint}>Tap to start</Text></View>
        <View style={styles.routineList}>
          {routines.map(routine => {
            const plan = routineExercises.filter(item => item.routineId === routine.id);
            const setCount = plan.reduce((sum, item) => sum + item.targetSets, 0);
            return (
              <View style={styles.routineCard} key={routine.id}>
                <View style={styles.routineIcon}><Text style={styles.routineEmoji}>{routine.icon}</Text></View>
                <View style={styles.routineBody}><Text style={styles.routineTitle}>{routine.name}</Text><Text style={styles.subtitle}>{routine.subtitle}</Text><Text style={styles.routineMeta}>{plan.length} exercises · {setCount} sets · ~{minutesForRoutine(setCount)} min</Text></View>
                <Pressable disabled={Boolean(active)} onPress={() => void begin(routine.id)} style={[styles.start, active && styles.disabled]}><Text style={styles.startText}>Start</Text></Pressable>
              </View>
            );
          })}
        </View>

        <View style={styles.quickGrid}>
          <Pressable onPress={() => navigation.navigate('ExerciseLibrary')} style={styles.quick}><Text style={styles.quickEmoji}>🖼️</Text><Text style={styles.quickTitle}>Exercise Library</Text><Text style={styles.subtitle}>Offline images & form notes</Text></Pressable>
          <Pressable onPress={() => navigation.navigate('WorkoutHistory')} style={styles.quick}><Text style={styles.quickEmoji}>↗</Text><Text style={styles.quickTitle}>History</Text><Text style={styles.subtitle}>{last ? `Last · ${last.title}` : 'Your completed workouts'}</Text></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background}, content:{padding:spacing.md,paddingBottom:80,gap:spacing.lg}, header:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:12}, eyebrow:{color:colors.gym,fontSize:11,fontWeight:'900',letterSpacing:1.2}, title:{color:colors.text,fontSize:28,fontWeight:'900',marginTop:4}, subtitle:{color:colors.textMuted,fontSize:12,lineHeight:18}, exit:{minHeight:44,paddingHorizontal:14,borderWidth:1,borderColor:colors.border,borderRadius:12,justifyContent:'center'}, exitText:{color:colors.text,fontWeight:'800'}, activeCard:{minHeight:92,backgroundColor:colors.gymSoft,borderWidth:1,borderColor:colors.gym,borderRadius:20,padding:spacing.md,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, activeLabel:{color:colors.gym,fontSize:10,fontWeight:'900',letterSpacing:1}, activeTitle:{color:colors.text,fontSize:20,fontWeight:'900',marginTop:4}, chevron:{color:colors.gym,fontSize:30}, stats:{flexDirection:'row',gap:8}, stat:{flex:1,minHeight:92,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:16,padding:12,justifyContent:'space-between'}, statLabel:{color:colors.textMuted,fontSize:10}, statValue:{color:colors.text,fontSize:22,fontWeight:'900'}, statMeta:{color:colors.textMuted,fontSize:10}, rowBetween:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, sectionTitle:{color:colors.text,fontSize:18,fontWeight:'900'}, hint:{color:colors.textMuted,fontSize:11}, routineList:{gap:10}, routineCard:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:18,padding:14,flexDirection:'row',alignItems:'center',gap:12}, routineIcon:{width:48,height:48,borderRadius:15,backgroundColor:colors.gymSoft,alignItems:'center',justifyContent:'center'}, routineEmoji:{fontSize:22}, routineBody:{flex:1,gap:2}, routineTitle:{color:colors.text,fontWeight:'900',fontSize:16}, routineMeta:{color:colors.gym,fontSize:10,fontWeight:'800',marginTop:4}, start:{minHeight:44,paddingHorizontal:14,borderRadius:12,backgroundColor:colors.gym,alignItems:'center',justifyContent:'center'}, startText:{color:colors.background,fontWeight:'900'}, disabled:{opacity:.35}, quickGrid:{flexDirection:'row',gap:10}, quick:{flex:1,minHeight:125,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:18,padding:14,gap:6}, quickEmoji:{fontSize:22}, quickTitle:{color:colors.text,fontWeight:'900',fontSize:15},
});
