"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Trash2, Brain, CheckCircle2, Circle, ListTodo } from 'lucide-react';

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
  const [agentResponse, setAgentResponse] = useState('Hello! I am your AI assistant. Tap the microphone to talk.');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initial fetch of data
    fetch('/api/init')
      .then(res => res.json())
      .then(data => {
        setTodos(data.todos || []);
        setMemories(data.memories || []);
      })
      .catch(console.error);

    // Initialize Speech Recognition
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
          // When listening ends, process the transcript if it's not empty
          const finalTranscript = useTranscriptRef.current;
          if (finalTranscript.trim()) {
            handleProcess(finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };
      } else {
        console.warn("Speech Recognition not supported in this browser.");
      }
    }
  }, []);

  const useTranscriptRef = useRef(transcript);
  useEffect(() => {
    useTranscriptRef.current = transcript;
  }, [transcript]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsListening(true);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  };

  const handleProcess = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
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
          setAgentResponse("I am currently experiencing high traffic or hit an API limit. Please wait a minute and try again.");
          speakText("I am currently experiencing high traffic. Please wait a minute and try again.");
        } else {
          setAgentResponse("I encountered an error.");
        }
      } else {
        setAgentResponse(data.text);
        if (data.todos) setTodos(data.todos);
        if (data.memories) setMemories(data.memories);
        
        setChatHistory([
          ...newHistory,
          { role: 'model', parts: [{ text: data.text }] }
        ]);

        speakText(data.text);
      }
    } catch (error) {
      console.error(error);
      setAgentResponse("Sorry, I couldn't reach the server.");
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a good female voice or Google voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Female'));
      if (preferredVoice) utterance.voice = preferredVoice;
      
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-indigo-500/30 overflow-hidden flex flex-col md:flex-row">
      
      {/* Main Center Area */}
      <main className="flex-1 flex flex-col relative z-10">
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
          
          {/* Ambient Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

          {/* AI Orb Avatar */}
          <motion.div 
            className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center cursor-pointer mb-12"
            onClick={toggleListening}
            animate={{ 
              scale: isListening ? 1.05 : 1,
            }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            {/* Outer animated rings */}
            <AnimatePresence>
              {(isListening || isProcessing) && (
                <>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-indigo-500 blur-xl"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0.2, 0.6, 0.2], scale: [0.9, 1.4, 0.9] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                    className="absolute inset-0 rounded-full bg-purple-500 blur-2xl"
                  />
                </>
              )}
            </AnimatePresence>
            
            {/* Core Orb */}
            <div className={`relative z-10 w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br transition-all duration-700 shadow-[0_0_40px_rgba(99,102,241,0.4)] flex items-center justify-center
              ${isListening ? 'from-indigo-400 via-purple-500 to-pink-500' : isProcessing ? 'from-cyan-400 via-blue-500 to-indigo-600' : 'from-slate-700 via-slate-800 to-slate-900 border border-slate-700'}`}>
              
              {isListening ? (
                <Mic className="w-12 h-12 text-white/90 drop-shadow-md" />
              ) : isProcessing ? (
                <div className="flex gap-2">
                  <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-3 h-3 bg-white rounded-full" />
                  <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-3 h-3 bg-white rounded-full" />
                  <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-3 h-3 bg-white rounded-full" />
                </div>
              ) : (
                <MicOff className="w-10 h-10 text-white/50" />
              )}
            </div>
          </motion.div>

          {/* Transcript / Response Text */}
          <div className="max-w-2xl w-full text-center min-h-[120px] px-6 z-20">
            <AnimatePresence mode="wait">
              {transcript ? (
                <motion.p
                  key="transcript"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-2xl md:text-4xl font-light text-white/80 leading-relaxed tracking-wide"
                >
                  "{transcript}"
                </motion.p>
              ) : (
                <motion.p
                  key="response"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-xl md:text-3xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-purple-200 leading-relaxed"
                >
                  {agentResponse}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          
          <div className="absolute bottom-8 text-sm text-neutral-500 tracking-widest uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Voice Assistant Active
          </div>
        </div>
      </main>

      {/* Sidebars Container (Stacked on mobile, side-by-side split on desktop) */}
      <aside className="w-full md:w-[400px] flex flex-col md:h-screen border-l border-white/10 bg-black/40 backdrop-blur-xl z-20 overflow-y-auto shrink-0">
        
        {/* To-Do List Section */}
        <div className="flex-1 p-6 border-b border-white/10 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <ListTodo className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-white/90">Tasks</h2>
            <span className="ml-auto text-xs font-medium bg-white/10 px-2 py-1 rounded-full text-white/60">
              {todos.filter(t => t.status === 'pending').length} pending
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence>
              {todos.length === 0 ? (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-neutral-500 text-sm text-center mt-10">
                  No tasks currently. Ask the agent to add some!
                </motion.p>
              ) : (
                todos.map(todo => (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`p-4 rounded-xl border transition-colors flex gap-3 ${
                      todo.status === 'completed' 
                        ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-100/50' 
                        : 'bg-white/5 border-white/10 hover:border-indigo-500/50 text-white/90'
                    }`}
                  >
                    {todo.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm leading-relaxed ${todo.status === 'completed' && 'line-through decoration-emerald-900/50'}`}>
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
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
              <Brain className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-white/90">Memory Bank</h2>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence>
              {memories.length === 0 ? (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-neutral-500 text-sm text-center mt-10">
                  No memories saved. Tell the agent facts to remember!
                </motion.p>
              ) : (
                memories.map(memory => (
                  <motion.div
                    key={memory.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-4 rounded-xl bg-purple-950/10 border border-purple-900/30"
                  >
                    <p className="text-sm text-purple-100/80 leading-relaxed mb-2">"{memory.content}"</p>
                    <span className="text-[10px] text-purple-300/30 uppercase tracking-wider font-medium">
                      {new Date(memory.timestamp).toLocaleDateString()}
                    </span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>
      
      {/* Global styles for custom scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
