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
  
  // Context-aware validation to prevent "Right Code, Wrong Question"
  let strictContext = "";
  if (concept === 'compare_and_swap' || concept === 'update_min_index' || concept === 'swap_min') {
     strictContext = "CRITICAL: The user should ONLY write the Logic inside the loop (IF statement or Swap). If the user writes a Loop definition (For/Pour), mark it as INVALID. The question asks 'What to do inside?', not for the loop itself.";
  } else if (concept.includes('loop')) {
     strictContext = "CRITICAL: The user MUST write a Loop definition (For/Pour). If they only write an IF statement, mark it as INVALID.";
  }

  // Language specific strictness
  let langRules = "";
  if (language === 'python') {
    langRules = "STRICT PYTHON SYNTAX: Use 'if/else', 'for/in', 'range'. REJECT 'Si/Alors', 'Pour/Faire', 'Fin'. Do not mix English and French keywords.";
  } else {
    langRules = "STRICT PSEUDO SYNTAX: Use 'Si/Alors', 'Pour/Faire', 'Fin'. REJECT 'if ... alors' (mixed). REJECT python-specific syntax like 'def' or colons ':' without keywords. Keywords are French (Pour, Si, Alors, Fin).";
  }

  const prompt = `
    You are a strict code reviewer for a sorting algorithm tutorial.
    Algorithm: ${algoType}
    Target Step Concept: ${concept}
    Selected Language: ${language}
    User Code: \`${snippet}\`

    Context Validation Rules:
    ${strictContext}

    Language Syntax Rules:
    ${langRules}

    General Rules:
    - Ascending/Descending both OK.
    - Bubble Sort: Loop range(n-1) or range(n-2) are both acceptable.
    - Selection Sort: Check logic for finding min/max.
    
    Output JSON: { "isValid": boolean, "feedback": "Brief Arabic text explaining error if invalid (e.g. 'لقد كتبت حلقة تكرار، والمطلوب هو شرط المقارنة فقط' or 'لا تخلط بين صيغة بايثون والخوارزمية')." }
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        // Removed COMPILER_SYSTEM_PROMPT to avoid confusing the model (Validator vs Transpiler)
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
    Provide correct ${language} code for ${algoType} step: ${concept}.
    Context: ${hint}.
    CRITICAL RULES:
    1. If language is "pseudo", loops MUST end with "faire" (e.g., Pour i de 0 à N-1 faire).
    2. If language is "python":
       - For Bubble Sort Outer Loop: use "range(n-1)".
       - For others: use standard python ranges.
    Output: RAW CODE ONLY. No markdown. No explanations.
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