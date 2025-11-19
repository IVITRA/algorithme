
export enum AlgorithmType {
  BUBBLE = 'BUBBLE',
  SELECTION = 'SELECTION',
  NONE = 'NONE'
}

export type CodeLanguage = 'pseudo' | 'python';

export interface ConsciousnessStep {
  id: number;
  question: string;
  hint: string; // Context for what code is expected
  expectedConcept: string;
}

export interface AlgorithmData {
  title: string;
  description: string;
  steps: ConsciousnessStep[];
  starterCode: Record<CodeLanguage, string>;
}

export interface SimulationStep {
  type: 'compare' | 'swap' | 'highlight' | 'sorted';
  indices: number[];
  description?: string;
}

export interface TranspileResult {
  jsCode?: string;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  feedback: string;
  correctedSnippet?: string;
}
