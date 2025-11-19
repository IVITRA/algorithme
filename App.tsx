
import React, { useState, useRef } from 'react';
import { AlgorithmType, CodeLanguage, SimulationStep } from './types';
import { BUBBLE_SORT_DATA, SELECTION_SORT_DATA } from './constants';
import { Visualizer, VisualizerRef } from './components/Visualizer';
import { StepTrainer } from './components/StepTrainer';
import { transpileCode } from './services/gemini';
import { BrainCircuit, Play, ArrowLeft, Check, AlertTriangle, Loader2, Terminal, Settings2, Code } from 'lucide-react';

const App: React.FC = () => {
  const [currentAlgo, setCurrentAlgo] = useState<AlgorithmType>(AlgorithmType.NONE);
  const [language, setLanguage] = useState<CodeLanguage>('pseudo');
  const [showLangSelector, setShowLangSelector] = useState(false);
  const [mode, setMode] = useState<'trainer' | 'playground'>('trainer');
  const [code, setCode] = useState('');
  
  const [isCompiling, setIsCompiling] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<{type: 'info'|'error'|'success', text: string} | null>(null);
  
  const visualizerRef = useRef<VisualizerRef>(null);

  const getData = () => {
    if (currentAlgo === AlgorithmType.BUBBLE) return BUBBLE_SORT_DATA;
    if (currentAlgo === AlgorithmType.SELECTION) return SELECTION_SORT_DATA;
    return null;
  };
  const data = getData();

  const handleAlgoSelect = (type: AlgorithmType) => {
    setCurrentAlgo(type);
    setShowLangSelector(true); // Show selector immediately after choosing algo
    setMode('trainer');
    setConsoleOutput(null);
    if (visualizerRef.current) visualizerRef.current.reset();
  };

  const confirmLanguage = (lang: CodeLanguage) => {
    setLanguage(lang);
    setShowLangSelector(false);
  };

  const handleTrainerComplete = () => {
    setMode('playground');
    if (data) setCode(data.starterCode[language]);
  };

  const checkLanguageMismatch = (codeSnippet: string): string | null => {
    const pyIndicators = [/\bdef\b/, /\brange\b/, /:\s*$/m, /#.*$/m, /print\(/];
    const pseudoIndicators = [/\bPour\b/i, /\bFin\b/i, /\bSi\b/i, /\bAlors\b/i, /\bDébut\b/i, /\bfaire\b/i];
  
    if (language === 'python') {
      if (pseudoIndicators.some(r => r.test(codeSnippet))) {
        return "⚠️ تنبيه: لقد اخترت Python ولكن الكود يحتوي على كلمات (Pseudo) مثل Pour/Si. الرجاء الالتزام بصيغة بايثون.";
      }
    } else {
      if (pyIndicators.some(r => r.test(codeSnippet))) {
        return "⚠️ تنبيه: لقد اخترت Pseudo-code ولكن الكود يبدو مثل Python. الرجاء استخدام صيغة الخوارزميات (Pour/Si).";
      }
    }
    return null;
  };

  const handleRunSimulation = async () => {
    if (!code.trim() || isCompiling) return;

    // Client-side syntax guard
    const langError = checkLanguageMismatch(code);
    if (langError) {
      setConsoleOutput({ type: 'error', text: langError });
      return;
    }
    
    // 1. Instant Reset
    if (visualizerRef.current) {
      visualizerRef.current.reset();
    }

    setIsCompiling(true);
    setConsoleOutput({ type: 'info', text: 'جاري ترجمة الكود...' });

    try {
      // 2. Transpile using AI (User Code -> JS)
      const result = await transpileCode(code, language);
      
      if (result.error || !result.jsCode) {
        setConsoleOutput({ type: 'error', text: result.error || "فشل في فهم الكود." });
        setIsCompiling(false);
        return;
      }

      setConsoleOutput({ type: 'info', text: 'بدء التنفيذ المحلي...' });

      // 3. Execution Engine (Client Side)
      const steps: SimulationStep[] = [];
      const workingArray = [...(visualizerRef.current?.getCurrentArray() || [])];
      const n = workingArray.length;
      let ops = 0;
      const MAX_OPS = 5000; // Increased Safety Limit for inefficient algorithms

      // Instrumentation Functions
      const cmp = (i: number, j: number) => {
        ops++;
        if (ops > MAX_OPS) throw new Error("Infinite loop detected (Max steps exceeded)");
        if (i < 0 || i >= n || j < 0 || j >= n) throw new Error(`Index out of bounds: [${i}, ${j}]`);
        
        steps.push({ type: 'compare', indices: [i, j], description: `مقارنة T[${i}] مع T[${j}]` });
        return workingArray[i] - workingArray[j];
      };

      const swp = (i: number, j: number) => {
        ops++;
        if (ops > MAX_OPS) throw new Error("Infinite loop detected");
        if (i < 0 || i >= n || j < 0 || j >= n) throw new Error(`Index out of bounds: [${i}, ${j}]`);

        steps.push({ type: 'swap', indices: [i, j], description: `تبديل T[${i}] مع T[${j}]` });
        const temp = workingArray[i];
        workingArray[i] = workingArray[j];
        workingArray[j] = temp;
      };

      // Execute transpiled JS in a sandbox function
      // Passing 'n', 'cmp', 'swp' as arguments
      const sandbox = new Function('n', 'cmp', 'swp', result.jsCode);
      sandbox(n, cmp, swp);

      // 4. Validation: Check if Sorted
      let isSorted = true;
      for (let i = 0; i < n - 1; i++) {
        if (workingArray[i] > workingArray[i + 1]) {
          isSorted = false;
          break;
        }
      }

      if (isSorted) {
         // Add Green Sweep Animation with strict highlighting
         const sortedIndices = Array.from({length: n}, (_, i) => i);
         steps.push({ type: 'sorted', indices: sortedIndices, description: "تم الفرز بنجاح!" });
         setConsoleOutput({ type: 'success', text: "تمت المحاكاة بنجاح! الكود صحيح 100%." });
      } else {
         setConsoleOutput({ type: 'error', text: "انتهت المحاكاة ولكن المصفوفة ليست مرتبة بشكل صحيح. تأكد من المنطق." });
      }

      // Play Steps
      setIsCompiling(false);
      if (visualizerRef.current) {
        visualizerRef.current.play(steps);
      }

    } catch (e: any) {
      setIsCompiling(false);
      setConsoleOutput({ type: 'error', text: `Runtime Error: ${e.message}` });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-tajawal flex flex-col overflow-x-hidden">
      
      {/* Language Selector Modal */}
      {showLangSelector && (
        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Settings2 className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">اختر لغة البرمجة</h3>
            <p className="text-slate-400 mb-8">كيف تريد كتابة الحل؟ يمكنك تغيير هذا لاحقاً.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => confirmLanguage('pseudo')}
                className="p-4 rounded-2xl border-2 border-slate-700 hover:border-indigo-500 hover:bg-indigo-900/20 transition-all group"
              >
                <span className="block text-2xl mb-2">📝</span>
                <span className="font-bold text-white group-hover:text-indigo-300">Pseudo</span>
                <span className="block text-xs text-slate-500 mt-1">Pour i de 0 à N...</span>
              </button>
              
              <button 
                onClick={() => confirmLanguage('python')}
                className="p-4 rounded-2xl border-2 border-slate-700 hover:border-emerald-500 hover:bg-emerald-900/20 transition-all group"
              >
                 <span className="block text-2xl mb-2">🐍</span>
                <span className="font-bold text-white group-hover:text-emerald-300">Python</span>
                <span className="block text-xs text-slate-500 mt-1">for i in range(n):</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 shrink-0">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-600/20">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">خوارزمي <span className="text-indigo-400 font-light">| المختبر الذكي</span></h1>
            </div>
          </div>
          
          {currentAlgo !== AlgorithmType.NONE && (
            <div className="flex items-center gap-4">
               {/* Desktop Lang Switch */}
               <div className="hidden md:flex bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                  <button 
                    onClick={() => setLanguage('pseudo')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${language === 'pseudo' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Algo
                  </button>
                  <button 
                    onClick={() => setLanguage('python')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${language === 'python' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Python
                  </button>
               </div>

              <button 
                onClick={() => setCurrentAlgo(AlgorithmType.NONE)}
                className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">الخروج</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        {currentAlgo === AlgorithmType.NONE ? (
          // Landing Selection
          <div className="max-w-4xl mx-auto mt-4 md:mt-10 pb-10 animate-fadeIn">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">ماذا تريد أن تبرمج اليوم؟</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">اختر خوارزمية، أجب على أسئلة التفكير العميق، واكتب الكود الخاص بك ليقوم الذكاء الاصطناعي بتصحيحه وتشغيله.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <button onClick={() => handleAlgoSelect(AlgorithmType.BUBBLE)} className="group relative bg-gradient-to-br from-slate-900 to-slate-800 hover:to-indigo-900/20 border border-slate-800 p-8 rounded-3xl text-right transition-all hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-14 h-14 bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-indigo-500/20">
                  <div className="w-5 h-5 bg-indigo-400 rounded-full shadow-[0_0_20px_rgba(129,140,248,0.6)]"></div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">Tri à Bulle</h3>
                <p className="text-slate-400 text-sm leading-relaxed">الأساس في الترتيب. تعلم كيف تدفع العناصر الكبيرة للأعلى مثل الفقاعات.</p>
              </button>
              
              <button onClick={() => handleAlgoSelect(AlgorithmType.SELECTION)} className="group relative bg-gradient-to-br from-slate-900 to-slate-800 hover:to-emerald-900/20 border border-slate-800 p-8 rounded-3xl text-right transition-all hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/10 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-14 h-14 bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-emerald-500/20">
                  <div className="w-5 h-5 bg-emerald-400 rounded-sm shadow-[0_0_20px_rgba(52,211,153,0.6)]"></div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-emerald-300 transition-colors">Tri par Sélection</h3>
                <p className="text-slate-400 text-sm leading-relaxed">استراتيجية البحث. تعلم كيف تجد العنصر الأنسب وتضعه في مكانه.</p>
              </button>
            </div>
          </div>
        ) : (
          // WORKSPACE
          // Fix Mobile: Use flexible column, ensure Playground doesn't collapse or overlap
          <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-6 lg:h-[calc(100vh-110px)] pb-20 lg:pb-0">
            
            {/* EDITOR COLUMN (Bottom on Mobile, Left on Desktop) */}
            <div className="flex flex-col gap-4 h-full lg:overflow-hidden">
               
               {/* Mobile Language Toggle */}
               <div className="md:hidden bg-slate-900 p-1.5 rounded-xl border border-slate-800 flex gap-2 shrink-0">
                  <button 
                    onClick={() => setLanguage('pseudo')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${language === 'pseudo' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}
                  >
                    Algo
                  </button>
                  <button 
                    onClick={() => setLanguage('python')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${language === 'python' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}
                  >
                    Python
                  </button>
               </div>

              {mode === 'trainer' ? (
                // TRAINER MODE
                <div className="flex-1 min-h-[450px] mb-12 lg:mb-0">
                  <StepTrainer 
                    steps={data?.steps || []} 
                    algoType={currentAlgo} 
                    language={language}
                    onComplete={handleTrainerComplete}
                  />
                </div>
              ) : (
                // PLAYGROUND MODE
                <div className="flex flex-col h-[600px] lg:h-full bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative z-10">
                  {/* Editor Toolbar */}
                  <div className="bg-slate-950/50 px-4 py-3 flex justify-between items-center border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-2 text-indigo-300">
                      <Code className="w-4 h-4" />
                      <span className="font-mono text-sm font-bold tracking-wider">
                        {language === 'python' ? 'main.py' : 'algorithme.txt'}
                      </span>
                    </div>
                    <button 
                      onClick={handleRunSimulation}
                      disabled={isCompiling}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-900/20"
                    >
                      {isCompiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                      <span>تشغيل</span>
                    </button>
                  </div>
                  
                  {/* Code Editor Area */}
                  <div className="relative flex-1 bg-slate-950">
                     <textarea 
                       value={code}
                       onChange={(e) => setCode(e.target.value)}
                       className="w-full h-full bg-transparent p-5 font-mono text-sm md:text-base text-slate-300 resize-none focus:outline-none leading-relaxed"
                       spellCheck="false"
                       dir="ltr"
                       placeholder={language === 'python' ? "# اكتب كود بايثون هنا..." : "// اكتب الخوارزمية هنا..."}
                     />
                  </div>

                  {/* Console Output Area */}
                  <div className={`border-t border-slate-800 bg-slate-950 p-4 font-mono text-xs md:text-sm shrink-0 transition-all duration-300 ${consoleOutput ? 'h-32 md:h-40' : 'h-12'}`}>
                    {!consoleOutput ? (
                      <div className="flex items-center gap-2 text-slate-600 h-full">
                         <Terminal className="w-4 h-4" />
                         <span>Console ready...</span>
                      </div>
                    ) : (
                      <div className={`flex items-start gap-3 h-full overflow-y-auto ${
                        consoleOutput.type === 'error' ? 'text-red-400' : 
                        consoleOutput.type === 'success' ? 'text-emerald-400' : 'text-blue-400'
                      }`}>
                        <div className="mt-0.5 shrink-0">
                          {consoleOutput.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </div>
                        <span className="whitespace-pre-wrap leading-relaxed">{consoleOutput.text}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* VISUALIZER COLUMN (Top on Mobile, Right on Desktop) */}
            <div className="flex flex-col h-auto shrink-0 lg:h-full relative z-0">
              <div className="lg:flex-1 h-[420px] lg:h-auto w-full sticky top-20 lg:static">
                <Visualizer ref={visualizerRef} />
              </div>
              
              {/* Tip Box (Desktop Only) */}
              <div className="mt-4 p-5 bg-slate-900/50 border border-slate-800 rounded-xl hidden lg:block shrink-0 backdrop-blur-sm">
                <h4 className="font-bold text-slate-300 mb-2 text-sm flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  كيف يعمل هذا؟
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  هذا ليس مجرد محرر نصوص. الكود الخاص بك يتم تحويله إلى تعليمات برمجية حقيقية (JavaScript) وتشغيله داخل المتصفح مباشرة لضمان دقة وسرعة المحاكاة. إذا كان المنطق صحيحاً، سترى النتيجة فوراً!
                </p>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default App;
