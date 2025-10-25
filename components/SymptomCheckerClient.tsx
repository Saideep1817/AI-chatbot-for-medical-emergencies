'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Symptom {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
  location?: string;
  description?: string;
}

interface AnalysisResult {
  id: string;
  content: string;
  timestamp: Date;
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  recommendations: string[];
  possibleConditions: string[];
}

// Common symptoms list for quick selection
const COMMON_SYMPTOMS = [
  'Headache', 'Fever', 'Cough', 'Sore throat', 'Fatigue', 'Nausea',
  'Dizziness', 'Chest pain', 'Shortness of breath', 'Abdominal pain',
  'Back pain', 'Joint pain', 'Muscle aches', 'Skin rash', 'Vomiting',
  'Diarrhea', 'Constipation', 'Loss of appetite', 'Weight loss', 'Insomnia'
];

// Body parts for symptom location
const BODY_PARTS = [
  'Head', 'Neck', 'Chest', 'Abdomen', 'Back', 'Arms', 'Legs', 
  'Hands', 'Feet', 'Throat', 'Eyes', 'Ears', 'Nose', 'Mouth'
];

export default function SymptomCheckerClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [currentSymptom, setCurrentSymptom] = useState<Partial<Symptom>>({
    name: '',
    severity: 'mild',
    duration: '',
    location: '',
    description: ''
  });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (status === 'loading') return;
    if (!session) router.push('/auth/signin');
  }, [mounted, session, status, router]);

  const addSymptom = useCallback(() => {
    if (!currentSymptom.name?.trim()) return;

    const newSymptom: Symptom = {
      id: `symptom-${Date.now()}`,
      name: currentSymptom.name,
      severity: currentSymptom.severity || 'mild',
      duration: currentSymptom.duration || '',
      location: currentSymptom.location || '',
      description: currentSymptom.description || ''
    };

    setSymptoms(prev => [...prev, newSymptom]);
    setCurrentSymptom({
      name: '',
      severity: 'mild',
      duration: '',
      location: '',
      description: ''
    });
    setShowCustomInput(false);
  }, [currentSymptom]);

  const removeSymptom = useCallback((id: string) => {
    setSymptoms(prev => prev.filter(symptom => symptom.id !== id));
  }, []);

  const selectCommonSymptom = useCallback((symptomName: string) => {
    setCurrentSymptom(prev => ({ ...prev, name: symptomName }));
    setShowCustomInput(false);
  }, []);

  const analyzeSymptoms = async () => {
    if (symptoms.length === 0) {
      alert('Please add at least one symptom before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Prepare detailed symptom information for AI analysis
      const symptomDetails = symptoms.map(symptom => {
        let detail = `${symptom.name} (${symptom.severity} severity)`;
        if (symptom.duration) detail += ` for ${symptom.duration}`;
        if (symptom.location) detail += ` in ${symptom.location}`;
        if (symptom.description) detail += ` - ${symptom.description}`;
        return detail;
      }).join('; ');

      const patientInfo = [];
      if (age) patientInfo.push(`Age: ${age}`);
      if (gender) patientInfo.push(`Gender: ${gender}`);
      if (medicalHistory) patientInfo.push(`Medical History: ${medicalHistory}`);

      const analysisPrompt = `SYMPTOM CHECKER ANALYSIS REQUEST

Patient Information: ${patientInfo.length > 0 ? patientInfo.join(', ') : 'Not provided'}

Symptoms: ${symptomDetails}

Please provide a structured symptom analysis with the following format:

**URGENCY LEVEL:** [LOW/MEDIUM/HIGH/EMERGENCY]

**POSSIBLE CONDITIONS:**
• [List 2-4 most likely conditions based on symptoms]

**RECOMMENDATIONS:**
• [Specific actionable recommendations]
• [Self-care suggestions if appropriate]
• [When to seek medical care]

**NEXT STEPS:**
• [Immediate actions to take]
• [Follow-up recommendations]

Please be thorough but clear, and always emphasize when professional medical evaluation is needed.`;

      const response = await fetch('/api/symptom-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: analysisPrompt,
          symptoms: symptoms,
          patientInfo: { age, gender, medicalHistory }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze symptoms');
      }

      const data = await response.json();
      
      // Parse the response to extract urgency level and recommendations
      const content = data.analysis;
      let urgencyLevel: 'low' | 'medium' | 'high' | 'emergency' = 'medium';
      
      if (content.includes('EMERGENCY') || content.includes('emergency') || content.includes('🚨')) {
        urgencyLevel = 'emergency';
      } else if (content.includes('HIGH') && content.includes('URGENCY')) {
        urgencyLevel = 'high';
      } else if (content.includes('LOW') && content.includes('URGENCY')) {
        urgencyLevel = 'low';
      }

      // Extract recommendations and conditions (simplified parsing)
      const recommendations = content.split('**Recommended Actions:**')[1]?.split('**Self-Care Steps:**')[0]?.split('•').filter((r: string) => r.trim()).map((r: string) => r.trim()) || [];
      const possibleConditions = content.split('**Possible Conditions:**')[1]?.split('**Recommended Actions:**')[0]?.split('•').filter((c: string) => c.trim()).map((c: string) => c.trim()) || [];

      const result: AnalysisResult = {
        id: `analysis-${Date.now()}`,
        content,
        timestamp: new Date(),
        urgencyLevel,
        recommendations,
        possibleConditions
      };

      setAnalysisResult(result);
      
      // Save the session ID for chat continuation
      if (data.sessionId) {
        setSavedSessionId(data.sessionId);
      }
    } catch (error) {
      console.error('Symptom analysis error:', error);
      const errorResult: AnalysisResult = {
        id: `error-${Date.now()}`,
        content: 'I apologize, but I\'m having trouble analyzing your symptoms right now. Please try again later, or consult with a healthcare professional for immediate concerns.',
        timestamp: new Date(),
        urgencyLevel: 'medium',
        recommendations: ['Consult with a healthcare professional', 'Try the analysis again later'],
        possibleConditions: []
      };
      setAnalysisResult(errorResult);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'emergency': return 'bg-red-100 border-red-500 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'low': return 'bg-green-100 border-green-500 text-green-800';
      default: return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'bg-red-100 text-red-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'mild': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
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
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI Symptom Checker</h1>
                <p className="text-sm text-gray-600">Get AI-powered analysis of your symptoms</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Online</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Symptom Input */}
          <div className="space-y-6">
            {/* Patient Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Patient Information (Optional)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter age"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Medical History</label>
                <textarea
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="Any relevant medical conditions, medications, or allergies..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Symptom Selection */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Symptoms</h2>
              
              {/* Common Symptoms */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Common Symptoms</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {COMMON_SYMPTOMS.map((symptom) => (
                    <button
                      key={symptom}
                      onClick={() => selectCommonSymptom(symptom)}
                      className="text-left px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      {symptom}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  + Add custom symptom
                </button>
              </div>

              {/* Symptom Details Form */}
              {(currentSymptom.name || showCustomInput) && (
                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Symptom Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Symptom Name</label>
                      <input
                        type="text"
                        value={currentSymptom.name || ''}
                        onChange={(e) => setCurrentSymptom(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Describe your symptom"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                        <select
                          value={currentSymptom.severity || 'mild'}
                          onChange={(e) => setCurrentSymptom(prev => ({ ...prev, severity: e.target.value as 'mild' | 'moderate' | 'severe' }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="severe">Severe</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                        <input
                          type="text"
                          value={currentSymptom.duration || ''}
                          onChange={(e) => setCurrentSymptom(prev => ({ ...prev, duration: e.target.value }))}
                          placeholder="e.g., 2 days, 1 week"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location (if applicable)</label>
                      <select
                        value={currentSymptom.location || ''}
                        onChange={(e) => setCurrentSymptom(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select location</option>
                        {BODY_PARTS.map((part) => (
                          <option key={part} value={part}>{part}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Additional Description</label>
                      <textarea
                        value={currentSymptom.description || ''}
                        onChange={(e) => setCurrentSymptom(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Any additional details about this symptom..."
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={addSymptom}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                      >
                        Add Symptom
                      </button>
                      <button
                        onClick={() => {
                          setCurrentSymptom({
                            name: '',
                            severity: 'mild',
                            duration: '',
                            location: '',
                            description: ''
                          });
                          setShowCustomInput(false);
                        }}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Added Symptoms List */}
            {symptoms.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Symptoms</h2>
                <div className="space-y-3">
                  {symptoms.map((symptom) => (
                    <div key={symptom.id} className="flex items-start justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900">{symptom.name}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(symptom.severity)}`}>
                            {symptom.severity}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {symptom.duration && <p>Duration: {symptom.duration}</p>}
                          {symptom.location && <p>Location: {symptom.location}</p>}
                          {symptom.description && <p>Description: {symptom.description}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => removeSymptom(symptom.id)}
                        className="text-red-500 hover:text-red-700 ml-3"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={analyzeSymptoms}
                  disabled={isAnalyzing}
                  className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Analyzing Symptoms...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>Analyze Symptoms</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Analysis Results */}
          <div className="space-y-6">
            {analysisResult ? (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Analysis Results</h2>
                
                <div className="space-y-6">
                  {analysisResult.content.split('\n').map((line, index) => {
                    // Emergency alert
                    if (line.includes('🚨')) {
                      return (
                        <div key={index} className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                          <p className="text-red-800 font-bold">{line}</p>
                        </div>
                      );
                    }
                    
                    // Section headers
                    if (line.startsWith('**') && line.endsWith('**')) {
                      const headerText = line.replace(/\*\*/g, '').replace(/:/g, '');
                      return (
                        <div key={index} className="mt-6 first:mt-0">
                          <h3 className="text-lg font-bold text-gray-900 mb-3">{headerText}:</h3>
                        </div>
                      );
                    }
                    
                    // Bullet points
                    if (line.startsWith('•')) {
                      return (
                        <div key={index} className="flex items-start space-x-3 ml-2">
                          <span className="text-gray-400 mt-1">•</span>
                          <p className="text-gray-700 flex-1">{line.substring(1).trim()}</p>
                        </div>
                      );
                    }
                    
                    // Empty lines
                    if (!line.trim()) {
                      return null;
                    }
                    
                    // Regular text
                    return (
                      <p key={index} className="text-gray-700">{line}</p>
                    );
                  })}
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-4">
                    ⚠️ This analysis is for informational purposes only and should not replace professional medical advice.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => {
                        if (savedSessionId) {
                          // Store session ID in localStorage for chat to pick up
                          localStorage.setItem('continueFromSymptomCheck', savedSessionId);
                        }
                        router.push('/chat');
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>Get More Help from AI Chat</span>
                    </button>
                    <button
                      onClick={() => {
                        setAnalysisResult(null);
                        setSymptoms([]);
                        setSavedSessionId(null);
                      }}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium text-sm transition-colors"
                    >
                      Start New Analysis
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No Analysis Yet</h3>
                  <p className="mt-2 text-gray-600">
                    Add your symptoms and click "Analyze Symptoms" to get AI-powered health insights.
                  </p>
                </div>
              </div>
            )}

            {/* Information Panel */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">How It Works</h3>
              <div className="space-y-3 text-sm text-blue-800">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p>Add your symptoms with details about severity, duration, and location</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p>Our AI analyzes your symptoms and provides possible conditions</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p>Get recommendations for next steps and when to seek medical care</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> This tool provides general health information only. 
                  Always consult healthcare professionals for medical advice, diagnosis, or treatment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
