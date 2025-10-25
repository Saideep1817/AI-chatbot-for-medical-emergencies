import { useRef, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
'use client';
import ClientOnly from '@/components/ClientOnly';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
type Message = {
  id: string;
  content: string; 
  role: 'user' | 'assistant';
  timestamp: Date;
};
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
// Dynamically import the ChatClient component with no SSR
const ChatClient = dynamic(() => import('../../components/ChatClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  )
});

export default function Chat() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Consistent time formatting function to avoid hydration mismatches
  const formatTime = useCallback((date: Date) => {
    if (!mounted) return ''; // Return empty string during SSR
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [mounted]);

  // Initialize mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize client-side state
  useEffect(() => {
    if (mounted) {
      setIsClient(true);
      // Set initial message only on client side
      setMessages([{
        id: '1',
        content: 'Hello! I\'m your AI healthcare assistant. How can I help you today? Please note that I provide general health information and should not replace professional medical advice.',
        role: 'assistant',
        timestamp: new Date(),
      }]);
    }
  }, [mounted]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/auth/signin');
  }, [session, status, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (mounted && isClient && typeof window !== 'undefined') {
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
          console.error('Speech recognition error:', event.error);
          
          // Handle different error types appropriately for continuous mode
          switch (event.error) {
            case 'no-speech':
              // In continuous mode, no-speech is normal - don't show error or stop
              console.log('No speech detected, continuing to listen...');
              return;
            case 'audio-capture':
              alert('Microphone not accessible. Please check permissions.');
              setIsListening(false);
              break;
            case 'not-allowed':
              alert('Microphone permission denied. Please allow microphone access.');
              setIsListening(false);
              break;
            case 'network':
              alert('Network error. Please check your connection.');
              setIsListening(false);
              break;
            case 'service-not-allowed':
              alert('Speech service not allowed. Please try again.');
              setIsListening(false);
              break;
            default:
              console.error('Speech recognition error:', event.error);
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
  }, [mounted, isClient]);

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

  // Show loading until fully mounted and hydrated
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
    <ClientOnly>
      <div className="min-h-screen bg-gray-50" suppressHydrationWarning={true}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Medical Chat Assistant</h1>
            </div>
            <div className="flex items-center space-x-4">
              {mounted && (
                <div className="flex items-center space-x-2" suppressHydrationWarning={true}>
                  <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-gray-600">
                    {isListening ? 'Listening...' : 'Voice Ready'}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border h-[600px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 text-gray-900 border border-gray-200'
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
                      {mounted && (
                        <button
                          onClick={() => speakText(message.content)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Read aloud"
                          suppressHydrationWarning={true}
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.414 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.414l3.969-3.816a1 1 0 011.617.816zM16 8a2 2 0 11-4 0 2 2 0 014 0zm-2 6a4 4 0 100-8 4 4 0 000 8z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content.split('\n').map((line, index) => (
                      <div key={index} className={index > 0 ? 'mt-2' : ''}>
                        {line.includes('🚨') ? (
                          <div className="bg-red-50 border border-red-200 rounded p-2 text-red-800">
                            {line}
                          </div>
                        ) : line.startsWith('•') ? (
                          <div className="flex items-start space-x-2">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>{line.substring(1).trim()}</span>
                          </div>
                        ) : (
                          <span>{line}</span>
                        )}
                      </div>
                    ))}
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
          <div className="border-t p-4">
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
                  disabled={isLoading || !mounted}
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
              {mounted && isSpeaking && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded-lg font-medium transition-colors"
                  title="Stop speaking"
                  suppressHydrationWarning={true}
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
                {mounted && (
                  <>
                    {speechSupported ? (
                      <p className="text-xs text-blue-600" suppressHydrationWarning={true}>
                        🎙️ Voice input available
                      </p>
                    ) : (
                      <p className="text-xs text-red-600" title="Voice recognition is not supported in this browser. Try using Google Chrome for the best experience." suppressHydrationWarning={true}>
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </ClientOnly>
  );
}
