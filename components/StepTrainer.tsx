
import React, { useState, useEffect, useRef } from 'react';
import { ConsciousnessStep, AlgorithmType, CodeLanguage } from '../types';
import { validateSnippet, getStepSolution } from '../services/gemini';
import { CheckCircle, AlertCircle, Loader2, ArrowRight, Code2, Lightbulb, Timer, AlertTriangle } from 'lucide-react';

interface StepTrainerProps {
  steps: ConsciousnessStep[];
  algoType: AlgorithmType;
  language: CodeLanguage;
  starterCode?: string; // Add starter code prop
  onComplete: (finalCode: string) => void;
}

export const StepTrainer: React.FC<StepTrainerProps> = ({ steps, algoType, language, starterCode, onComplete }) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [input, setInput] = useState(starterCode || ''); // Initialize with starter code if available
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isGettingSolution, setIsGettingSolution] = useState(false);
  
  // Solution & Attempts State
  const [failedAttempts, setFailedAttempts] = useState<Set<string>>(new Set());
  const [solutionMode, setSolutionMode] = useState<{active: boolean, timeLeft: number}>({ active: false, timeLeft: 0 });
  const [userDraft, setUserDraft] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep = steps[currentStepIdx];

  // Update input if language changes (optional, but good if starterCode changes)
  useEffect(() => {
    if (currentStepIdx === 0 && !input.trim()) {
        setInput(starterCode || '');
    }
  }, [starterCode, language]);

  useEffect(() => {
    if (solutionMode.active && solutionMode.timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setSolutionMode(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (solutionMode.active && solutionMode.timeLeft === 0) {
      setInput(userDraft);
      setSolutionMode({ active: false, timeLeft: 0 });
      setFeedback(null);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [solutionMode, userDraft]);

  // Syntax Guard Function
  const checkSyntaxMismatch = (snippet: string): string | null => {
    const pyIndicators = [/\bdef\b/, /\brange\b/, /:\s*$/m, /#.*$/m];
    const pseudoIndicators = [/\bPour\b/i, /\bFin\b/i, /\bSi\b/i, /\bAlors\b/i, /\bDébut\b/i];

    if (language === 'python') {
      if (pseudoIndicators.some(r => r.test(snippet))) {
        return "تنبيه: أنت اخترت وضع Python لكنك تستخدم كلمات Pseudo-code (مثل Pour/Si). هذا غير مسموح!";
      }
    } else {
      if (pyIndicators.some(r => r.test(snippet))) {
        return "تنبيه: أنت اخترت وضع Algo لكنك تستخدم صيغة Python. التزم بالخوارزمية (Pour/Si)!";
      }
    }
    return null;
  };

  const handleValidate = async () => {
    if (!input.trim()) return;

    // 1. Check Syntax Guard First
    const syntaxWarning = checkSyntaxMismatch(input);
    if (syntaxWarning) {
      setFeedback({ type: 'warning', text: syntaxWarning });
      return; // Do NOT increment failed attempts
    }

    setIsValidating(true);
    setFeedback(null);

    // 2. Validate Logic with AI
    const result = await validateSnippet(input, currentStep.expectedConcept, algoType, language);

    setIsValidating(false);
    if (result.isValid) {
      setFeedback({ type: 'success', text: result.feedback || "إجابة صحيحة! أكمل البناء." });
    } else {
      setFeedback({ type: 'error', text: result.feedback });
      // Only increment failure for LOGIC errors, not syntax mismatch
      setFailedAttempts(prev => new Set(prev).add(input.trim()));
    }
  };

  const handleRequestSolution = async () => {
    setUserDraft(input);
    setIsGettingSolution(true);
    
    // We ask for the solution to append to the current input if possible, or just the snippet
    const solutionSnippet = await getStepSolution(
        currentStep.expectedConcept, 
        algoType, 
        language, 
        currentStep.hint
    );
    
    setIsGettingSolution(false);
    // In builder mode, we might want to show the snippet inserted? 
    // For simplicity, let's just show the snippet and let user copy/integrate or replace.
    // But the user requested "Show Solution" behavior.
    // Let's append it if it looks like a block, or replace if empty.
    // Actually, the safest is to show the specific snippet requested.
    setInput(prev => prev + "\n" + solutionSnippet);
    
    setSolutionMode({ active: true, timeLeft: 30 });
    setFeedback({ type: 'success', text: "تم إضافة الحل المقترح للكود. سيختفي بعد 30 ثانية!" });
  };

  const handleNext = () => {
    setFeedback(null);
    // DO NOT CLEAR INPUT - PERSIST CODE FOR NEXT STEP
    // setInput(''); 
    setFailedAttempts(new Set());
    setSolutionMode({ active: false, timeLeft: 0 });
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    } else {
      onComplete(input); // Pass the final built code
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-full min-h-[450px] relative overflow-hidden shadow-xl">
      {/* Timer Overlay */}
      {solutionMode.active && (
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-800 z-30">
          <div 
            className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
            style={{ width: `${(solutionMode.timeLeft / 30) * 100}%` }}
          ></div>
        </div>
      )}

      {/* FIXED HEADER */}
      <div className="p-5 border-b border-slate-800 shrink-0 bg-slate-900 z-10">
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="flex items-center gap-2 text-xs md:text-sm text-slate-400">
            <span className="bg-slate-800 px-2 py-0.5 rounded font-mono text-indigo-400 font-bold">
              {currentStepIdx + 1} / {steps.length}
            </span>
            <span className="uppercase tracking-wider text-[10px] md:text-xs">Code Builder</span>
          </div>
          
          {solutionMode.active && (
             <div className="flex items-center gap-2 text-amber-400 font-mono bg-amber-900/20 px-2 py-1 rounded-lg animate-pulse shrink-0">
               <Timer className="w-4 h-4" />
               <span className="text-sm font-bold">{solutionMode.timeLeft}s</span>
             </div>
          )}
        </div>
        <h3 className="text-lg md:text-xl font-bold text-white leading-tight">
          {currentStep.question}
        </h3>
      </div>

      {/* SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-950/30">
        {/* Hint Block */}
        <div className="text-slate-400 text-sm bg-slate-900/80 p-3 rounded-lg border-r-2 border-indigo-500 flex gap-2">
          <Lightbulb className="w-5 h-5 text-indigo-400 shrink-0" />
          <p className="leading-relaxed">{currentStep.hint}</p>
        </div>

        {/* Editor Container */}
        <div className="relative group min-h-[250px] flex flex-col">
          <div className="absolute top-2 right-2 text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800 pointer-events-none z-10 font-mono shadow-sm">
             {language === 'python' ? 'Python Mode' : 'Pseudo Mode'}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={solutionMode.active}
            placeholder={language === 'python' ? "# ابدأ بكتابة الكود هنا..." : "// ابدأ بكتابة الكود هنا..."}
            className={`w-full flex-1 min-h-[250px] bg-slate-950 border rounded-xl p-4 font-mono text-sm md:text-base text-indigo-100 focus:outline-none resize-y transition-all leading-relaxed ${
              solutionMode.active 
                ? 'border-amber-500/50 opacity-90 cursor-not-allowed bg-amber-900/5' 
                : 'border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50'
            } ${feedback?.type === 'warning' ? 'border-amber-500' : ''}`}
            dir="ltr"
            spellCheck="false"
          />
        </div>

        {/* Feedback Block */}
        {feedback && (
          <div className={`p-3 rounded-xl text-sm flex items-start gap-3 animate-fadeIn shrink-0 ${
            feedback.type === 'success' ? 'bg-emerald-900/20 border border-emerald-500/20 text-emerald-200' : 
            feedback.type === 'warning' ? 'bg-amber-900/20 border border-amber-500/20 text-amber-200' :
            'bg-red-900/20 border border-red-500/20 text-red-200'
          }`}>
            <div className="mt-0.5 shrink-0">
              {feedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : 
               feedback.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
               <AlertCircle className="w-5 h-5" />}
            </div>
            <p className="leading-relaxed">{feedback.text}</p>
          </div>
        )}
      </div>

      {/* FIXED FOOTER */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0 z-10">
        <div className="flex flex-col sm:flex-row gap-3">
          {feedback?.type === 'success' && !solutionMode.active ? (
             <button
             onClick={handleNext}
             className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:translate-y-[-2px] shadow-lg shadow-emerald-600/20"
           >
             <span>{currentStepIdx === steps.length - 1 ? 'إنهاء والذهاب للمختبر' : 'الخطوة التالية (احتفظ بالكود)'}</span>
             <ArrowRight className="w-5 h-5" />
           </button>
          ) : (
            <>
              <button
                onClick={handleValidate}
                disabled={isValidating || solutionMode.active || !input.trim()}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-indigo-600/20"
              >
                {isValidating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Code2 className="w-5 h-5" />}
                <span>تحقق من الخطوة الحالية</span>
              </button>
              
              {!solutionMode.active && (
                <button
                  onClick={handleRequestSolution}
                  disabled={failedAttempts.size < 3 || isGettingSolution}
                  className={`flex-1 border font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    failedAttempts.size >= 3 
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 hover:bg-amber-500 hover:text-white' 
                      : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                   {isGettingSolution ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lightbulb className="w-5 h-5" />}
                   <span className="hidden sm:inline">الحل</span>
                   {failedAttempts.size < 3 && <span className="text-xs font-mono bg-slate-700 px-1.5 rounded opacity-70">{failedAttempts.size}/3</span>}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
