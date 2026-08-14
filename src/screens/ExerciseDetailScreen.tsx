import React from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppSelector} from '../app/hooks';
import {exerciseImages} from '../features/gym/exerciseImages';
import {bestSetForExercise} from '../features/gym/selectors';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import type {RootStackParamList} from '../types/navigation';
import {formatWeight} from '../utils/weight';

type Props=NativeStackScreenProps<RootStackParamList,'ExerciseDetail'>;
export function ExerciseDetailScreen({route,navigation}:Props){
 const exercise=useAppSelector(state=>state.gym.exercises.find(item=>item.id===route.params.exerciseId));
 const best=useAppSelector(state=>bestSetForExercise(state,route.params.exerciseId));
 if(!exercise)return <SafeAreaView style={styles.safe}><View style={styles.empty}><Text style={styles.title}>Exercise not found</Text><Pressable onPress={()=>navigation.goBack()}><Text style={styles.link}>Go back</Text></Pressable></View></SafeAreaView>;
 return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
  <View style={styles.header}><View><Text style={styles.eyebrow}>{exercise.primaryMuscle.toUpperCase()}</Text><Text style={styles.title}>{exercise.name}</Text></View><Pressable onPress={()=>navigation.goBack()} style={styles.back}><Text style={styles.backText}>Back</Text></Pressable></View>
  <Image source={exerciseImages[exercise.imageKey]} style={styles.image} resizeMode="cover"/>
  <View style={styles.stats}><View style={styles.stat}><Text style={styles.label}>Equipment</Text><Text style={styles.value}>{exercise.equipment}</Text></View><View style={styles.stat}><Text style={styles.label}>Rest</Text><Text style={styles.value}>{exercise.defaultRestSeconds}s</Text></View></View>
  <View style={styles.card}><Text style={styles.cardTitle}>How to perform</Text><Text style={styles.instructions}>{exercise.instructions}</Text></View>
  <View style={styles.card}><Text style={styles.cardTitle}>Muscles</Text><Text style={styles.instructions}>Primary · {exercise.primaryMuscle}</Text><Text style={styles.instructions}>Secondary · {exercise.secondaryMuscles.length?exercise.secondaryMuscles.join(', '):'—'}</Text></View>
  <View style={[styles.card,styles.bestCard]}><Text style={styles.cardTitle}>Personal best</Text><Text style={styles.best}>{best?`${formatWeight(best.weightGrams)} × ${best.reps}`:'No completed sets yet'}</Text><Text style={styles.label}>LifeOS derives this from completed local workout history.</Text></View>
 </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},content:{padding:spacing.md,paddingBottom:70,gap:spacing.md},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},eyebrow:{color:colors.gym,fontSize:10,fontWeight:'900',letterSpacing:1.2},title:{color:colors.text,fontSize:26,fontWeight:'900',marginTop:4},back:{minHeight:44,paddingHorizontal:14,borderWidth:1,borderColor:colors.border,borderRadius:12,justifyContent:'center'},backText:{color:colors.text,fontWeight:'800'},image:{width:'100%',height:220,borderRadius:20,backgroundColor:colors.surface},stats:{flexDirection:'row',gap:10},stat:{flex:1,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:16,padding:14,gap:5},label:{color:colors.textMuted,fontSize:11},value:{color:colors.text,fontWeight:'900'},card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:18,padding:spacing.md,gap:8},bestCard:{borderColor:colors.gym},cardTitle:{color:colors.text,fontWeight:'900',fontSize:16},instructions:{color:colors.textMuted,lineHeight:21},best:{color:colors.gym,fontSize:26,fontWeight:'900'},empty:{flex:1,alignItems:'center',justifyContent:'center',gap:12},link:{color:colors.gym,fontWeight:'900'}});
