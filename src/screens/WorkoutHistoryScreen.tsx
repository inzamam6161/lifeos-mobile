import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppSelector} from '../app/hooks';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import type {RootStackParamList} from '../types/navigation';

type Props=NativeStackScreenProps<RootStackParamList,'WorkoutHistory'>;
function duration(seconds:number|null){if(!seconds)return '—';const m=Math.round(seconds/60);return `${m} min`;}
export function WorkoutHistoryScreen({navigation}:Props){
 const sessions=useAppSelector(state=>state.gym.sessions.filter(item=>item.status==='completed'));
 const sets=useAppSelector(state=>state.gym.sets);
 return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
  <View style={styles.header}><View><Text style={styles.eyebrow}>PROGRESS</Text><Text style={styles.title}>Workout history</Text></View><Pressable onPress={()=>navigation.goBack()} style={styles.back}><Text style={styles.backText}>Back</Text></Pressable></View>
  {sessions.length?sessions.map(session=>{const completed=sets.filter(item=>item.sessionId===session.id&&item.completed);const volume=completed.reduce((sum,item)=>sum+(item.weightGrams/1000)*item.reps,0);const exercises=new Set(completed.map(item=>item.exerciseId)).size;return <View key={session.id} style={styles.card}><View style={styles.row}><View><Text style={styles.name}>{session.title}</Text><Text style={styles.meta}>{new Date(session.startedAt).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</Text></View><Text style={styles.duration}>{duration(session.durationSeconds)}</Text></View><View style={styles.metrics}><Text style={styles.metric}>{completed.length} sets</Text><Text style={styles.metric}>{exercises} exercises</Text><Text style={styles.metric}>{Math.round(volume).toLocaleString()} kg volume</Text></View></View>}):<View style={styles.empty}><Text style={styles.emptyTitle}>No completed workouts yet</Text><Text style={styles.meta}>Finish your first Gym Mode session and it will appear here.</Text></View>}
 </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},content:{padding:spacing.md,paddingBottom:70,gap:spacing.md},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},eyebrow:{color:colors.gym,fontSize:10,fontWeight:'900',letterSpacing:1.2},title:{color:colors.text,fontSize:27,fontWeight:'900',marginTop:4},back:{minHeight:44,paddingHorizontal:14,borderWidth:1,borderColor:colors.border,borderRadius:12,justifyContent:'center'},backText:{color:colors.text,fontWeight:'800'},card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:18,padding:spacing.md,gap:12},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},name:{color:colors.text,fontWeight:'900',fontSize:17},meta:{color:colors.textMuted,fontSize:11,lineHeight:17},duration:{color:colors.gym,fontWeight:'900'},metrics:{flexDirection:'row',flexWrap:'wrap',gap:8},metric:{color:colors.textMuted,backgroundColor:colors.surfaceElevated,borderRadius:99,paddingHorizontal:10,paddingVertical:6,fontSize:10,fontWeight:'700',overflow:'hidden'},empty:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:18,padding:spacing.xl,alignItems:'center',gap:8},emptyTitle:{color:colors.text,fontWeight:'900',fontSize:17}});
