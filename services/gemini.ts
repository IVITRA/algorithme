
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

  // Algorithm specific strictness
  let algoRules = "";
  if (algoType === AlgorithmType.BUBBLE) {
    algoRules = "ALGORITHM MISMATCH CHECK: This is BUBBLE SORT. You MUST REJECT logic that uses 'min_idx', 'pm', 'min', 'max_idx', or searches for the smallest/largest element (Selection Sort logic). Bubble sort MUST compare adjacent elements (j, j+1).";
  } else if (algoType === AlgorithmType.SELECTION) {
    algoRules = "ALGORITHM MISMATCH CHECK: This is SELECTION SORT. 1. Logic MUST involve finding a minimum OR maximum element index (pm/min_idx). 2. CRITICAL: The inner search loop MUST start from 'i+1'. If the user writes a loop starting from 0 or 1 (e.g. range(0, n)), REJECT it. Feedback: 'خطأ قاتل: الحلقة الداخلية في فرز الاختيار يجب أن تبدأ من i+1 (العنصر التالي) لأن العناصر السابقة (0 إلى i) مرتبة بالفعل.'.";
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
    2. If Target is 'inner_loop' (Bubble Sort), the code MUST NOT contain the swap/comparison logic yet. If found, REJECT with feedback: "أحسنت، ولكن نركز الآن فقط على الحلقة الداخلية. سنضيف المقارنة في الخطوة القادمة.".
    
    3. FOR SELECTION SORT:
       - If Target is 'init_min', it implies initializing the index 'pm' (Position Min/Max). REJECT if 'inner_search_loop' is present. Feedback: "نحن فقط نعرف المتغير pm الآن. حلقة البحث تأتي لاحقاً.".
       - If Target is 'inner_search_loop', REJECT if 'final_swap' or 'update_min_logic' (inside logic) is present. Feedback: "ركز على كتابة حلقة البحث فقط. سنضيف منطق تحديث pm داخلها في الخطوة التالية.".
    
    4. The goal is to force the user to build block-by-block. Reject full pasted solutions immediately.

    Validation Rules:
    1. Ignore errors in parts of the code that are NOT related to the current concept (unless they break the code entirely).
    2. Focus: Is the logic for '${concept}' present and correct?
    3. If '${concept}' is 'outer_loop', check for the main loop iteration.
    4. If '${concept}' is 'inner_loop' or 'inner_search_loop', check if it is nested correctly inside the outer loop.
    5. If '${concept}' is 'compare_swap', check if the IF logic and SWAP logic exist inside the inner loop.

    Algorithm Constraints:
    ${algoRules}

    Language Syntax Rules:
    ${langRules}

    General Rules:
    - Ascending (min_idx) AND Descending (max_idx) are BOTH ACCEPTABLE for Selection Sort, using 'pm' as the variable.
    - Bubble Sort: Loop range(n-1) or range(n-2) are both acceptable.
    - Selection Sort: Logic for finding min OR max is acceptable using 'pm'.
    
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
    3. For Selection Sort: 
       - Use variable 'pm' for the position of min/max.
       - CRITICAL: Inner loop MUST start from 'i+1' (e.g., range(i+1, n)).
    
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
  language: string,
  algoType: AlgorithmType
): Promise<TranspileResult> => {
  const prompt = `
    TRANSPILE this ${language} code to JavaScript.
    Target Algorithm: ${algoType}
    Input Code:
    \`\`\`
    ${code}
    \`\`\`
    
    Task:
    1. **STRICT ALGORITHM VERIFICATION**:
       - If Target is 'BUBBLE': Check if logic compares adjacent elements (j, j+1). REJECT if it uses 'min_idx', 'pm', 'min', or looks for smallest element (Selection Sort logic).
       - If Target is 'SELECTION': Check if logic finds a minimum OR maximum element index (conventionally 'pm'). CRITICAL: Check if inner loop starts from 'i+1'. REJECT if it starts from 0 (incorrect logic that ruins sorted part).
       - If logic does not match ${algoType}, return JSON { "error": "عذراً، الكود المكتوب لا يطابق خوارزمية ${algoType}. يرجى الالتزام بالخوارزمية المطلوبة." }.

    2. **TRANSPILATION** (Only if verification passes):
       - Convert to strictly valid JavaScript logic body.
       - Use environment vars: 'n', 'cmp(i,j)', 'swp(i,j)'.
       - Replace array access T[i] with cmp/swp calls.
       - Python 'range(x, y)' -> JS loop.
    
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
