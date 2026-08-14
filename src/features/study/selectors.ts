import type {RootState} from '../../app/store';

export const selectActiveStudySession=(state:RootState)=>state.study.sessions.find(item=>item.status==='active')??null;
export const selectDueFlashcards=(state:RootState)=>{
  const now=Date.now(); return state.study.flashcards.filter(item=>item.status!=='suspended'&&new Date(item.dueAt).getTime()<=now);
};
export function selectStudySummary(state:RootState){
  const completed=state.study.sessions.filter(item=>item.status==='completed');
  const start=new Date(); const day=start.getDay(); const diff=day===0?6:day-1; start.setDate(start.getDate()-diff); start.setHours(0,0,0,0);
  const weekSessions=completed.filter(item=>new Date(item.startedAt).getTime()>=start.getTime());
  const weekSeconds=weekSessions.reduce((sum,item)=>sum+(item.durationSeconds??0),0);
  const materials=state.study.materials.length;
  const completedMaterials=state.study.materials.filter(item=>item.progressPercent>=100).length;
  const dueCards=selectDueFlashcards(state).length;
  return {weekMinutes:Math.round(weekSeconds/60),weekSessions:weekSessions.length,materials,completedMaterials,dueCards};
}
