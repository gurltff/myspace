import type { Difficulty } from '../lib/planner';
import type { QType, SplitSection } from '../lib/questions';
import type { Variable } from '../lib/numerical';
import type { ObsColumn } from '../lib/observations';
import type { PaperPattern } from '../lib/pattern';
import type { PhysConst } from '../lib/constants';

export interface Semester { id: string; name: string; archived: boolean; createdAt: string }
export interface Subject {
  id: string; semesterId: string; name: string; code?: string;
  examDate?: string; practicalDate?: string; syllabusRaw: string; color: string;
}
export interface Unit { id: string; subjectId: string; name: string; order: number }
export interface Topic {
  id: string; subjectId: string; unitId: string; name: string; order: number;
  difficulty: Difficulty; confidence: number | null; lastRevised?: string; sourceLine?: string;
}
export interface Paper {
  id: string; subjectId: string; year: number; title: string;
  fileId?: string; fileName?: string; fileType?: string;
  rawText: string; sections: SplitSection[]; totalMarks?: number; durationHours?: number; createdAt: string;
}
export type QSource = 'pyq' | 'generated' | 'mine' | 'variant';
export interface Question {
  id: string; subjectId: string; unitId?: string; topicId?: string; paperId?: string;
  text: string; marks?: number; year?: number; section?: string; type: QType; source: QSource;
  timesPractised: number; lastScore?: number; approved: boolean; stem?: string;
  templateId?: string; answer?: string; parentId?: string; createdAt: string;
}
export interface QuestionTemplate {
  id: string; subjectId: string; questionId: string; template: string; variables: Variable[];
  formula: string; answerUnit: string; constants: Record<string, number>; sigFigs: number;
}
export interface TopicGroup { id: string; subjectId: string; name: string; topicIds: string[]; allowUnit: boolean }
export interface GenPaperQuestion { questionId: string; marks: number; text: string; answer?: string; score?: number }
export interface GeneratedPaper {
  id: string; subjectId: string; title: string; createdAt: string; mode: string;
  durationHours: number; totalMarks: number;
  sections: { name: string; instruction?: string; questions: GenPaperQuestion[] }[];
  attemptedAt?: string; scored?: number;
}
export interface Attempt {
  id: string; questionId?: string; topicId?: string; subjectId: string; score: number; // 0..1
  date: string; kind: 'paper' | 'quiz' | 'mock'; refId?: string;
}
export interface Flashcard {
  id: string; subjectId: string; topicId?: string; front: string; back: string;
  box: number; nextDue: string; createdAt: string;
}
export interface FlashReview { id: string; cardId: string; date: string; correct: boolean }
export interface PlanSettings { hoursPerDay: number; daysOff: string[]; weekdaysOff: number[]; generatedAt?: string; lastMoved?: number }
export interface PlanTask {
  id: string; subjectId: string; topicId: string; date: string; kind: 'study' | 'revision'; hours: number; done: boolean;
}
export interface Experiment {
  id: string; subjectId: string; title: string; aim: string; apparatus: string; theory: string; formula: string;
  videos: string[]; circuitImages: { fileId: string; name: string }[]; embeds: string[];
  steps: { id: string; text: string; done: boolean }[];
  columns: ObsColumn[]; rows: Record<string, string>[]; resultFormula: string; standardValue?: number; resultUnit: string;
  precautions: string; errors: string; viva: { id: string; q: string; a: string }[];
  status: 'not-started' | 'performed' | 'revised';
}
export interface Post {
  id: string; title: string; date: string; mood: string; tags: string[]; html: string;
  isPublic: boolean; updatedAt: string;
}
export interface Settings {
  name: string; college: string; theme: 'light' | 'dark' | 'system'; hoursPerDay: number;
  constants: PhysConst[]; createdAt: string; visits: number; nowStudying?: string; lastSeen?: string;
}

export interface AppData {
  version: number;
  semesters: Semester[];
  subjects: Subject[];
  units: Unit[];
  topics: Topic[];
  topicGroups: TopicGroup[];
  papers: Paper[];
  questions: Question[];
  templates: QuestionTemplate[];
  generatedPapers: GeneratedPaper[];
  attempts: Attempt[];
  flashcards: Flashcard[];
  flashReviews: FlashReview[];
  plan: PlanSettings;
  planTasks: PlanTask[];
  experiments: Experiment[];
  posts: Post[];
  settings: Settings;
  patternOverrides: Record<string, Partial<PaperPattern>>;
  studyDays: string[];
  updatedAt: string;
}
