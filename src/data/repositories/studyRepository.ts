import {database} from '../database/client';
import type {
  CreateBookmarkInput,
  CreateFlashcardInput,
  CreateNoteInput,
  CreateStudySubjectInput,
  Flashcard,
  FlashcardRating,
  ImportMaterialInput,
  ApplyStudyExtractionInput,
  KnowledgeChunk,
  StudyBookmark,
  StudyMaterial,
  StudySession,
  StudySnapshot,
  StudySubject,
} from '../../features/study/types';
import {createId} from '../../utils/createId';
import {localDateKey} from '../../utils/dateTime';
import type {StudyRepository} from './StudyRepositoryContract';

type SubjectRow = {id:string;name:string;description:string;icon:string;tone:string;position:number;archived_at:string|null;created_at:string;updated_at:string};
type MaterialRow = {id:string;subject_id:string;title:string;kind:StudyMaterial['kind'];body_text:string|null;local_uri:string|null;mime_type:string|null;original_name:string|null;size_bytes:number|null;progress_percent:number;last_opened_at:string|null;created_at:string;updated_at:string;deleted_at:string|null;text_extraction_state:StudyMaterial['textExtractionState'];text_extraction_error:string|null;text_extracted_at:string|null;text_char_count:number};
type SessionRow = {id:string;subject_id:string;material_id:string|null;status:StudySession['status'];started_at:string;ended_at:string|null;duration_seconds:number|null;goal_minutes:number;notes:string|null;created_at:string;updated_at:string};
type FlashcardRow = {id:string;subject_id:string;material_id:string|null;front:string;back:string;due_at:string;interval_days:number;ease_x1000:number;repetitions:number;status:Flashcard['status'];created_at:string;updated_at:string};
type BookmarkRow = {id:string;material_id:string;title:string;locator_text:string|null;page_number:number|null;note:string|null;created_at:string;updated_at:string};
type ChunkRow = {id:string;material_id:string;chunk_index:number;content_text:string;embedding_state:KnowledgeChunk['embeddingState'];page_number:number|null;source_locator:string|null;extraction_method:string|null;created_at:string;updated_at:string};

const mapSubject = (r: SubjectRow): StudySubject => ({id:r.id,name:r.name,description:r.description,icon:r.icon,tone:r.tone,position:Number(r.position),archivedAt:r.archived_at,createdAt:r.created_at,updatedAt:r.updated_at});
const mapMaterial = (r: MaterialRow): StudyMaterial => ({id:r.id,subjectId:r.subject_id,title:r.title,kind:r.kind,bodyText:r.body_text,localUri:r.local_uri,mimeType:r.mime_type,originalName:r.original_name,sizeBytes:r.size_bytes == null ? null : Number(r.size_bytes),progressPercent:Number(r.progress_percent),lastOpenedAt:r.last_opened_at,createdAt:r.created_at,updatedAt:r.updated_at,deletedAt:r.deleted_at,textExtractionState:r.text_extraction_state,textExtractionError:r.text_extraction_error,textExtractedAt:r.text_extracted_at,textCharCount:Number(r.text_char_count??0)});
const mapSession = (r: SessionRow): StudySession => ({id:r.id,subjectId:r.subject_id,materialId:r.material_id,status:r.status,startedAt:r.started_at,endedAt:r.ended_at,durationSeconds:r.duration_seconds == null ? null : Number(r.duration_seconds),goalMinutes:Number(r.goal_minutes),notes:r.notes,createdAt:r.created_at,updatedAt:r.updated_at});
const mapFlashcard = (r: FlashcardRow): Flashcard => ({id:r.id,subjectId:r.subject_id,materialId:r.material_id,front:r.front,back:r.back,dueAt:r.due_at,intervalDays:Number(r.interval_days),easeX1000:Number(r.ease_x1000),repetitions:Number(r.repetitions),status:r.status,createdAt:r.created_at,updatedAt:r.updated_at});
const mapBookmark = (r: BookmarkRow): StudyBookmark => ({id:r.id,materialId:r.material_id,title:r.title,locatorText:r.locator_text,pageNumber:r.page_number == null ? null : Number(r.page_number),note:r.note,createdAt:r.created_at,updatedAt:r.updated_at});
const mapChunk = (r: ChunkRow): KnowledgeChunk => ({id:r.id,materialId:r.material_id,chunkIndex:Number(r.chunk_index),contentText:r.content_text,embeddingState:r.embedding_state,pageNumber:r.page_number==null?null:Number(r.page_number),sourceLocator:r.source_locator,extractionMethod:r.extraction_method,createdAt:r.created_at,updatedAt:r.updated_at});

