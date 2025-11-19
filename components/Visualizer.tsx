
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { SimulationStep } from '../types';
import { RotateCcw } from 'lucide-react';

export interface VisualizerRef {
  play: (steps: SimulationStep[]) => void;
  reset: () => void;
  getCurrentArray: () => number[];
}

interface VisualizerProps {
  // No internal sorting logic anymore
}

const ARRAY_SIZE = 10;
const MIN_VAL = 10;
const MAX_VAL = 100;

export const Visualizer = forwardRef<VisualizerRef, VisualizerProps>((props, ref) => {
  const [array, setArray] = useState<number[]>([]);
  const [highlights, setHighlights] = useState<number[]>([]); // Compare
  const [swaps, setSwaps] = useState<number[]>([]); // Swap
  const [sorted, setSorted] = useState<number[]>([]); // Finalized
  const [message, setMessage] = useState("في انتظار الكود...");

  // Execution ID to handle race conditions and stopping old loops
  const executionId = useRef(0);

  // Generate random array on mount
  useEffect(() => {
    resetArray();
  }, []);

  const resetArray = () => {
    executionId.current++; // Invalidate any running loop
    const newArr = Array.from({ length: ARRAY_SIZE }, () => Math.floor(Math.random() * (MAX_VAL - MIN_VAL + 1) + MIN_VAL));
    setArray(newArr);
    setHighlights([]);
    setSwaps([]);
    setSorted([]);
    setMessage("في انتظار الكود...");
    return newArr;
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useImperativeHandle(ref, () => ({
    getCurrentArray: () => array,
    reset: resetArray,
    play: async (steps: SimulationStep[]) => {
      // 1. Increment ID to kill previous runs
      executionId.current++;
      const currentRunId = executionId.current;

      // 2. Reset visual state before starting
      setHighlights([]);
      setSwaps([]);
      setSorted([]);
      
      for (const step of steps) {
        // 3. Check if this loop is still the active one
        if (executionId.current !== currentRunId) return;

        setMessage(step.description || "جارٍ التنفيذ...");

        if (step.type === 'compare') {
          setHighlights(step.indices);
          // Speed up comparisons to make "useless loops" less boring
          await delay(150); 
          if (executionId.current !== currentRunId) return;
          setHighlights([]);
        } 
        else if (step.type === 'swap') {
           setSwaps(step.indices);
           await delay(250);
           if (executionId.current !== currentRunId) return;
           
           setArray(prev => {
             const next = [...prev];
             const [i, j] = step.indices;
             [next[i], next[j]] = [next[j], next[i]];
             return next;
           });
           
           await delay(250);
           if (executionId.current !== currentRunId) return;
           setSwaps([]);
        }
        else if (step.type === 'sorted') {
          // CRITICAL FIX: Clear conflicts and force green
          setHighlights([]);
          setSwaps([]);
          setSorted(prev => {
             // If indices include everything, replace entirely. Otherwise append.
             if (step.indices.length === ARRAY_SIZE) return step.indices;
             return [...prev, ...step.indices];
          });
        }
      }
      
      if (executionId.current === currentRunId) {
        setMessage("اكتملت المحاكاة");
      }
    }
  }));

  const getBarColor = (index: number) => {
    // PRIORITY FIX: Sorted (Green) must be checked FIRST
    if (sorted.includes(index)) return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]';
    if (swaps.includes(index)) return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]';
    if (highlights.includes(index)) return 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]';
    return 'bg-indigo-500/60';
  };

  return (
    <div className="p-4 md:p-6 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center h-full min-h-[350px]">
      <div className="w-full flex justify-between items-center mb-4 shrink-0">
        <h3 className="text-slate-400 font-bold text-xs md:text-sm">{message}</h3>
        <button onClick={resetArray} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex items-end justify-center gap-2 md:gap-3 w-full px-2 md:px-4 pb-2">
        {array.map((val, idx) => (
          <div key={idx} className="flex flex-col items-center w-full max-w-[40px] transition-all duration-300" style={{ order: idx }}>
            <span className="text-[10px] text-slate-500 mb-1 font-mono">{val}</span>
            <div 
              className={`w-full rounded-t-md transition-all duration-300 ${getBarColor(idx)}`}
              style={{ height: `${val * 2.5}px` }}
            ></div>
            <span className="text-[10px] text-slate-600 mt-1 font-mono">{idx}</span>
          </div>
        ))}
      </div>

      <div className="w-full flex justify-center gap-3 md:gap-4 text-[10px] text-slate-500 mt-2 shrink-0">
        <span className="flex items-center gap-1 shrink-0"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> مقارنة</span>
        <span className="flex items-center gap-1 shrink-0"><span className="w-2 h-2 rounded-full bg-red-500"></span> تبديل</span>
        <span className="flex items-center gap-1 shrink-0"><span className="w-2 h-2 rounded-full bg-green-500"></span> تم الفرز</span>
      </div>
    </div>
  );
});
Visualizer.displayName = 'Visualizer';
