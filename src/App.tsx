/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Trophy, Timer, Settings, X, Check } from 'lucide-react';
import { QUESTIONS, GAME_SPEEDS, Difficulty, Question } from './constants';

interface FallingAnswer {
  id: string;
  questionId: string;
  optionIndex: number;
  text: string;
  y: number;
  lane: number;
}

interface ShuffledOption {
  text: string;
  originalIndex: number;
}

const READING_TIME = 5000; // 5 seconds to read
const TARGET_Y = 80; // The "sweet spot" is at 80% of the screen

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'results'>('menu');
  const [gamePhase, setGamePhase] = useState<'reading' | 'falling'>('reading');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentOptions, setCurrentOptions] = useState<ShuffledOption[]>([]);
  const [score, setScore] = useState(0);
  const [incorrectScore, setIncorrectScore] = useState(0);
  const [totalActiveTime, setTotalActiveTime] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [penaltyTime, setPenaltyTime] = useState(0);
  const [phaseStartTime, setPhaseStartTime] = useState(0);
  const [records, setRecords] = useState<Record<Difficulty, number>>({
    EASY: 0,
    MEDIUM: 0,
    HARD: 0,
  });

  const [fallingAnswers, setFallingAnswers] = useState<FallingAnswer[]>([]);
  const requestRef = useRef<number>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameActive = useRef(false);

  // Keyboard mapping
  const laneKeys = ['a', 's', 'd', 'f'];

  useEffect(() => {
    const savedRecords = localStorage.getItem('quiz-hero-records');
    if (savedRecords) {
      setRecords(JSON.parse(savedRecords));
    }
  }, []);

  const saveRecord = useCallback((diff: Difficulty, time: number) => {
    setRecords(prev => {
      const newRecords = { ...prev };
      if (prev[diff] === 0 || time < prev[diff]) {
        newRecords[diff] = time;
        localStorage.setItem('quiz-hero-records', JSON.stringify(newRecords));
      }
      return newRecords;
    });
  }, []);

  const handleGameEnd = useCallback((currentAccumulatedTime: number, currentPenalty: number) => {
    gameActive.current = false;
    const duration = currentAccumulatedTime + currentPenalty;
    setFinalTime(duration);
    saveRecord(difficulty, duration);
    setGameState('results');
  }, [difficulty, saveRecord]);

  const startQuestion = useCallback((index: number, accumulatedTime: number, penalty: number) => {
    if (index >= QUESTIONS.length) {
      handleGameEnd(accumulatedTime, penalty);
      return;
    }
    
    // Shuffle options for the current question
    const q = QUESTIONS[index];
    const shuffled = shuffleArray(q.options.map((opt, idx) => ({ 
      text: opt, 
      originalIndex: idx 
    })));
    
    setCurrentOptions(shuffled);
    setCurrentQuestionIndex(index);
    setGamePhase('reading');
    setPhaseStartTime(Date.now());
    setFallingAnswers([]);
  }, [handleGameEnd]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setIncorrectScore(0);
    setPenaltyTime(0);
    setTotalActiveTime(0);
    gameActive.current = true;
    startQuestion(0, 0, 0);
  };

  const checkAnswer = (optionIndex: number) => {
    const now = Date.now();
    const elapsedInFalling = (now - phaseStartTime) / 1000;
    const newAccumulatedTime = totalActiveTime + elapsedInFalling;
    const currentQuestion = QUESTIONS[currentQuestionIndex];
    
    let newScore = score;
    let newIncorrect = incorrectScore;
    let newPenalty = penaltyTime;

    if (optionIndex === currentQuestion.correctIndex) {
      newScore = score + 1;
      setScore(newScore);
    } else {
      newIncorrect = incorrectScore + 1;
      newPenalty = penaltyTime + 10;
      setIncorrectScore(newIncorrect);
      setPenaltyTime(newPenalty);
    }
    
    setTotalActiveTime(newAccumulatedTime);
    startQuestion(currentQuestionIndex + 1, newAccumulatedTime, newPenalty);
  };

  const update = useCallback(() => {
    if (!gameActive.current) return;

    const now = Date.now();
    const elapsedInPhase = now - phaseStartTime;

    if (gamePhase === 'reading') {
      if (elapsedInPhase >= READING_TIME) {
        setGamePhase('falling');
        setPhaseStartTime(now);
        // Initial spawn using shuffled options
        const q = QUESTIONS[currentQuestionIndex];
        const newAnswers: FallingAnswer[] = currentOptions.map((opt, idx) => ({
          id: Math.random().toString(36).substr(2, 9),
          questionId: q.id,
          optionIndex: opt.originalIndex,
          text: opt.text,
          y: -10,
          lane: idx
        }));
        setFallingAnswers(newAnswers);
      }
    } else if (gamePhase === 'falling') {
      // Updated transit times: Easy 10s, Medium 7s, Hard 5s
      let transitTimeMs = 7000; // Medium default
      if (difficulty === 'EASY') transitTimeMs = 10000;
      if (difficulty === 'HARD') transitTimeMs = 5000;

      // Distance to target is TARGET_Y (80%)
      // Current Y should be (elapsed / transitTime) * TARGET_Y
      const currentY = (elapsedInPhase / transitTimeMs) * TARGET_Y;

      setFallingAnswers(prev => {
        const moved = prev.map(ans => ({ ...ans, y: currentY }));
        
        // If correct answer goes too far past TargetY without being clicked
        if (currentY > TARGET_Y + 10) {
          const actualTransitTimeMs = difficulty === 'EASY' ? 10000 : (difficulty === 'HARD' ? 5000 : 7000);
          const elapsed = ((TARGET_Y + 10) / TARGET_Y * actualTransitTimeMs) / 1000;
          
          const nextIndex = currentQuestionIndex + 1;
          const newAccumulated = totalActiveTime + elapsed;
          const newPenalty = penaltyTime + 10;

          setIncorrectScore(s => s + 1);
          setPenaltyTime(newPenalty);
          setTotalActiveTime(newAccumulated);
          startQuestion(nextIndex, newAccumulated, newPenalty);
          return [];
        }

        return moved;
      });
    }

    requestRef.current = requestAnimationFrame(update);
  }, [difficulty, currentQuestionIndex, currentOptions, gamePhase, phaseStartTime, totalActiveTime, penaltyTime, startQuestion]);

  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(update);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, update]);

  // Handle key presses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing' || gamePhase !== 'falling') return;
      const key = e.key.toLowerCase();
      const laneIndex = laneKeys.indexOf(key);
      
      if (laneIndex !== -1) {
        // Can answer anytime while they are falling
        setFallingAnswers(prev => {
          const ans = prev.find(a => a.lane === laneIndex);
          if (ans) {
             checkAnswer(ans.optionIndex);
             return [];
          }
          return prev;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, gamePhase, currentQuestionIndex, fallingAnswers]);

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-blue-100 font-sans selection:bg-blue-500/30">
      <AnimatePresence mode="wait">
        {gameState === 'menu' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen p-6 text-center"
          >
            <motion.h1 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl md:text-8xl font-black mb-8 tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-blue-800"
            >
              QUIZ HERO
            </motion.h1>
            
            <div className="flex flex-col gap-6 w-full max-w-sm">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-blue-500 font-bold">Dificultad</p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(GAME_SPEEDS) as Difficulty[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setDifficulty(key)}
                      className={`py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                        difficulty === key 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-105' 
                        : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
                      }`}
                    >
                      {GAME_SPEEDS[key].label}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="flex items-center justify-center gap-3 bg-blue-500 hover:bg-blue-400 text-black font-black py-4 rounded-2xl shadow-xl transition-colors text-xl"
              >
                <Play fill="currentColor" /> JUGAR AHORA
              </motion.button>

              <div className="pt-8 border-t border-zinc-800">
                <p className="text-xs uppercase tracking-widest text-zinc-600 mb-4">Mejores Tiempos</p>
                <div className="grid grid-cols-1 gap-2 text-left">
                  {(Object.keys(GAME_SPEEDS) as Difficulty[]).map((key) => (
                    <div key={key} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                      <span className="text-sm text-zinc-400 font-medium">{GAME_SPEEDS[key].label}</span>
                      <span className="font-mono text-blue-400">
                        {records[key] > 0 ? `${records[key].toFixed(2)}s` : '--'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-screen overflow-hidden relative"
          >
            {/* Header Info */}
            <div className="fixed top-0 left-0 right-0 p-6 z-20 bg-gradient-to-b from-black to-transparent pointer-events-none">
              <div className="max-w-4xl mx-auto flex flex-col items-center">
                <div className="flex justify-between w-full mb-4">
                  <div className="flex items-center gap-2 bg-blue-900/30 backdrop-blur-md border border-blue-500/20 px-4 py-2 rounded-full">
                    <Timer className="w-4 h-4 text-blue-400" />
                    <span className="font-mono text-lg text-blue-400">
                      {(totalActiveTime + (gamePhase === 'falling' ? (Date.now() - phaseStartTime) / 1000 : 0) + penaltyTime).toFixed(1)}s
                      {penaltyTime > 0 && <span className="text-red-500 text-xs ml-1">+{penaltyTime}s</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-500/20 px-4 py-2 rounded-full">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-lg text-emerald-400">{score}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-red-950/30 border border-red-500/20 px-4 py-2 rounded-full">
                      <X className="w-4 h-4 text-red-400" />
                      <span className="font-bold text-lg text-red-400">{incorrectScore}</span>
                    </div>
                  </div>
                </div>
                
                <motion.div 
                  key={currentQuestionIndex}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 p-6 rounded-2xl w-full text-center shadow-2xl relative overflow-hidden"
                >
                  <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1 italic">Pregunta {currentQuestionIndex + 1}</p>
                  <h2 className="text-xl md:text-3xl font-bold mb-4">{QUESTIONS[currentQuestionIndex].text}</h2>
                  
                  {gamePhase === 'reading' && (
                    <div className="absolute bottom-0 left-0 h-1 bg-blue-500 w-full origin-left">
                      <motion.div 
                        initial={{ scaleX: 1 }}
                        animate={{ scaleX: 0 }}
                        transition={{ duration: READING_TIME / 1000, ease: "linear" }}
                        className="h-full bg-blue-400"
                      />
                    </div>
                  )}
                  {gamePhase === 'reading' && (
                    <p className="text-blue-400 text-[10px] font-bold tracking-widest uppercase">
                      Prepárate... {Math.max(0, Math.ceil((READING_TIME - (Date.now() - phaseStartTime)) / 1000))}s
                    </p>
                  )}
                  {gamePhase === 'falling' && (
                    <p className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase animate-pulse">
                      ¡RESPONDE AHORA!
                    </p>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Game Tracks */}
            <div className="flex-1 flex justify-center relative mt-40">
              <div className="flex w-full max-w-2xl h-full border-x border-zinc-800 bg-zinc-950/50 relative overflow-hidden">
                {/* Visual Lanes */}
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="flex-1 border-r border-zinc-800/30 relative">
                    <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none hover:bg-blue-500/5 transition-colors" />
                    <div className="absolute top-[80%] left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-4 border-zinc-700 pointer-events-none opacity-50" />
                  </div>
                ))}

                {/* Target Zone Line */}
                <div className="absolute top-[80%] inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent pointer-events-none" />

                {/* Falling Answers */}
                {fallingAnswers.map(ans => (
                  <motion.div
                    key={ans.id}
                    className="absolute w-1/4 flex flex-col items-center justify-center p-2 text-center"
                    style={{ 
                      top: `${ans.y}%`, 
                      left: `${ans.lane * 25}%`,
                    }}
                  >
                    <div 
                      className={`
                        w-16 h-16 rounded-full border-4 flex items-center justify-center text-xs font-black shadow-lg
                        ${ans.lane === 0 ? 'border-emerald-500 bg-emerald-950/80' : ''}
                        ${ans.lane === 1 ? 'border-red-500 bg-red-950/80' : ''}
                        ${ans.lane === 2 ? 'border-yellow-500 bg-yellow-950/80' : ''}
                        ${ans.lane === 3 ? 'border-blue-500 bg-blue-950/80' : ''}
                      `}
                    >
                      {laneKeys[ans.lane].toUpperCase()}
                    </div>
                    <div className="bg-black/80 backdrop-blur-sm border border-zinc-700/50 mt-2 p-2 rounded-lg text-[10px] md:text-xs font-bold leading-tight w-24">
                      {ans.text}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Bottom Controls (Mobile Friendly) */}
            <div className="p-8 bg-black flex justify-center gap-4">
              {laneKeys.map((key, i) => (
                <button
                  key={key}
                  onMouseDown={() => {
                    const laneIndex = i;
                    const targetAnswer = fallingAnswers.find(ans => ans.lane === laneIndex);
                    if (targetAnswer) {
                      checkAnswer(targetAnswer.optionIndex);
                      setFallingAnswers([]);
                    }
                  }}
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center text-xl font-black transition-all active:scale-95 shadow-xl
                    ${i === 0 ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400' : ''}
                    ${i === 1 ? 'bg-red-500 text-red-950 hover:bg-red-400' : ''}
                    ${i === 2 ? 'bg-yellow-500 text-yellow-950 hover:bg-yellow-400' : ''}
                    ${i === 3 ? 'bg-blue-500 text-blue-950 hover:bg-blue-400' : ''}
                  `}
                >
                  {key.toUpperCase()}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {gameState === 'results' && (
          <motion.div 
            key="results"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-zinc-950"
          >
            <div className="bg-zinc-900 border border-blue-500/30 p-10 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden">
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
               <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />

              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-4xl font-black text-blue-100 mb-2">RESULTADOS</h2>
              <p className="text-zinc-500 mb-8 font-medium">Resumen de tu partida en {GAME_SPEEDS[difficulty].label}</p>
              
              <div className="grid grid-cols-1 gap-4 mb-8">
                <div className="bg-black/50 p-6 rounded-2xl border border-zinc-800">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Tiempo Total</p>
                  <p className="text-4xl font-mono text-blue-400 font-bold">{finalTime.toFixed(2)}s</p>
                  {penaltyTime > 0 && <p className="text-[10px] text-red-500/80 mt-1">(Incluye {penaltyTime}s de penalización)</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/50 p-4 rounded-2xl border border-emerald-900/30">
                    <p className="text-xs uppercase tracking-widest text-emerald-500 mb-1">Correctas</p>
                    <p className="text-2xl font-bold text-emerald-400">{score}</p>
                  </div>
                  <div className="bg-black/50 p-4 rounded-2xl border border-red-900/30">
                    <p className="text-xs uppercase tracking-widest text-red-500 mb-1">Erróneas</p>
                    <p className="text-2xl font-bold text-red-400">{incorrectScore}</p>
                  </div>
                </div>
              </div>

              {records[difficulty] === finalTime && (
                <motion.div 
                  initial={{ y: 10, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }}
                  className="mb-8 flex items-center justify-center gap-2 text-yellow-400 font-bold"
                >
                  <Trophy className="w-4 h-4" /> ¡NUEVO RECORD PERSONAL!
                </motion.div>
              )}
              
              <div className="space-y-4">
                <button
                  onClick={startGame}
                  className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-black font-black py-4 rounded-2xl transition-colors"
                >
                  <RotateCcw className="w-5 h-5" /> JUGAR DE NUEVO
                </button>
                <button
                  onClick={() => setGameState('menu')}
                  className="w-full text-zinc-500 hover:text-white font-bold text-sm"
                >
                  VOLVER AL MENÚ
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