function chunkText(text: string) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) return [] as string[];
  const chunks: string[] = [];
  const max = 700;
  for (let i = 0; i < normalized.length; i += max) chunks.push(normalized.slice(i, i + max));
  return chunks.slice(0, 100);
}

class SQLiteStudyRepository implements StudyRepository {
  async loadSnapshot(): Promise<StudySnapshot> {
    let subjects: SubjectRow[]=[]; let materials: MaterialRow[]=[]; let sessions: SessionRow[]=[]; let flashcards: FlashcardRow[]=[]; let bookmarks: BookmarkRow[]=[]; let chunks: ChunkRow[]=[];
    await database.transaction(async tx => {
      subjects = (await tx.execute(`SELECT id,name,description,icon,tone,position,archived_at,created_at,updated_at FROM study_subjects WHERE archived_at IS NULL ORDER BY position,name;`)).rows as unknown as SubjectRow[];
      materials = (await tx.execute(`SELECT id,subject_id,title,kind,body_text,local_uri,mime_type,original_name,size_bytes,progress_percent,last_opened_at,created_at,updated_at,deleted_at,text_extraction_state,text_extraction_error,text_extracted_at,text_char_count FROM study_materials WHERE deleted_at IS NULL ORDER BY COALESCE(last_opened_at,created_at) DESC LIMIT 500;`)).rows as unknown as MaterialRow[];
      sessions = (await tx.execute(`SELECT id,subject_id,material_id,status,started_at,ended_at,duration_seconds,goal_minutes,notes,created_at,updated_at FROM study_sessions ORDER BY started_at DESC LIMIT 300;`)).rows as unknown as SessionRow[];
      flashcards = (await tx.execute(`SELECT id,subject_id,material_id,front,back,due_at,interval_days,ease_x1000,repetitions,status,created_at,updated_at FROM flashcards ORDER BY due_at,created_at LIMIT 2000;`)).rows as unknown as FlashcardRow[];
      bookmarks = (await tx.execute(`SELECT id,material_id,title,locator_text,page_number,note,created_at,updated_at FROM study_bookmarks ORDER BY created_at DESC LIMIT 1000;`)).rows as unknown as BookmarkRow[];
      chunks = (await tx.execute(`SELECT id,material_id,chunk_index,content_text,embedding_state,page_number,source_locator,extraction_method,created_at,updated_at FROM study_knowledge_chunks ORDER BY material_id,chunk_index LIMIT 5000;`)).rows as unknown as ChunkRow[];
    });
    return {subjects:subjects.map(mapSubject),materials:materials.map(mapMaterial),sessions:sessions.map(mapSession),flashcards:flashcards.map(mapFlashcard),bookmarks:bookmarks.map(mapBookmark),knowledgeChunks:chunks.map(mapChunk)};
  }

  async createSubject(input: CreateStudySubjectInput): Promise<StudySnapshot> {
    const name=input.name.trim(); if(!name) throw new Error('Subject name is required.'); const now=new Date().toISOString();
    const count=await database.execute(`SELECT COALESCE(MAX(position),0)+1 AS position FROM study_subjects WHERE archived_at IS NULL;`); const position=Number((count.rows[0] as {position?:number}|undefined)?.position??1);
    await database.execute(`INSERT INTO study_subjects(id,name,description,icon,tone,position,archived_at,created_at,updated_at) VALUES(?,?,?,?, 'purple',?,NULL,?,?);`,[createId('subject'),name,input.description?.trim()??'',input.icon?.trim()||'📚',position,now,now]);
    return this.loadSnapshot();
  }

  async createNote(input: CreateNoteInput): Promise<StudySnapshot> {
    const title=input.title.trim(); const body=input.bodyText.trim(); if(!title) throw new Error('Note title is required.'); if(!body) throw new Error('Note content is required.');
    const now=new Date().toISOString(); const id=createId('material');
    await database.transaction(async tx => {
      const subject=await tx.execute(`SELECT id FROM study_subjects WHERE id=? AND archived_at IS NULL LIMIT 1;`,[input.subjectId]); if(!subject.rows.length) throw new Error('Study subject not found.');
      await tx.execute(`INSERT INTO study_materials(id,subject_id,title,kind,body_text,local_uri,mime_type,original_name,size_bytes,progress_percent,last_opened_at,created_at,updated_at,deleted_at,text_extraction_state,text_extraction_error,text_extracted_at,text_char_count) VALUES(?,?,?,'note',?,NULL,'text/plain',NULL,NULL,0,?, ?, ?,NULL,'ready',NULL,?,?);`,[id,input.subjectId,title,body,now,now,now,now,body.length]);
      const chunks=chunkText(body); for(let i=0;i<chunks.length;i+=1) await tx.execute(`INSERT INTO study_knowledge_chunks(id,material_id,chunk_index,content_text,embedding_state,page_number,source_locator,extraction_method,created_at,updated_at) VALUES(?,?,?,?, 'pending',NULL,'LifeOS note','note',?,?);`,[createId('chunk'),id,i,chunks[i],now,now]);
    });
    return this.loadSnapshot();
  }

