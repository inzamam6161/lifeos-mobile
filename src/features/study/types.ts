export type StudyMaterialKind = 'note' | 'pdf' | 'image' | 'document';
export type FlashcardStatus = 'learning' | 'review' | 'suspended';
export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy';
export type TextExtractionState = 'not_applicable' | 'pending' | 'ready' | 'needs_ocr' | 'failed';

export type StudySubject = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tone: string;
  position: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudyMaterial = {
  id: string;
  subjectId: string;
  title: string;
  kind: StudyMaterialKind;
  bodyText: string | null;
  localUri: string | null;
  mimeType: string | null;
  originalName: string | null;
  sizeBytes: number | null;
  progressPercent: number;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  textExtractionState: TextExtractionState;
  textExtractionError: string | null;
  textExtractedAt: string | null;
  textCharCount: number;
};

export type StudySession = {
  id: string;
  subjectId: string;
  materialId: string | null;
  status: 'active' | 'completed' | 'cancelled';
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  goalMinutes: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Flashcard = {
  id: string;
  subjectId: string;
  materialId: string | null;
  front: string;
  back: string;
  dueAt: string;
  intervalDays: number;
  easeX1000: number;
  repetitions: number;
  status: FlashcardStatus;
  createdAt: string;
  updatedAt: string;
};

export type StudyBookmark = {
  id: string;
  materialId: string;
  title: string;
  locatorText: string | null;
  pageNumber: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeChunk = {
  id: string;
  materialId: string;
  chunkIndex: number;
  contentText: string;
  embeddingState: 'pending' | 'ready' | 'failed';
  pageNumber: number | null;
  sourceLocator: string | null;
  extractionMethod: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudySnapshot = {
  subjects: StudySubject[];
  materials: StudyMaterial[];
  sessions: StudySession[];
  flashcards: Flashcard[];
  bookmarks: StudyBookmark[];
  knowledgeChunks: KnowledgeChunk[];
};

export type CreateNoteInput = {
  subjectId: string;
  title: string;
  bodyText: string;
};

export type ImportMaterialInput = {
  subjectId: string;
  title: string;
  kind: Exclude<StudyMaterialKind, 'note'>;
  localUri: string;
  mimeType: string | null;
  originalName: string | null;
  sizeBytes: number | null;
};

export type CreateFlashcardInput = {
  subjectId: string;
  materialId?: string | null;
  front: string;
  back: string;
};

export type CreateBookmarkInput = {
  materialId: string;
  title: string;
  locatorText?: string | null;
  pageNumber?: number | null;
  note?: string | null;
};

export type CreateStudySubjectInput = {name:string; description?:string; icon?:string};


export type ExtractedKnowledgeChunkInput = {
  contentText: string;
  pageNumber?: number | null;
  sourceLocator?: string | null;
};

export type ApplyStudyExtractionInput = {
  materialId: string;
  state: Exclude<TextExtractionState, 'not_applicable' | 'pending'>;
  bodyText?: string | null;
  error?: string | null;
  extractionMethod?: string | null;
  chunks?: ExtractedKnowledgeChunkInput[];
};
