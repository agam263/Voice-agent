"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, CheckCircle2, Circle, ListTodo, Brain, Plus, Zap, RefreshCw, Activity, Loader2 } from 'lucide-react';

interface Todo {
  id: string;
  task: string;
  status: 'pending' | 'completed';
}

interface Memory {
  id: string;
  content: string;
  timestamp: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [agentResponse, setAgentResponse] = useState('How can I help you today?');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  
  // Status and Error handling
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'error'>('idle');
  const [countdown, setCountdown] = useState(0);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetch('/api/init')
      .then(res => res.json())
      .then(data => {
        setTodos(data.todos || []);
        setMemories(data.memories || []);
      })
      .catch(console.error);

    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          const finalTranscript = useTranscriptRef.current;
          if (finalTranscript.trim()) {
            handleProcess(finalTranscript);
          } else {
             if (status !== 'error') setStatus('idle');
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
          if (status !== 'error') setStatus('idle');
        };
      }
    }
  }, []);

  const useTranscriptRef = useRef(transcript);
  useEffect(() => {
    useTranscriptRef.current = transcript;
  }, [transcript]);

  // Handle countdown timer for errors
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'error' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (status === 'error' && countdown === 0) {
      setStatus('idle');
      setAgentResponse("I'm back online and ready.");
    }
    return () => clearTimeout(timer);
  }, [countdown, status]);

  const toggleListening = () => {
    if (status === 'error') return; // Disable while in error cooldown
    
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      setStatus('listening');
      recognitionRef.current?.start();
      setIsListening(true);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  };

  const handleProcess = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setStatus('processing');
    setTranscript('');

    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', parts: [{ text }] }];

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: chatHistory }),
      });
      const data = await res.json();
      
      if (data.error) {
        if (data.error.includes("429") || data.error.includes("Too Many Requests") || data.error.toLowerCase().includes("quota")) {
          setStatus('error');
          setCountdown(12);
        } else {
          setAgentResponse("I encountered an unexpected error.");
          setStatus('idle');
        }
      } else {
        setAgentResponse(data.text);
        if (data.todos) setTodos(data.todos);
        if (data.memories) setMemories(data.memories);
        setChatHistory([...newHistory, { role: 'model', parts: [{ text: data.text }] }]);
        speakText(data.text);
        setStatus('idle');
      }
    } catch (error) {
      console.error(error);
      setAgentResponse("Network disconnected. Couldn't reach the server.");
      setStatus('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Female'));
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Particles state to prevent SSR hydration mismatch
  const [particles, setParticles] = useState<{id: number, size: number, x: number, y: number, duration: number, delay: number}[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        size: Math.random() * 4 + 1,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: Math.random() * 20 + 10,
        delay: Math.random() * 5
      }))
    );
  }, []);

  return (
    <div className="min-h-screen bg-[#030308] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden flex flex-col md:flex-row relative">
      
      {/* Deep Space Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#110B29] via-[#030308] to-black z-0" />
      
      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-indigo-400/20 blur-[1px]"
            style={{ width: p.size, height: p.size, top: `${p.y}%`, left: `${p.x}%` }}
            animate={{
              y: [0, -100, 0],
              x: [0, Math.random() * 50 - 25, 0],
              opacity: [0.1, 0.5, 0.1],
            }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </div>

      {/* Main Center Area */}
      <main className="flex-1 flex flex-col relative z-10 items-center justify-center p-6 md:p-12">
        
        {/* Top System Status Bar */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-md shadow-2xl">
          <div className="relative flex h-2.5 w-2.5">
            {status === 'listening' ? (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            ) : status === 'processing' ? (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            ) : status === 'error' ? (
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500"></span>
            ) : null}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              status === 'listening' ? 'bg-pink-500' : 
              status === 'processing' ? 'bg-cyan-500' : 
              status === 'error' ? 'bg-red-500' : 'bg-emerald-500'
            }`}></span>
          </div>
          <span className="text-xs font-medium tracking-wide text-white/70 uppercase">
            {status === 'error' ? 'System Busy' : `System ${status}`}
          </span>
        </div>

        {/* AI Orb Avatar */}
        <div className="relative flex flex-col items-center justify-center w-full max-w-3xl">
          
          {/* Ambient Glow behind Orb */}
          <motion.div 
            animate={{ 
              scale: status === 'listening' ? [1, 1.2, 1] : status === 'processing' ? [1, 1.1, 1] : 1,
              opacity: status === 'idle' ? 0.3 : 0.6
            }}
            transition={{ duration: status === 'listening' ? 2 : 3, repeat: Infinity }}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full blur-[100px] pointer-events-none transition-colors duration-1000 ${
              status === 'error' ? 'bg-red-600/20' :
              status === 'listening' ? 'bg-pink-600/30' :
              status === 'processing' ? 'bg-cyan-600/30' : 'bg-indigo-600/20'
            }`} 
          />

          {/* Error / System Status Card */}
          <AnimatePresence>
            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="absolute -top-32 w-full max-w-md bg-white/[0.03] border border-white/10 p-6 rounded-2xl backdrop-blur-xl shadow-[0_0_50px_rgba(220,38,38,0.15)] flex flex-col items-center text-center overflow-hidden"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer-animation pointer-events-none" />
                
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                  <Zap className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2 tracking-tight">⚡ I'm a bit busy right now</h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">High traffic detected — taking a quick breather to process everything smoothly.</p>
                
                <div className="flex items-center gap-2 text-xs font-medium text-red-300 bg-red-500/10 px-4 py-2 rounded-full">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Retrying automatically in {countdown}s
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button 
            onClick={toggleListening}
            disabled={status === 'error'}
            className="relative z-10 w-40 h-40 md:w-48 md:h-48 rounded-full outline-none focus:outline-none group my-12"
            animate={{ scale: status === 'listening' ? 1.05 : 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            {/* Outer rings */}
            <AnimatePresence>
              {(status === 'listening' || status === 'processing') && (
                <>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 0.5, 0], scale: [1, 1.4, 1] }}
                    transition={{ duration: status === 'listening' ? 2 : 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className={`absolute inset-0 rounded-full blur-xl ${status === 'listening' ? 'bg-pink-500/40' : 'bg-cyan-500/40'}`}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 0.3, 0], scale: [0.9, 1.6, 0.9] }}
                    transition={{ duration: status === 'listening' ? 2.5 : 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                    className={`absolute inset-0 rounded-full blur-2xl ${status === 'listening' ? 'bg-purple-500/30' : 'bg-blue-500/30'}`}
                  />
                </>
              )}
            </AnimatePresence>
            
            {/* Inner Glass Orb */}
            <div className={`relative w-full h-full rounded-full transition-all duration-700 flex items-center justify-center overflow-hidden
              ${status === 'listening' ? 'bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 shadow-[0_0_60px_rgba(236,72,153,0.4)] border-transparent' : 
                status === 'processing' ? 'bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 shadow-[0_0_60px_rgba(6,182,212,0.4)] border-transparent' : 
                status === 'error' ? 'bg-gradient-to-br from-red-900/40 to-black border border-red-500/30 shadow-[0_0_30px_rgba(220,38,38,0.2)]' :
                'bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-xl group-hover:border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.05)]'}`}>
              
              {/* Glass Reflection */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50 rounded-full pointer-events-none" />

              {status === 'listening' ? (
                <Mic className="w-14 h-14 text-white drop-shadow-lg z-10" />
              ) : status === 'processing' ? (
                <div className="flex gap-2 z-10">
                  <motion.div animate={{ y: [0, -12, 0], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} className="w-3.5 h-3.5 bg-white rounded-full shadow-lg" />
                  <motion.div animate={{ y: [0, -12, 0], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.15 }} className="w-3.5 h-3.5 bg-white rounded-full shadow-lg" />
                  <motion.div animate={{ y: [0, -12, 0], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.3 }} className="w-3.5 h-3.5 bg-white rounded-full shadow-lg" />
                </div>
              ) : status === 'error' ? (
                <Loader2 className="w-12 h-12 text-red-400/50 z-10" />
              ) : (
                <MicOff className="w-12 h-12 text-white/40 group-hover:text-white/80 transition-colors z-10" />
              )}
            </div>
          </motion.button>

          {/* Transcript / Response Text */}
          <div className="w-full text-center px-4 h-32 flex items-center justify-center relative z-20">
            <AnimatePresence mode="wait">
              {transcript ? (
                <motion.p
                  key="transcript"
                  initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  exit={{ opacity: 0, filter: 'blur(10px)', y: -10 }}
                  className="text-2xl md:text-4xl font-light text-white/90 leading-tight tracking-tight"
                >
                  "{transcript}"
                </motion.p>
              ) : (
                <motion.p
                  key="response"
                  initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  exit={{ opacity: 0, filter: 'blur(10px)', y: -10 }}
                  className={`text-xl md:text-3xl font-medium leading-tight tracking-tight ${
                    status === 'error' ? 'text-red-400/80' : 'text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-white to-slate-400'
                  }`}
                >
                  {status === 'error' ? 'Reconnecting to neural network...' : agentResponse}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Sidebars Container (Stacked on mobile, split on desktop) */}
      <aside className="w-full md:w-[420px] flex flex-col md:h-screen border-l border-white/5 bg-black/20 backdrop-blur-2xl z-20 shrink-0">
        
        {/* To-Do List Section */}
        <div className="flex-1 p-6 border-b border-white/5 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                <ListTodo className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-100 tracking-tight">Active Tasks</h2>
            </div>
            
            <button className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white group">
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence>
              {todos.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4 opacity-50">
                  <CheckCircle2 className="w-12 h-12 stroke-[1]" />
                  <p className="text-sm font-medium">No tasks right now.</p>
                </motion.div>
              ) : (
                todos.map(todo => (
                  <motion.div
                    key={todo.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 rounded-2xl border backdrop-blur-sm transition-all flex gap-3 group items-start ${
                      todo.status === 'completed' 
                        ? 'bg-emerald-950/10 border-emerald-900/20 text-emerald-100/40' 
                        : 'bg-white/[0.02] border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.04] text-slate-200 shadow-sm'
                    }`}
                  >
                    {todo.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500/50 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 shrink-0 mt-0.5 transition-colors" />
                    )}
                    <span className={`text-sm leading-relaxed tracking-wide ${todo.status === 'completed' && 'line-through decoration-emerald-900/30'}`}>
                      {todo.task}
                    </span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Memory Section */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
              <Brain className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-100 tracking-tight">Memory Bank</h2>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence>
              {memories.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4 opacity-50">
                  <Activity className="w-12 h-12 stroke-[1]" />
                  <p className="text-sm font-medium">Memory is empty.</p>
                </motion.div>
              ) : (
                memories.map(memory => (
                  <motion.div
                    key={memory.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 rounded-2xl bg-purple-950/10 border border-purple-900/20 hover:border-purple-500/30 hover:bg-purple-900/10 transition-colors backdrop-blur-sm"
                  >
                    <p className="text-sm text-purple-100/90 leading-relaxed tracking-wide mb-3">"{memory.content}"</p>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-purple-500/50" />
                      <span className="text-[10px] text-purple-300/40 uppercase tracking-widest font-semibold">
                        {new Date(memory.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>
      
      {/* Global styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        .shimmer-animation {
          animation: shimmer 2.5s infinite;
        }
      `}</style>
    </div>
  );
}
