
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
    langRules = "STRICT PYTHON SYNTAX: Use 'if/else', 'for/in', 'range', 'while'. REJECT 'Si/Alors', 'Pour/Faire', 'Fin', 'Tant que', 'Répéter', 'Jusqu\\'à'. Do not mix English and French keywords.";
  } else {
    langRules = "STRICT PSEUDO SYNTAX: Use 'Si/Alors', 'Pour/Faire', 'Fin', 'Tant que', 'Répéter', 'Jusqu\\'à'. REJECT 'if ... alors' (mixed). REJECT python-specific syntax like 'def' or colons ':' without keywords.";
  }

  // Algorithm specific strictness
  let algoRules = "";
  if (algoType === AlgorithmType.BUBBLE) {
    algoRules = "ALGORITHM MISMATCH CHECK: This is CLASSIC BUBBLE SORT. You MUST REJECT logic that uses 'while', 'Répéter' or boolean flags like 'test/echange'. Expect NESTED FOR LOOPS.";
  } else if (algoType === AlgorithmType.BUBBLE_OPTIMIZED) {
    if (language === 'python') {
        algoRules = "ALGORITHM MISMATCH CHECK: This is OPTIMIZED BUBBLE SORT (Python). 1. Must use a 'while' loop (e.g. while test == False). 2. Must RESET 'test = True' at start of loop. 3. Must set 'test = False' on swap.";
    } else {
        algoRules = "ALGORITHM MISMATCH CHECK: This is OPTIMIZED BUBBLE SORT (Pseudo). 1. MUST USE 'Répéter' ... 'Jusqu\\'à' (Repeat Until) structure. REJECT 'Tant que' (While). 2. Must RESET 'test <- Vrai' at start. 3. Must set 'test <- Faux' on swap.";
    }
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
    The user is building the algorithm step-by-step. The code MAY contain parts from previous steps.
    You must verify ONLY if the **Target Step Concept** is currently implemented correctly within the context of the code.
    
    STRICT PACING RULES (Incremental Learning):
    1. If Target is 'outer_loop' (Classic Bubble), code MUST NOT contain inner loop yet.
    2. If Target is 'loop_structure_and_reset' (Optimized Bubble), check for the loop wrapper (While or Repeter) AND the flag reset (test=True). Code MUST NOT contain the inner 'for' loop yet.
    3. If Target is 'inner_scan_loop' (Optimized Bubble), check for 'for i in range...' inside the main loop. MUST NOT contain the swap logic yet.
    
    Validation Rules:
    1. Ignore errors in parts of the code that are NOT related to the current concept (unless they break the code entirely).
    2. Focus: Is the logic for '${concept}' present and correct?
    
    Specific Checks for Optimized Bubble Sort:
    - Concept 'loop_structure_and_reset': 
       - Python: Check for 'while test == False' AND 'test = True'.
       - Pseudo: Check for 'Répéter' AND 'test <- Vrai'.
    - Concept 'inner_scan_loop': Check for the 'Pour/For' loop inside.
    - Concept 'swap_and_flag': Check for 'if T[i] > T[i+1]', the swap, AND 'test = False' (flagging a change).

    Algorithm Constraints:
    ${algoRules}

    Language Syntax Rules:
    ${langRules}
    
    Output JSON: { "isValid": boolean, "feedback": "Brief Arabic text explaining error if invalid." }
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
    3. For Optimized Bubble Sort:
       - Python: Use 'while test == False'. Reset 'test = True'. Toggle 'test = False'.
       - Pseudo: Use 'Répéter' ... 'Jusqu\\'à (test)'. Reset 'test <- Vrai'. Toggle 'test <- Faux'.
    
    Output: RAW CODE ONLY. No markdown. No explanations. Just the lines needed for this step.
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
       - If 'BUBBLE': Expect nested loops. REJECT 'while' loop logic.
       - If 'BUBBLE_OPTIMIZED': Expect 'while' loop (Python) OR 'Répéter...Jusqu\\'à' (Pseudo) with boolean flag. REJECT pure nested for loops without flag.
       - If 'SELECTION': Expect min/max finding logic with inner loop starting i+1.
       - If logic does not match ${algoType}, return JSON { "error": "عذراً، الكود المكتوب لا يطابق خوارزمية ${algoType}." }.

    2. **TRANSPILATION** (Only if verification passes):
       - Convert to strictly valid JavaScript logic body.
       - Use environment vars: 'n', 'cmp(i,j)', 'swp(i,j)'.
       - Replace array access T[i] with cmp/swp calls.
       - Python 'range(x, y)' -> JS loop.
       - Handle boolean flags correctly (let test = false).
       - **PSEUDO SPECIAL**: 'Répéter ... Jusqu\\'à (test)' translates to 'do { ... } while (!test)'. 
         (Because 'Until test is true' = 'While test is false').
    
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
