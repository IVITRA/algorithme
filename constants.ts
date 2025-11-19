
import { AlgorithmType, AlgorithmData } from './types';

export const BUBBLE_SORT_DATA: AlgorithmData = {
  title: "فرز الفقاعات (Tri à Bulle Classique)",
  description: "النسخة التقليدية: تعتمد على حلقتين متداخلتين (تكرار ثابت).",
  starterCode: {
    pseudo: `// المتغيرات: T (جدول), N (عدد العناصر)
// ابدأ بكتابة الحلقة الخارجية...`,
    python: `# المتغيرات: arr (القائمة), n (الطول)
# ابدأ بكتابة الحلقة الخارجية...`
  },
  steps: [
    {
      id: 1,
      question: "الخطوة 1: الحلقة الخارجية",
      hint: "نحتاج لتكرار عملية المرور على القائمة عدة مرات. اكتب الحلقة الخارجية التي تتحكم في عدد التمريرات.",
      expectedConcept: "outer_loop"
    },
    {
      id: 2,
      question: "الخطوة 2: الحلقة الداخلية",
      hint: "داخل الحلقة الخارجية، نحتاج للمرور على العناصر للمقارنة. اكتب الحلقة الداخلية (تذكر الحدود الصحيحة!).",
      expectedConcept: "inner_loop"
    },
    {
      id: 3,
      question: "الخطوة 3: المقارنة والتبديل",
      hint: "داخل الحلقة الداخلية، قارن العنصر الحالي (j) بالعنصر التالي (j+1) وبدل بينهما إذا كان الترتيب خاطئاً.",
      expectedConcept: "compare_swap"
    }
  ]
};

export const BUBBLE_SORT_OPTIMIZED_DATA: AlgorithmData = {
  title: "فرز الفقاعات المحسن (Optimisé - الموصى به)",
  description: "نسخة ذكية تستخدم متغير منطقي (test) للتوقف فوراً عند انتهاء الترتيب.",
  starterCode: {
    pseudo: `// المتغيرات: T (جدول), N (عدد العناصر)
// سنستخدم حلقة تكرار (Répéter)
test <- Faux`,
    python: `# المتغيرات: arr (القائمة), n (الطول)
# سنستخدم حلقة while مع متغير test
test = False`
  },
  steps: [
    {
      id: 1,
      question: "الخطوة 1: هيكل التكرار والتهيئة",
      hint: "بايثون: استخدم 'while test == False' وأعد ضبط 'test = True' في أول سطر داخل الحلقة.\nPseudo: استخدم 'Répéter' (كرر) ... وأعد ضبط 'test <- Vrai' في البداية.",
      expectedConcept: "loop_structure_and_reset"
    },
    {
      id: 2,
      question: "الخطوة 2: شرط التوقف (Pseudo فقط) والحلقة الداخلية",
      hint: "بايثون: اكتب حلقة for للمرور على العناصر (range(n-1)).\nPseudo: اكتب حلقة Pour وأغلق التكرار بـ 'Jusqu'à (test)'.",
      expectedConcept: "inner_scan_loop"
    },
    {
      id: 3,
      question: "الخطوة 3: المقارنة والتبديل وتحديث الإشارة",
      hint: "إذا كان العنصر الحالي أكبر من التالي (T[i] > T[i+1]):\n1. بدل بينهما.\n2. اجعل test = False (أو Faux) ليعرف البرنامج أن الترتيب لم ينته بعد.",
      expectedConcept: "swap_and_flag"
    }
  ]
};

export const SELECTION_SORT_DATA: AlgorithmData = {
  title: "فرز الاختيار (Tri par Sélection)",
  description: "خوارزمية تبحث عن العنصر الأصغر (أو الأكبر) وتضعه في مكانه الصحيح.",
  starterCode: {
    pseudo: `// المتغيرات: T (جدول), N (عدد العناصر)
// ابدأ بكتابة الحلقة الخارجية...`,
    python: `# المتغيرات: arr (القائمة), n (الطول)
# ابدأ بكتابة الحلقة الخارجية...`
  },
  steps: [
    {
      id: 1,
      question: "الخطوة 1: الحلقة الخارجية",
      hint: "اكتب الحلقة التي تمر على كل خانة في القائمة لملئها بالعنصر المناسب.",
      expectedConcept: "outer_loop"
    },
    {
      id: 2,
      question: "الخطوة 2: افتراض القيمة (الأصغر أو الأكبر)",
      hint: "في بداية كل دورة، نفترض أن العنصر الحالي هو الأنسب. عرف متغير pm (Position Min/Max) وأعطه قيمة i.",
      expectedConcept: "init_min"
    },
    {
      id: 3,
      question: "الخطوة 3: البحث عن الأنسب",
      hint: "ابحث في باقي القائمة عن عنصر أصغر (أو أكبر). يجب أن تبدأ الحلقة الداخلية من (i+1) لأن ما قبل i تم فرزه بالفعل.",
      expectedConcept: "inner_search_loop"
    },
    {
      id: 4,
      question: "الخطوة 4: تحديث المؤشر",
      hint: "إذا وجدت عنصراً أفضل (أصغر/أكبر) من العنصر في الموقع pm، اجعل pm يشير لهذا الموقع الجديد (j).",
      expectedConcept: "update_min_logic"
    },
    {
      id: 5,
      question: "الخطوة 5: التبديل النهائي",
      hint: "بعد انتهاء حلقة البحث (وخارجها)، إذا كان pm مختلفاً عن i، بدل العنصر الحالي بالعنصر عند pm.",
      expectedConcept: "final_swap"
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
8. For boolean flags (test=False), map them to JS booleans (let test = false).
9. For Pseudo 'Répéter ... Jusqu'à (cond)', output JS 'do { ... } while (!cond)'. Note the negation: Jusqu'à(True) means Stop when True. JS while(cond) means Continue when True. So JS while = !PseudoCondition.

Output Format:
JSON ONLY: { "jsCode": "string", "error": "string | null" }
`;
