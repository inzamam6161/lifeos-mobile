import React, {useEffect, useMemo, useState} from 'react';
import {Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../app/hooks';
import {exerciseImages} from '../features/gym/exerciseImages';
import {cancelWorkout, finishWorkout, updateWorkoutSet} from '../features/gym/gymSlice';
import {loadProgress} from '../features/progress/progressSlice';
import {selectActiveWorkout} from '../features/gym/selectors';
import type {WorkoutSet} from '../features/gym/types';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import type {RootStackParamList} from '../types/navigation';
import {formatWeight, parseKgToGrams} from '../utils/weight';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutSession'>;

type SetRowProps = {
  item: WorkoutSet;
  previousWeightGrams: number;
  onCompleted: () => void;
};

function WorkoutSetRow({item, previousWeightGrams, onCompleted}: SetRowProps) {
  const dispatch = useAppDispatch();
  const [weight, setWeight] = useState(item.weightGrams ? String(item.weightGrams / 1000) : previousWeightGrams ? String(previousWeightGrams / 1000) : '');
  const [reps, setReps] = useState(item.reps ? String(item.reps) : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item.weightGrams > 0) setWeight(String(item.weightGrams / 1000));
    if (item.reps > 0) setReps(String(item.reps));
  }, [item.weightGrams, item.reps]);

  const save = async (completed: boolean) => {
    const weightGrams = parseKgToGrams(weight);
    const repsValue = Number(reps || 0);
    if (weightGrams === null || !Number.isSafeInteger(repsValue) || repsValue < 0) {
      return Alert.alert('Check this set', 'Enter a valid weight in kg and whole-number reps.');
    }
    if (completed && repsValue <= 0) return Alert.alert('Reps required', 'Enter at least one rep before completing the set.');
    setSaving(true);
    try {
      await dispatch(updateWorkoutSet({setId: item.id, weightGrams, reps: repsValue, completed})).unwrap();
      if (completed && !item.completed) onCompleted();
    } catch (error) {
      Alert.alert('Could not save set', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.setRow, item.completed && styles.setRowDone]}>
      <View style={styles.setNumber}><Text style={styles.setNumberText}>{item.setNumber}</Text></View>
      <View style={styles.setInputWrap}><Text style={styles.inputLabel}>KG</Text><TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textMuted} style={styles.setInput}/></View>
      <View style={styles.setInputWrap}><Text style={styles.inputLabel}>REPS</Text><TextInput value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textMuted} style={styles.setInput}/></View>
      <Pressable disabled={saving} onPress={() => void save(!item.completed)} style={[styles.completeSet, item.completed && styles.completeSetDone]}><Text style={[styles.completeSetText, item.completed && styles.completeSetTextDone]}>{item.completed ? '✓' : 'Done'}</Text></Pressable>
    </View>
  );
}

