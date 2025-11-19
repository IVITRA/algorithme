
import { AlgorithmType, AlgorithmData } from './types';

export const BUBBLE_SORT_DATA: AlgorithmData = {
  title: "فرز الفقاعات (Tri à Bulle)",
  description: "خوارزمية تعتمد على تبادل العناصر المتجاورة حتى تصعد العناصر الكبيرة للأعلى (أو العكس).",
  starterCode: {
    pseudo: `// المتغيرات: T (جدول), N (عدد العناصر)
Pour i de 0 à N-1 faire
    Pour j de 0 à N-2 faire
        // اكتب منطق المقارنة والتبديل هنا
    Fin Pour
Fin Pour`,
    python: `# المتغيرات: arr (القائمة), n (الطول)
for i in range(n-1):
    for j in range(0, n-1): # يوافق 0 إلى n-2
        # اكتب منطق المقارنة والتبديل هنا
        pass`
  },
  steps: [
    {
      id: 1,
      question: "إذا عندي رقمين جنب بعض (j و j+1)، وش أسوي؟",
      hint: "اكتب شرط المقارنة (Si / if) وأمر التبديل (Echanger / swap). سواء تصاعدي أو تنازلي.",
      expectedConcept: "compare_and_swap"
    },
    {
      id: 2,
      question: "هل أسوي المقارنة هذه مرة وحدة؟",
      hint: "كيف نمر على كل العناصر؟ (اكتب حلقة التكرار الداخلية)",
      expectedConcept: "inner_loop"
    },
    {
      id: 3,
      question: "هل يكفي إني أمرّ على القائمة مرة وحدة؟",
      hint: "كيف نكرر العملية حتى تترتب القائمة؟ (اكتب حلقة التكرار الخارجية)",
      expectedConcept: "outer_loop"
    }
  ]
};

export const SELECTION_SORT_DATA: AlgorithmData = {
  title: "فرز الاختيار (Tri par Sélection)",
  description: "خوارزمية تبحث عن العنصر الأصغر (أو الأكبر) وتضعه في مكانه الصحيح.",
  starterCode: {
    pseudo: `// المتغيرات: T (جدول), N (عدد العناصر)
Pour i de 0 à N-1 faire
    min_idx = i
    // اكمل الباقي...
Fin Pour`,
    python: `# المتغيرات: arr (القائمة), n (الطول)
for i in range(n):
    min_idx = i
    # اكمل الباقي...`
  },
  steps: [
    {
      id: 1,
      question: "وش أول خطوة للبحث عن العنصر المطلوب؟",
      hint: "افترض أن العنصر الحالي هو المطلوب (أصغر أو أكبر)، ثم ابحث في الباقي. اكتب الحلقة الداخلية.",
      expectedConcept: "find_min_loop"
    },
    {
      id: 2,
      question: "إذا لقيت رقم أفضل من الـ min/max الحالي، وش أسوي؟",
      hint: "داخل الحلقة، كيف نحدث المؤشر؟",
      expectedConcept: "update_min_index"
    },
    {
      id: 3,
      question: "بعد ما يخلص البحث في الجزء غير المرتب، وش أسوي؟",
      hint: "كيف نبدل العنصر الحالي مع العنصر الذي وجدناه؟",
      expectedConcept: "swap_min"
    }
  ]
};

export const COMPILER_SYSTEM_PROMPT = `
Role: Code Transpiler.
Task: Convert Python/Pseudo-code into strictly valid JavaScript logic body.

Environment API:
- variable \`n\`: integer (array length).
- function \`cmp(i, j)\`: returns >0 if arr[i]>arr[j], 0 if equal, <0 if arr[i]<arr[j].
- function \`swp(i, j)\`: swaps elements at i and j.

Rules:
1. Translate loops and conditionals EXACTLY as written.
2. Replace array comparisons \`T[i] > T[j]\` with \`cmp(i, j) > 0\`.
3. Replace array swaps \`T[i], T[j] = T[j], T[i]\` with \`swp(i, j)\`.
4. Do NOT use \`return\`.
5. Do NOT define functions. Just write the loop logic.
6. Do NOT optimize or fix the user's logic (e.g. if they loop too far, keep it).
7. For Python \`range(n-1)\`, output JS \`i < n-1\`.

Output Format:
JSON ONLY: { "jsCode": "string", "error": "string | null" }
`;