  async importMaterial(input: ImportMaterialInput): Promise<StudySnapshot> {
    if(!input.title.trim() || !input.localUri) throw new Error('Imported material is incomplete.');
    const now=new Date().toISOString(); const id=createId('material');
    await database.transaction(async tx => {
      await tx.execute(`INSERT INTO study_materials(id,subject_id,title,kind,body_text,local_uri,mime_type,original_name,size_bytes,progress_percent,last_opened_at,created_at,updated_at,deleted_at,text_extraction_state,text_extraction_error,text_extracted_at,text_char_count) VALUES(?,?,?,?,NULL,?,?,?,?,0,?, ?, ?,NULL,?,NULL,NULL,0);`,[id,input.subjectId,input.title.trim(),input.kind,input.localUri,input.mimeType,input.originalName,input.sizeBytes,now,now,now,input.kind==='image'?'needs_ocr':'pending']);
    });
    return this.loadSnapshot();
  }

  async getMaterial(materialId:string):Promise<StudyMaterial|null>{
    const result=await database.execute(`SELECT id,subject_id,title,kind,body_text,local_uri,mime_type,original_name,size_bytes,progress_percent,last_opened_at,created_at,updated_at,deleted_at,text_extraction_state,text_extraction_error,text_extracted_at,text_char_count FROM study_materials WHERE id=? AND deleted_at IS NULL LIMIT 1;`,[materialId]);
    const row=result.rows[0] as unknown as MaterialRow|undefined;
    return row?mapMaterial(row):null;
  }

  async applyMaterialExtraction(input:ApplyStudyExtractionInput):Promise<StudySnapshot>{
    const material=await this.getMaterial(input.materialId); if(!material) throw new Error('Study material not found.');
    const now=new Date().toISOString(); const body=input.bodyText?.trim()||null; const chunks=input.chunks??[];
    await database.transaction(async tx=>{
      await tx.execute(`DELETE FROM study_knowledge_chunks WHERE material_id=?;`,[input.materialId]);
      await tx.execute(`UPDATE study_materials SET body_text=?,text_extraction_state=?,text_extraction_error=?,text_extracted_at=?,text_char_count=?,updated_at=? WHERE id=? AND deleted_at IS NULL;`,[body,input.state,input.error?.trim()||null,input.state==='ready'?now:null,body?.length??0,now,input.materialId]);
      if(input.state==='ready'){
        for(let i=0;i<chunks.length;i+=1){
          const chunk=chunks[i]; const text=chunk.contentText.trim(); if(!text) continue;
          await tx.execute(`INSERT INTO study_knowledge_chunks(id,material_id,chunk_index,content_text,embedding_state,page_number,source_locator,extraction_method,created_at,updated_at) VALUES(?,?,?,?, 'pending',?,?,?,?,?);`,[createId('chunk'),input.materialId,i,text,chunk.pageNumber??null,chunk.sourceLocator??null,input.extractionMethod??null,now,now]);
        }
      }
    });
    return this.loadSnapshot();
  }

  async updateMaterialProgress(materialId:string, progressPercent:number): Promise<StudySnapshot> {
    const value=Math.max(0,Math.min(100,Math.round(progressPercent))); const now=new Date().toISOString();
    await database.execute(`UPDATE study_materials SET progress_percent=?,updated_at=? WHERE id=? AND deleted_at IS NULL;`,[value,now,materialId]);
    return this.loadSnapshot();
  }
  async markMaterialOpened(materialId:string): Promise<StudySnapshot> { const now=new Date().toISOString(); await database.execute(`UPDATE study_materials SET last_opened_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL;`,[now,now,materialId]); return this.loadSnapshot(); }

  async createFlashcard(input:CreateFlashcardInput): Promise<StudySnapshot> {
    const front=input.front.trim(), back=input.back.trim(); if(!front||!back) throw new Error('Both flashcard sides are required.'); const now=new Date().toISOString();
    await database.execute(`INSERT INTO flashcards(id,subject_id,material_id,front,back,due_at,interval_days,ease_x1000,repetitions,status,created_at,updated_at) VALUES(?,?,?,?,?,?,0,2500,0,'learning',?,?);`,[createId('card'),input.subjectId,input.materialId??null,front,back,now,now,now]);
    return this.loadSnapshot();
  }

