'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatSession {
  sessionId: string;
  title: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Speech recognition and synthesis interfaces
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onstart: () => void;
  onend: () => void;
  onnomatch: () => void;
  onspeechstart: () => void;
  onspeechend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function ChatClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showClearMenu, setShowClearMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const clearMenuRef = useRef<HTMLDivElement>(null);

  // Consistent time formatting function
  const formatTime = useCallback((date: Date) => {
    if (!mounted) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [mounted]);

  // Initialize mounted state and load sessions
  useEffect(() => {
    setMounted(true);
    loadAllSessions();
    
    // Check if continuing from symptom checker
    const continueSessionId = localStorage.getItem('continueFromSymptomCheck');
    if (continueSessionId) {
      // Load the symptom check session
      loadChatSession(continueSessionId);
      // Clear the flag
      localStorage.removeItem('continueFromSymptomCheck');
    } else {
      startNewChat();
    }
  }, []);

  // Load all chat sessions
  const loadAllSessions = async () => {
    try {
      const response = await fetch('/api/chat-history');
      if (response.ok) {
        const data = await response.json();
        if (data.sessions) {
          const formattedSessions = data.sessions.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
          }));
          setSessions(formattedSessions);
        }
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  // Start a new chat session
  const startNewChat = () => {
    const newSessionId = `session-${Date.now()}`;
    setSessionId(newSessionId);
    setMessages([{
      id: '1',
      content: 'Hello! I\'m your AI healthcare assistant. How can I help you today? Please note that I provide general health information and should not replace professional medical advice.',
      role: 'assistant',
      timestamp: new Date(),
    }]);
  };

  // Load specific chat session
  const loadChatSession = async (sid: string) => {
    try {
      const response = await fetch(`/api/chat-history?sessionId=${sid}`);
      if (response.ok) {
        const data = await response.json();
        if (data.chatHistory && data.chatHistory.messages && data.chatHistory.messages.length > 0) {
          const loadedMessages = data.chatHistory.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(loadedMessages);
          setSessionId(sid);
        }
      }
    } catch (error) {
      console.error('Failed to load chat session:', error);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    if (status === 'loading') return;
    if (!session) router.push('/auth/signin');
  }, [mounted, session, status, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clearMenuRef.current && !clearMenuRef.current.contains(event.target as Node)) {
        setShowClearMenu(false);
      }
    };

    if (showClearMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClearMenu]);

  // Initialize speech recognition
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      // Check browser compatibility
      const userAgent = navigator.userAgent;
      const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
      const isEdge = /Edg/.test(userAgent);
      const isFirefox = /Firefox/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      
      console.log('Browser detection:', {
        userAgent,
        isChrome,
        isEdge,
        isFirefox,
        isSafari
      });

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        console.log('Speech Recognition API is available');
        
        // Additional check for Edge compatibility
        if (isEdge) {
          console.log('Microsoft Edge detected - checking compatibility...');
          try {
            const testRecognition = new SpeechRecognition();
            console.log('Edge speech recognition test successful');
          } catch (error) {
            console.error('Edge speech recognition not supported:', error);
            setSpeechSupported(false);
            return;
          }
        }
        
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Enable continuous listening
        recognition.interimResults = true; // Enable interim results for better UX
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          console.log('Speech recognition result received');
          let finalTranscript = '';
          let interimTranscript = '';

          // Build complete transcript from all results
          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          // Combine final and interim results
          const completeTranscript = (finalTranscript + interimTranscript).trim();
          
          if (completeTranscript) {
            console.log('Complete transcript:', completeTranscript);
            setInput(completeTranscript);
          }
        };

        recognition.onerror = (event) => {
          // Handle different error types appropriately for continuous mode
          switch (event.error) {
            case 'no-speech':
              // In continuous mode, no-speech is normal - don't show error or stop
              console.log('No speech detected, continuing to listen...');
              return;
            case 'audio-capture':
              console.warn('Microphone not accessible');
              setIsListening(false);
              break;
            case 'not-allowed':
              // Silently handle permission denial - user will see mic button is not active
              console.warn('Microphone permission denied');
              setIsListening(false);
              break;
            case 'network':
              console.warn('Network error during speech recognition');
              setIsListening(false);
              break;
            case 'service-not-allowed':
              console.warn('Speech service not allowed');
              setIsListening(false);
              break;
            default:
              console.warn('Speech recognition error:', event.error);
              // Don't stop for unknown errors in continuous mode
              break;
          }
        };

        recognition.onstart = () => {
          console.log('Speech recognition started');
          setIsListening(true);
        };

        recognition.onend = () => {
          console.log('Speech recognition ended');
          setIsListening(false);
          
          // In continuous mode, if recognition ends unexpectedly and we're still supposed to be listening,
          // we could restart it, but for now we'll let the user manually restart
        };

        recognition.onnomatch = () => {
          console.log('No speech match found, continuing to listen...');
          // In continuous mode, no match doesn't mean we should stop listening
        };

        recognition.onspeechstart = () => {
          console.log('Speech detected');
        };

        recognition.onspeechend = () => {
          console.log('Speech ended');
        };

        recognitionRef.current = recognition;
      } else {
        console.log('Speech Recognition API not supported');
        setSpeechSupported(false);
        
        // Provide browser-specific guidance
        if (isEdge) {
          console.warn('Microsoft Edge: Speech Recognition may not be fully supported. Try using Chrome for better compatibility.');
        } else if (isFirefox) {
          console.warn('Firefox: Speech Recognition is not supported. Please use Chrome or Edge.');
        } else if (isSafari) {
          console.warn('Safari: Speech Recognition support is limited. Please use Chrome for better compatibility.');
        }
      }
    }
  }, [mounted]);

  // Speech synthesis function
  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Start voice input
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening && !isLoading) {
      try {
        console.log('Attempting to start speech recognition...');
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        alert('Failed to start voice recognition. Please check your microphone permissions and try again.');
      }
    }
  }, [isListening, isLoading]);

  // Stop voice input
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Delete a specific chat session
  const deleteChat = async (sid: string) => {
    if (!confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/chat-history?sessionId=${sid}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Reload sessions list
        loadAllSessions();
        
        // If deleted session was active, start new chat
        if (sid === sessionId) {
          startNewChat();
        }
      } else {
        alert('Failed to delete chat. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  // Clear all chat history
  const clearAllChats = async () => {
    if (!confirm('Are you sure you want to clear ALL your chat history? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/chat-history', {
        method: 'DELETE',
      });

      if (response.ok) {
        // Reload sessions (should be empty now)
        loadAllSessions();
        
        // Start new chat
        startNewChat();
        
        setShowClearMenu(false);
      } else {
        alert('Failed to clear all chats. Please try again.');
      }
    } catch (error) {
      console.error('Error clearing all chats:', error);
      alert('Failed to clear all chats. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const now = new Date();
    const userMessage: Message = {
      id: `user-${now.getTime()}`,
      content: input.trim(),
      role: 'user',
      timestamp: now,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          messages: messages,
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: data.message,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Reload sessions list to show updated chat
      loadAllSessions();
      
      // Speak the response if speech synthesis is available
      if ('speechSynthesis' in window && data.message) {
        // Clean the message for speech (remove markdown formatting)
        const cleanMessage = data.message
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
          .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
          .replace(/🚨/g, 'Alert') // Replace emoji with text
          .replace(/•/g, '') // Remove bullet points
          .replace(/\n/g, '. '); // Replace line breaks with pauses
        
        speakText(cleanMessage);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: 'I apologize, but I\'m having trouble responding right now. Please try again later.',
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50" suppressHydrationWarning={true}>
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-64' : 'w-0'} bg-gray-900 text-white flex flex-col transition-all duration-300 overflow-hidden`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Chat History</h2>
            <button
              onClick={() => setShowSidebar(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <button
            onClick={startNewChat}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat Sessions List */}
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">
              No chat history yet
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.sessionId}
                className={`group relative p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                  s.sessionId === sessionId
                    ? 'bg-gray-700'
                    : 'hover:bg-gray-800'
                }`}
                onClick={() => loadChatSession(s.sessionId)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(s.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(s.sessionId);
                    }}
                    className="opacity-0 group-hover:opacity-100 ml-2 text-gray-400 hover:text-red-400 transition-opacity"
                    title="Delete chat"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={clearAllChats}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-800 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Clear All History</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {!showSidebar && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Medical Chat Assistant</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2" suppressHydrationWarning={true}>
                <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-xs text-gray-600 hidden sm:inline">
                  {isListening ? 'Listening...' : 'Voice'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-lg lg:max-w-2xl px-5 py-4 rounded-lg shadow-md ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-600">AI Assistant</span>
                      <button
                        onClick={() => speakText(message.content)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Read aloud"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.414 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.414l3.969-3.816a1 1 0 011.617.816zM16 8a2 2 0 11-4 0 2 2 0 014 0zm-2 6a4 4 0 100-8 4 4 0 000 8z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content.split('\n').map((line, index) => {
                      // Check for bold markdown **text**
                      const boldRegex = /\*\*(.*?)\*\*/g;
                      const hasBold = boldRegex.test(line);
                      
                      // Render line with formatting
                      const renderFormattedLine = (text: string) => {
                        const parts = text.split(/(\*\*.*?\*\*)/g);
                        return parts.map((part, i) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
                          }
                          return <span key={i}>{part}</span>;
                        });
                      };

                      return (
                        <div key={index} className={index > 0 ? 'mt-2' : ''}>
                          {line.includes('🚨') || line.includes('⚠️') ? (
                            <div className="bg-red-50 border-l-4 border-red-500 rounded p-3 text-red-800 my-2">
                              {renderFormattedLine(line)}
                            </div>
                          ) : line.startsWith('✅') || line.startsWith('•') || line.match(/^[🔹🔸💊🌡️🏥💧🛌]/u) ? (
                            <div className="flex items-start space-x-2 my-1">
                              <span className="text-blue-500 font-bold flex-shrink-0">{line[0]}</span>
                              <span className="flex-1">{renderFormattedLine(line.substring(line[0].length).trim())}</span>
                            </div>
                          ) : hasBold ? (
                            <div className="my-1">{renderFormattedLine(line)}</div>
                          ) : (
                            <span>{line}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`} suppressHydrationWarning={true}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="border-t bg-white p-4">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me about your health concerns..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full transition-colors ${
                    isListening 
                      ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg' 
                      : 'bg-red-500 text-white hover:bg-red-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isListening ? 'Stop continuous listening (Click to stop)' : 'Start continuous voice input (Click to start)'}
                  suppressHydrationWarning={true}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 616 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                  {isListening && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  )}
                </button>
              </div>
              
              {/* Audio controls */}
              {isSpeaking && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded-lg font-medium transition-colors"
                  title="Stop speaking"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Thinking...</span>
                  </>
                ) : (
                  <span>Send</span>
                )}
              </button>
            </form>
            
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                This is for informational purposes only and should not replace professional medical advice.
              </p>
              <div className="flex items-center space-x-4">
                {speechSupported ? (
                  <p className="text-xs text-blue-600">
                    🎙️ Voice input available
                  </p>
                ) : (
                  <p className="text-xs text-red-600" title="Voice recognition is not supported in this browser. Try using Google Chrome for the best experience.">
                    ❌ Voice input not supported
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    console.log('=== Voice Recognition Diagnostics ===');
                    console.log('Speech Recognition supported:', speechSupported);
                    console.log('Currently listening:', isListening);
                    console.log('Browser:', navigator.userAgent);
                    console.log('HTTPS:', window.location.protocol === 'https:');
                    console.log('Recognition object:', recognitionRef.current);
                    
                    // Browser compatibility check
                    const userAgent = navigator.userAgent;
                    const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
                    const isEdge = /Edg/.test(userAgent);
                    const isFirefox = /Firefox/.test(userAgent);
                    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
                    
                    console.log('Browser compatibility:', {
                      isChrome: isChrome ? '✅ Fully supported' : '❌',
                      isEdge: isEdge ? '⚠️ Limited support' : '❌',
                      isFirefox: isFirefox ? '❌ Not supported' : '❌',
                      isSafari: isSafari ? '⚠️ Limited support' : '❌'
                    });
                    
                    // API availability
                    console.log('API availability:', {
                      'SpeechRecognition': !!window.SpeechRecognition,
                      'webkitSpeechRecognition': !!window.webkitSpeechRecognition,
                      'speechSynthesis': !!window.speechSynthesis
                    });
                    
                    // Test microphone permissions
                    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                      navigator.mediaDevices.getUserMedia({ audio: true })
                        .then(() => console.log('✅ Microphone permission granted'))
                        .catch(err => console.error('❌ Microphone permission denied:', err));
                    }
                    
                    // Show user-friendly message
                    if (isEdge && !speechSupported) {
                      alert('Microsoft Edge has limited speech recognition support. For the best experience, please use Google Chrome.');
                    }
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Debug Voice
                </button>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
