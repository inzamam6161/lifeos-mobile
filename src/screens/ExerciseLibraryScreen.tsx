import React, {useMemo, useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppSelector} from '../app/hooks';
import {exerciseImages} from '../features/gym/exerciseImages';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import type {RootStackParamList} from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ExerciseLibrary'>;
export function ExerciseLibraryScreen({navigation}: Props) {
  const exercises = useAppSelector(state => state.gym.exercises);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? exercises.filter(item => `${item.name} ${item.primaryMuscle} ${item.equipment}`.toLowerCase().includes(q)) : exercises;
  }, [exercises, query]);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><View><Text style={styles.eyebrow}>OFFLINE LIBRARY</Text><Text style={styles.title}>Exercises</Text></View><Pressable onPress={() => navigation.goBack()} style={styles.back}><Text style={styles.backText}>Back</Text></Pressable></View>
    <TextInput value={query} onChangeText={setQuery} placeholder="Search exercise or muscle" placeholderTextColor={colors.textMuted} style={styles.search}/>
    <View style={styles.grid}>{filtered.map(exercise => <Pressable key={exercise.id} onPress={() => navigation.navigate('ExerciseDetail',{exerciseId:exercise.id})} style={styles.card}><Image source={exerciseImages[exercise.imageKey]} style={styles.image} resizeMode="cover"/><View style={styles.body}><Text style={styles.name}>{exercise.name}</Text><Text style={styles.meta}>{exercise.primaryMuscle} · {exercise.equipment}</Text></View></Pressable>)}</View>
  </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},content:{padding:spacing.md,paddingBottom:70,gap:spacing.md},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},eyebrow:{color:colors.gym,fontSize:10,fontWeight:'900',letterSpacing:1.2},title:{color:colors.text,fontSize:28,fontWeight:'900',marginTop:4},back:{minHeight:44,paddingHorizontal:14,borderWidth:1,borderColor:colors.border,borderRadius:12,justifyContent:'center'},backText:{color:colors.text,fontWeight:'800'},search:{minHeight:50,borderRadius:15,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,paddingHorizontal:14,color:colors.text,fontSize:16},grid:{gap:12},card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:18,overflow:'hidden'},image:{width:'100%',height:180,backgroundColor:colors.surfaceElevated},body:{padding:14,gap:4},name:{color:colors.text,fontSize:17,fontWeight:'900'},meta:{color:colors.textMuted,fontSize:11}});
