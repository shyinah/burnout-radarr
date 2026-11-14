export type UserMode = 'student' | 'developer';

export interface SessionInput {
  userId?: string;
  mode: UserMode;
  focusMinutes: number;
  breakMinutes: number;
  sleepHours: number;
  perceivedFatigue: number; // 1–10 scale
  sessionDate: string;
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface CFIResult {
  score: number; // 0–100 scale
  riskLevel: 'low' | 'moderate' | 'high';
  explanation: string[];
  recommendations: Recommendation[];
}

export interface SessionRecord extends SessionInput {
  id: string;
  cfiScore: number;
}
