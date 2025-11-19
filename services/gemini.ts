
import { GoogleGenAI } from "@google/genai";
import { COMPILER_SYSTEM_PROMPT } from '../constants';
import { TranspileResult, ValidationResult, AlgorithmType } from '../types';

// Use import.meta.env for Vite support to prevent "process is not defined" crash
// @ts-ignore
const apiKey = import.meta.env.VITE_API_KEY || "";

const ai = new GoogleGenAI({ apiKey });
const MODEL_NAME = "gemini-2.5-flash";

export const validateSnippet = async (
  snippet: string,
  concept: string,
  algoType: AlgorithmType,
  language: string
): Promise<ValidationResult> => {
  
  // Language specific strictness
  let langRules = "";
  if (language === 'python') {
    langRules = "STRICT PYTHON SYNTAX: Use 'if/else', 'for/in', 'range'. REJECT 'Si/Alors', 'Pour/Faire', 'Fin'. Do not mix English and French keywords.";
  } else {
    langRules = "STRICT PSEUDO SYNTAX: Use 'Si/Alors', 'Pour/Faire', 'Fin'. REJECT 'if ... alors' (mixed). REJECT python-specific syntax like 'def' or colons ':' without keywords. Keywords are French (Pour, Si, Alors, Fin).";
  }

  const prompt = `
    You are a strict code reviewer for an interactive algorithm tutorial where the user builds code INCREMENTALLY.
    Algorithm: ${algoType}
    Target Step Concept: ${concept}
    Selected Language: ${language}
    Full User Code So Far: 
    \`\`\`
    ${snippet}
    \`\`\`

    Task:
    The user is building the algorithm step-by-step. The code MAY contain parts from previous steps (e.g. Outer Loop).
    You must verify ONLY if the **Target Step Concept** is currently implemented correctly within the context of the code.
    
    STRICT PACING RULES (Incremental Learning):
    1. If Target is 'outer_loop', the code MUST NOT contain the inner loop yet. If found, REJECT with feedback: "الرجاء الالتزام بالخطوة الحالية فقط (الحلقة الخارجية). لا تسبق الأحداث!".
    2. If Target is 'inner_loop', the code MUST NOT contain the swap/comparison logic yet. If found, REJECT with feedback: "أحسنت، ولكن نركز الآن فقط على الحلقة الداخلية. سنضيف المقارنة في الخطوة القادمة.".
    3. The goal is to force the user to build block-by-block. Reject full pasted solutions.

    Validation Rules:
    1. Ignore errors in parts of the code that are NOT related to the current concept (unless they break the code entirely).
    2. Focus: Is the logic for '${concept}' present and correct?
    3. If '${concept}' is 'outer_loop', check for the main loop iteration.
    4. If '${concept}' is 'inner_loop', check if it is nested correctly inside the outer loop.
    5. If '${concept}' is 'compare_swap', check if the IF logic and SWAP logic exist inside the inner loop.

    Language Syntax Rules:
    ${langRules}

    General Rules:
    - Ascending/Descending both OK.
    - Bubble Sort: Loop range(n-1) or range(n-2) are both acceptable.
    - Selection Sort: Check logic for finding min/max.
    
    Output JSON: { "isValid": boolean, "feedback": "Brief Arabic text explaining error if invalid (e.g. 'لقد كتبت الحلقة الخارجية، ولكن أين الحلقة الداخلية؟' or 'شرط المقارنة غير موجود')." }
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text) as ValidationResult;
  } catch (error) {
    console.error("Validation Error:", error);
    return { isValid: false, feedback: "خطأ في الاتصال. حاول مجدداً." };
  }
};

export const getStepSolution = async (
  concept: string,
  algoType: AlgorithmType,
  language: string,
  hint: string
): Promise<string> => {
  const prompt = `
    The user is building ${algoType} code incrementally.
    Provide the CODE SNIPPET that implements the step: ${concept}.
    Language: ${language}.
    Context: ${hint}.
    
    CRITICAL RULES:
    1. If language is "pseudo", loops MUST end with "faire" (e.g., Pour i de 0 à N-1 faire).
    2. If language is "python":
       - For Bubble Sort Outer Loop: use "range(n-1)".
       - For others: use standard python ranges.
    
    Output: RAW CODE ONLY. No markdown. No explanations. Just the lines needed for this step (or the full block if context requires).
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1 
      }
    });

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Solution Error:", error);
    return "// خطأ";
  }
};

export const transpileCode = async (
  code: string,
  language: string
): Promise<TranspileResult> => {
  const prompt = `
    TRANSPILE this ${language} code to JavaScript.
    Input Code:
    \`\`\`
    ${code}
    \`\`\`
    Remember: Use cmp(i,j) and swp(i,j). Do not access array directly.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: COMPILER_SYSTEM_PROMPT,
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text) as TranspileResult;
  } catch (error) {
    console.error("Transpilation Error:", error);
    return { 
      error: "فشل في ترجمة الكود. الرجاء المحاولة مرة أخرى." 
    };
  }
};