function formatRest(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export function WorkoutSessionScreen({navigation}: Props) {
  const dispatch = useAppDispatch();
  const active = useAppSelector(selectActiveWorkout);
  const exercises = useAppSelector(state => state.gym.exercises);
  const plans = useAppSelector(state => state.gym.routineExercises);
  const allSessions = useAppSelector(state => state.gym.sessions);
  const allSets = useAppSelector(state => state.gym.sets);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    if (restUntil === null) return;
    const tick = () => {
      const now = Date.now();
      setClock(now);
      if (now >= restUntil) setRestUntil(null);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [restUntil]);

  const routinePlan = useMemo(() => active?.routineId ? plans.filter(item => item.routineId === active.routineId).sort((a,b) => a.position - b.position) : [], [active?.routineId, plans]);
  useEffect(() => { if (exerciseIndex >= routinePlan.length) setExerciseIndex(Math.max(0, routinePlan.length - 1)); }, [exerciseIndex, routinePlan.length]);
  const currentPlan = routinePlan[exerciseIndex];
  const exercise = exercises.find(item => item.id === currentPlan?.exerciseId);
  const sessionSets = active && exercise ? allSets.filter(item => item.sessionId === active.id && item.exerciseId === exercise.id).sort((a,b) => a.setNumber - b.setNumber) : [];
  const completedSessionIds = new Set(allSessions.filter(item => item.status === 'completed').map(item => item.id));
  const previousSets = exercise ? allSets.filter(item => item.exerciseId === exercise.id && item.completed && completedSessionIds.has(item.sessionId)) : [];
  const previousBest = previousSets.length ? [...previousSets].sort((a,b) => b.weightGrams - a.weightGrams || b.reps - a.reps)[0] : null;
  const completedInWorkout = active ? allSets.filter(item => item.sessionId === active.id && item.completed).length : 0;
  const totalInWorkout = active ? allSets.filter(item => item.sessionId === active.id).length : 0;
  const restSeconds = restUntil ? Math.max(0, Math.ceil((restUntil - clock) / 1000)) : 0;

  if (!active || !currentPlan || !exercise) {
    return <SafeAreaView style={styles.safe}><View style={styles.noWorkout}><Text style={styles.noWorkoutEmoji}>🏋️</Text><Text style={styles.title}>No active workout</Text><Text style={styles.muted}>Choose a routine from Gym Mode to start tracking sets.</Text><Pressable onPress={() => navigation.replace('Gym')} style={styles.primary}><Text style={styles.primaryText}>Choose routine</Text></Pressable></View></SafeAreaView>;
  }

  const startRest = () => {
    setClock(Date.now());
    setRestUntil(Date.now() + currentPlan.restSeconds * 1000);
  };
  const finish = async () => {
    try {
      await dispatch(finishWorkout(active.id)).unwrap();
      await dispatch(loadProgress()).unwrap();
      navigation.replace('Gym');
    } catch (error) { Alert.alert('Could not finish workout', error instanceof Error ? error.message : 'Unknown error'); }
  };
  const cancel = () => Alert.alert('Cancel workout?', 'Completed sets remain in the cancelled session but do not count toward workout history.', [
    {text:'Keep training', style:'cancel'},
    {text:'Cancel workout', style:'destructive', onPress: async () => { await dispatch(cancelWorkout(active.id)); navigation.replace('Gym'); }},
  ]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><View><Text style={styles.eyebrow}>🏋️ {active.title.toUpperCase()}</Text><Text style={styles.title}>{exercise.name}</Text><Text style={styles.muted}>Exercise {exerciseIndex + 1} of {routinePlan.length} · {completedInWorkout}/{totalInWorkout} sets done</Text></View><Pressable onPress={cancel} style={styles.exit}><Text style={styles.exitText}>Exit</Text></Pressable></View>

        <View style={styles.imageWrap}><Image source={exerciseImages[exercise.imageKey]} style={styles.image} resizeMode="cover"/><View style={styles.imageBadge}><Text style={styles.imageBadgeText}>{exercise.primaryMuscle}</Text></View></View>

        <View style={styles.targetRow}>
          <View><Text style={styles.inputLabel}>TARGET</Text><Text style={styles.targetValue}>{currentPlan.targetSets} × {currentPlan.targetRepsMin}–{currentPlan.targetRepsMax}</Text></View>
          <View style={styles.targetRight}><Text style={styles.inputLabel}>PREVIOUS BEST</Text><Text style={styles.best}>{previousBest ? `${formatWeight(previousBest.weightGrams)} × ${previousBest.reps}` : 'First session'}</Text></View>
        </View>

        {restSeconds > 0 ? <View style={styles.restCard}><View><Text style={styles.restLabel}>REST TIMER</Text><Text style={styles.restValue}>{formatRest(restSeconds)}</Text></View><Pressable onPress={() => setRestUntil(null)} style={styles.skip}><Text style={styles.skipText}>Skip</Text></Pressable></View> : null}

        <View style={styles.setHeader}><Text style={styles.setHeaderText}>SET</Text><Text style={styles.setHeaderText}>WEIGHT</Text><Text style={styles.setHeaderText}>REPS</Text><Text style={styles.setHeaderText}>STATUS</Text></View>
        <View style={styles.setList}>{sessionSets.map(item => <WorkoutSetRow key={item.id} item={item} previousWeightGrams={previousBest?.weightGrams ?? 0} onCompleted={startRest}/>)}</View>

        <View style={styles.exerciseNav}>
          <Pressable disabled={exerciseIndex===0} onPress={() => {setExerciseIndex(value=>value-1);setRestUntil(null);}} style={[styles.navButton,exerciseIndex===0&&styles.disabled]}><Text style={styles.navText}>← Previous</Text></Pressable>
          <Pressable disabled={exerciseIndex===routinePlan.length-1} onPress={() => {setExerciseIndex(value=>value+1);setRestUntil(null);}} style={[styles.navButton,exerciseIndex===routinePlan.length-1&&styles.disabled]}><Text style={styles.navText}>Next →</Text></Pressable>
        </View>

        <Pressable onPress={() => void finish()} style={styles.finish}><Text style={styles.finishText}>Finish workout</Text></Pressable>
        <Pressable onPress={() => navigation.navigate('ExerciseDetail',{exerciseId:exercise.id})}><Text style={styles.formLink}>View exercise form & instructions</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},content:{padding:spacing.md,paddingBottom:70,gap:spacing.md},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:12},eyebrow:{color:colors.gym,fontSize:10,fontWeight:'900',letterSpacing:1.1},title:{color:colors.text,fontSize:26,fontWeight:'900',marginTop:4},muted:{color:colors.textMuted,fontSize:11,lineHeight:17},exit:{minHeight:44,paddingHorizontal:14,borderWidth:1,borderColor:colors.border,borderRadius:12,justifyContent:'center'},exitText:{color:colors.text,fontWeight:'800'},imageWrap:{position:'relative',borderRadius:22,overflow:'hidden',borderWidth:1,borderColor:colors.border},image:{width:'100%',height:210,backgroundColor:colors.surface},imageBadge:{position:'absolute',left:12,bottom:12,backgroundColor:colors.gymSoft,borderWidth:1,borderColor:colors.gym,borderRadius:99,paddingHorizontal:10,paddingVertical:6},imageBadgeText:{color:colors.gym,fontSize:10,fontWeight:'900'},targetRow:{flexDirection:'row',justifyContent:'space-between',backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:18,padding:spacing.md},targetRight:{alignItems:'flex-end'},inputLabel:{color:colors.textMuted,fontSize:9,fontWeight:'900',letterSpacing:.8},targetValue:{color:colors.text,fontSize:20,fontWeight:'900',marginTop:4},best:{color:colors.gym,fontWeight:'900',marginTop:6},restCard:{backgroundColor:colors.gymSoft,borderWidth:1,borderColor:colors.gym,borderRadius:18,padding:spacing.md,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},restLabel:{color:colors.gym,fontSize:9,fontWeight:'900',letterSpacing:1},restValue:{color:colors.text,fontSize:31,fontWeight:'900',marginTop:2},skip:{minHeight:44,paddingHorizontal:16,borderRadius:12,backgroundColor:colors.gym,justifyContent:'center'},skipText:{color:colors.background,fontWeight:'900'},setHeader:{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:12},setHeaderText:{color:colors.textMuted,fontSize:9,fontWeight:'800',width:'23%',textAlign:'center'},setList:{gap:8},setRow:{minHeight:66,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:16,padding:8,flexDirection:'row',alignItems:'center',gap:7},setRowDone:{borderColor:colors.gym,backgroundColor:colors.gymSoft},setNumber:{width:36,height:36,borderRadius:11,backgroundColor:colors.surfaceElevated,alignItems:'center',justifyContent:'center'},setNumberText:{color:colors.text,fontWeight:'900'},setInputWrap:{flex:1,gap:2},setInput:{height:40,borderRadius:10,backgroundColor:colors.background,borderWidth:1,borderColor:colors.border,color:colors.text,textAlign:'center',fontWeight:'900',fontSize:15},completeSet:{minWidth:62,height:42,borderRadius:11,borderWidth:1,borderColor:colors.gym,alignItems:'center',justifyContent:'center'},completeSetDone:{backgroundColor:colors.gym},completeSetText:{color:colors.gym,fontWeight:'900',fontSize:11},completeSetTextDone:{color:colors.background,fontSize:17},exerciseNav:{flexDirection:'row',gap:10},navButton:{flex:1,minHeight:50,borderRadius:14,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'},navText:{color:colors.text,fontWeight:'800'},disabled:{opacity:.35},finish:{minHeight:56,borderRadius:16,backgroundColor:colors.gym,alignItems:'center',justifyContent:'center'},finishText:{color:colors.background,fontWeight:'900',fontSize:15},formLink:{color:colors.gym,textAlign:'center',fontWeight:'800'},noWorkout:{flex:1,padding:spacing.xl,alignItems:'center',justifyContent:'center',gap:12},noWorkoutEmoji:{fontSize:44},primary:{minHeight:52,paddingHorizontal:24,borderRadius:15,backgroundColor:colors.gym,alignItems:'center',justifyContent:'center',marginTop:6},primaryText:{color:colors.background,fontWeight:'900'}
});
