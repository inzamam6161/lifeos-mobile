import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import {studyRepository} from '../../data/repositories/studyRepository';
import {extractStudyMaterialText} from '../../services/studyTextExtractionService';
import {refreshPersonalMemory} from '../../services/memoryService';
import type {
  CreateBookmarkInput,
  CreateFlashcardInput,
  CreateNoteInput,
  CreateStudySubjectInput,
  FlashcardRating,
  ImportMaterialInput,
  StudySnapshot,
} from './types';

type StudyState = StudySnapshot & {loading:boolean; error:string|null};
const initialState: StudyState = {subjects:[],materials:[],sessions:[],flashcards:[],bookmarks:[],knowledgeChunks:[],loading:false,error:null};

export const loadStudy = createAsyncThunk('study/load',()=>studyRepository.loadSnapshot());
export const createStudySubject = createAsyncThunk('study/createSubject',(input:CreateStudySubjectInput)=>studyRepository.createSubject(input));
export const createStudyNote = createAsyncThunk('study/createNote',(input:CreateNoteInput)=>studyRepository.createNote(input));
export const importStudyMaterial = createAsyncThunk('study/importMaterial',(input:ImportMaterialInput)=>studyRepository.importMaterial(input));
export const extractStudyMaterialKnowledge = createAsyncThunk('study/extractMaterialKnowledge',async(materialId:string)=>{
  const material=await studyRepository.getMaterial(materialId);
  if(!material) throw new Error('Study material not found.');
  if(material.kind==='note') return studyRepository.loadSnapshot();
  try{
    const result=await extractStudyMaterialText(material);
    const snapshot=await studyRepository.applyMaterialExtraction({materialId,state:result.state,bodyText:result.bodyText,extractionMethod:result.extractionMethod,chunks:result.chunks});
    await refreshPersonalMemory();
    return snapshot;
  }catch(error){
    const message=error instanceof Error?error.message:'Text extraction failed.';
    return studyRepository.applyMaterialExtraction({materialId,state:'failed',error:message,bodyText:null,chunks:[]});
  }
});
export const updateStudyProgress = createAsyncThunk('study/updateProgress',(input:{materialId:string;progressPercent:number})=>studyRepository.updateMaterialProgress(input.materialId,input.progressPercent));
export const markStudyMaterialOpened = createAsyncThunk('study/markOpened',(materialId:string)=>studyRepository.markMaterialOpened(materialId));
export const createStudyFlashcard = createAsyncThunk('study/createFlashcard',(input:CreateFlashcardInput)=>studyRepository.createFlashcard(input));
export const reviewStudyFlashcard = createAsyncThunk('study/reviewFlashcard',(input:{cardId:string;rating:FlashcardRating})=>studyRepository.reviewFlashcard(input.cardId,input.rating));
export const createStudyBookmark = createAsyncThunk('study/createBookmark',(input:CreateBookmarkInput)=>studyRepository.createBookmark(input));
export const startStudySession = createAsyncThunk('study/startSession',(input:{subjectId:string;materialId:string|null;goalMinutes:number})=>studyRepository.startStudySession(input.subjectId,input.materialId,input.goalMinutes));
export const finishStudySession = createAsyncThunk('study/finishSession',(sessionId:string)=>studyRepository.finishStudySession(sessionId));
export const cancelStudySession = createAsyncThunk('study/cancelSession',(sessionId:string)=>studyRepository.cancelStudySession(sessionId));

const slice=createSlice({
  name:'study',initialState,reducers:{},extraReducers:builder=>{
    const pending=(state:StudyState)=>{state.loading=true;state.error=null;};
    const fulfilled=(state:StudyState,action:{payload:StudySnapshot})=>{state.loading=false;state.error=null;state.subjects=action.payload.subjects;state.materials=action.payload.materials;state.sessions=action.payload.sessions;state.flashcards=action.payload.flashcards;state.bookmarks=action.payload.bookmarks;state.knowledgeChunks=action.payload.knowledgeChunks;};
    const rejected=(state:StudyState,action:{error:{message?:string}})=>{state.loading=false;state.error=action.error.message??'Study operation failed.';};
    builder
      .addCase(loadStudy.pending,pending).addCase(loadStudy.fulfilled,fulfilled).addCase(loadStudy.rejected,rejected)
      .addCase(createStudySubject.pending,pending).addCase(createStudySubject.fulfilled,fulfilled).addCase(createStudySubject.rejected,rejected)
      .addCase(createStudyNote.pending,pending).addCase(createStudyNote.fulfilled,fulfilled).addCase(createStudyNote.rejected,rejected)
      .addCase(importStudyMaterial.pending,pending).addCase(importStudyMaterial.fulfilled,fulfilled).addCase(importStudyMaterial.rejected,rejected)
      .addCase(extractStudyMaterialKnowledge.pending,pending).addCase(extractStudyMaterialKnowledge.fulfilled,fulfilled).addCase(extractStudyMaterialKnowledge.rejected,rejected)
      .addCase(updateStudyProgress.pending,pending).addCase(updateStudyProgress.fulfilled,fulfilled).addCase(updateStudyProgress.rejected,rejected)
      .addCase(markStudyMaterialOpened.pending,pending).addCase(markStudyMaterialOpened.fulfilled,fulfilled).addCase(markStudyMaterialOpened.rejected,rejected)
      .addCase(createStudyFlashcard.pending,pending).addCase(createStudyFlashcard.fulfilled,fulfilled).addCase(createStudyFlashcard.rejected,rejected)
      .addCase(reviewStudyFlashcard.pending,pending).addCase(reviewStudyFlashcard.fulfilled,fulfilled).addCase(reviewStudyFlashcard.rejected,rejected)
      .addCase(createStudyBookmark.pending,pending).addCase(createStudyBookmark.fulfilled,fulfilled).addCase(createStudyBookmark.rejected,rejected)
      .addCase(startStudySession.pending,pending).addCase(startStudySession.fulfilled,fulfilled).addCase(startStudySession.rejected,rejected)
      .addCase(finishStudySession.pending,pending).addCase(finishStudySession.fulfilled,fulfilled).addCase(finishStudySession.rejected,rejected)
      .addCase(cancelStudySession.pending,pending).addCase(cancelStudySession.fulfilled,fulfilled).addCase(cancelStudySession.rejected,rejected);
  }
});
export const studyReducer=slice.reducer;
