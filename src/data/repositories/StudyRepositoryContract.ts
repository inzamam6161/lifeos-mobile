import type {
  CreateBookmarkInput,
  CreateFlashcardInput,
  CreateNoteInput,
  CreateStudySubjectInput,
  FlashcardRating,
  ImportMaterialInput,
  ApplyStudyExtractionInput,
  StudyMaterial,
  StudySnapshot,
} from '../../features/study/types';

export interface StudyRepository {
  loadSnapshot(): Promise<StudySnapshot>;
  createSubject(input: CreateStudySubjectInput): Promise<StudySnapshot>;
  createNote(input: CreateNoteInput): Promise<StudySnapshot>;
  importMaterial(input: ImportMaterialInput): Promise<StudySnapshot>;
  getMaterial(materialId: string): Promise<StudyMaterial | null>;
  applyMaterialExtraction(input: ApplyStudyExtractionInput): Promise<StudySnapshot>;
  updateMaterialProgress(materialId: string, progressPercent: number): Promise<StudySnapshot>;
  markMaterialOpened(materialId: string): Promise<StudySnapshot>;
  createFlashcard(input: CreateFlashcardInput): Promise<StudySnapshot>;
  reviewFlashcard(cardId: string, rating: FlashcardRating): Promise<StudySnapshot>;
  createBookmark(input: CreateBookmarkInput): Promise<StudySnapshot>;
  startStudySession(subjectId: string, materialId: string | null, goalMinutes: number): Promise<StudySnapshot>;
  finishStudySession(sessionId: string): Promise<StudySnapshot>;
  cancelStudySession(sessionId: string): Promise<StudySnapshot>;
}