  async reviewFlashcard(cardId:string, rating:FlashcardRating): Promise<StudySnapshot> {
    const result=await database.execute(`SELECT interval_days,ease_x1000,repetitions FROM flashcards WHERE id=? LIMIT 1;`,[cardId]); const row=result.rows[0] as {interval_days?:number;ease_x1000?:number;repetitions?:number}|undefined; if(!row) throw new Error('Flashcard not found.');
    let interval=Number(row.interval_days??0), ease=Number(row.ease_x1000??2500), reps=Number(row.repetitions??0);
    if(rating==='again'){reps=0;interval=0;ease=Math.max(1300,ease-200);} else if(rating==='hard'){reps+=1;interval=Math.max(1,Math.round(Math.max(1,interval)*1.2));ease=Math.max(1300,ease-150);} else if(rating==='good'){reps+=1;interval=reps===1?1:reps===2?3:Math.max(1,Math.round(interval*(ease/1000)));} else {reps+=1;interval=reps===1?3:reps===2?7:Math.max(2,Math.round(interval*(ease/1000)*1.3));ease=Math.min(3000,ease+100);}
    const due=new Date(); if(rating==='again') due.setMinutes(due.getMinutes()+10); else due.setDate(due.getDate()+interval); const now=new Date().toISOString();
    await database.execute(`UPDATE flashcards SET due_at=?,interval_days=?,ease_x1000=?,repetitions=?,status='review',updated_at=? WHERE id=?;`,[due.toISOString(),interval,ease,reps,now,cardId]); return this.loadSnapshot();
  }

  async createBookmark(input:CreateBookmarkInput): Promise<StudySnapshot> { const now=new Date().toISOString(); await database.execute(`INSERT INTO study_bookmarks(id,material_id,title,locator_text,page_number,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?);`,[createId('bookmark'),input.materialId,input.title.trim()||'Bookmark',input.locatorText??null,input.pageNumber??null,input.note??null,now,now]); return this.loadSnapshot(); }

  async startStudySession(subjectId:string, materialId:string|null, goalMinutes:number): Promise<StudySnapshot> {
    const existing=await database.execute(`SELECT id FROM study_sessions WHERE status='active' LIMIT 1;`); if(existing.rows.length) throw new Error('Finish or cancel your active study session first.'); const now=new Date().toISOString();
    await database.execute(`INSERT INTO study_sessions(id,subject_id,material_id,status,started_at,ended_at,duration_seconds,goal_minutes,notes,created_at,updated_at) VALUES(?,?,?,'active',?,NULL,NULL,?,NULL,?,?);`,[createId('study_session'),subjectId,materialId,now,Math.max(1,Math.min(240,Math.round(goalMinutes))),now,now]); return this.loadSnapshot();
  }
  async finishStudySession(sessionId:string): Promise<StudySnapshot> {
    const result=await database.execute(`SELECT started_at FROM study_sessions WHERE id=? AND status='active' LIMIT 1;`,[sessionId]);
    const row=result.rows[0] as {started_at?:string}|undefined; if(!row?.started_at) throw new Error('Active study session not found.');
    const end=new Date(); const duration=Math.max(1,Math.round((end.getTime()-new Date(row.started_at).getTime())/1000)); const now=end.toISOString();
    await database.transaction(async tx=>{
      await tx.execute(`UPDATE study_sessions SET status='completed',ended_at=?,duration_seconds=?,updated_at=? WHERE id=?;`,[now,duration,now,sessionId]);
      if(duration>=5*60){
        await tx.execute(`INSERT INTO habit_checkins(id,habit_id,date_key,completed,value,note,created_at,updated_at)
          SELECT ?,id,?,1,1,'Completed through Study Mode',?,? FROM habits WHERE id='habit_study'
          ON CONFLICT(habit_id,date_key) DO UPDATE SET completed=1,updated_at=excluded.updated_at;`,[createId('checkin'),localDateKey(end),now,now]);
      }
    });
    return this.loadSnapshot();
  }
  async cancelStudySession(sessionId:string): Promise<StudySnapshot> { const now=new Date().toISOString(); await database.execute(`UPDATE study_sessions SET status='cancelled',ended_at=?,updated_at=? WHERE id=? AND status='active';`,[now,now,sessionId]); return this.loadSnapshot(); }
}

export const studyRepository: StudyRepository = new SQLiteStudyRepository();
