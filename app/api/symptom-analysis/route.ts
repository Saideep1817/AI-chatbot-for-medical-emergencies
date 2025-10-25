import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dbConnect from '@/lib/mongodb';
import ChatHistory from '@/models/ChatHistory';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Enhanced system prompt specifically for symptom analysis - CONCISE FORMAT
const SYMPTOM_ANALYSIS_PROMPT = `You are an advanced AI medical assistant specializing in symptom analysis. Provide CONCISE, structured analysis in the exact format below.

CRITICAL SAFETY PROTOCOLS:
1. ALWAYS emphasize this is not a medical diagnosis
2. For emergency symptoms, immediately recommend emergency care
3. Be conservative - when in doubt, recommend professional consultation
4. Never provide specific medication recommendations or dosages

EMERGENCY RED FLAGS - If ANY present, classify as EMERGENCY:
- Chest pain, pressure, or tightness
- Severe difficulty breathing or shortness of breath
- Signs of stroke (sudden weakness, speech problems, facial drooping)
- Severe allergic reactions (swelling, difficulty breathing)
- Severe bleeding or trauma
- Loss of consciousness or altered mental state
- Severe abdominal pain
- High fever with severe symptoms
- Suicidal thoughts or severe mental health crisis

RESPONSE STRUCTURE (KEEP CONCISE):

**Possible Conditions:**
• [2-3 most likely conditions - ONE LINE EACH]

**Recommended Actions:**
• [3-4 key actions - ONE LINE EACH]

**Self-Care Steps:**
• [2-3 self-care measures - ONE LINE EACH]

**When to Seek Medical Help:**
• [2-3 specific scenarios - ONE LINE EACH]

IMPORTANT:
- Keep each bullet point to ONE concise line
- No lengthy explanations
- Focus on actionable information
- Be direct and clear
- Total response should be brief and scannable`;

interface SymptomData {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
  location?: string;
  description?: string;
}

interface PatientInfo {
  age?: string;
  gender?: string;
  medicalHistory?: string;
}

async function analyzeSymptoms(
  prompt: string,
  symptoms: SymptomData[],
  patientInfo: PatientInfo
): Promise<string> {
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key-here') {
      return `**Possible Conditions:**
• API not configured
• Please consult healthcare professional

**Recommended Actions:**
• Contact your doctor or urgent care center
• Do not delay medical care for severe symptoms

**Self-Care Steps:**
• Monitor your symptoms
• Keep a symptom diary

**When to Seek Medical Help:**
• If symptoms are severe or worsening
• For proper medical evaluation`;
    }

    // Check for emergency keywords in symptoms
    const emergencyKeywords = [
      'chest pain', 'heart attack', 'difficulty breathing', 'can\'t breathe', 
      'severe bleeding', 'unconscious', 'stroke', 'seizure', 'overdose',
      'severe allergic reaction', 'anaphylaxis', 'severe abdominal pain',
      'severe headache', 'high fever', 'dehydration', 'severe burns'
    ];

    const allSymptomText = symptoms.map(s => 
      `${s.name} ${s.description || ''} ${s.severity}`
    ).join(' ').toLowerCase();

    const hasEmergencySymptoms = emergencyKeywords.some(keyword => 
      allSymptomText.includes(keyword)
    );

    if (hasEmergencySymptoms) {
      return `🚨 **EMERGENCY - SEEK IMMEDIATE MEDICAL ATTENTION** 🚨

**Possible Conditions:**
• Medical emergency requiring immediate professional evaluation
• Time-sensitive conditions requiring urgent intervention

**Recommended Actions:**
• Call 911 or emergency services immediately
• Go to the nearest emergency room
• Do not drive yourself - call an ambulance
• Do not delay seeking medical care

**When to Seek Medical Help:**
• RIGHT NOW - This is a medical emergency`;
    }

    // Use the correct Gemini model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent medical analysis
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 1024,
      }
    });

    // Build comprehensive analysis prompt
    const symptomDetails = symptoms.map(symptom => {
      let detail = `${symptom.name}:`;
      detail += ` Severity: ${symptom.severity}`;
      if (symptom.duration) detail += `, Duration: ${symptom.duration}`;
      if (symptom.location) detail += `, Location: ${symptom.location}`;
      if (symptom.description) detail += `, Description: ${symptom.description}`;
      return detail;
    }).join('\n');

    const patientDetails = [];
    if (patientInfo.age) patientDetails.push(`Age: ${patientInfo.age}`);
    if (patientInfo.gender) patientDetails.push(`Gender: ${patientInfo.gender}`);
    if (patientInfo.medicalHistory) patientDetails.push(`Medical History: ${patientInfo.medicalHistory}`);

    const fullPrompt = `${SYMPTOM_ANALYSIS_PROMPT}

PATIENT INFORMATION:
${patientDetails.length > 0 ? patientDetails.join('\n') : 'Not provided'}

SYMPTOMS TO ANALYZE:
${symptomDetails}

Please provide a comprehensive symptom analysis following the exact structure specified above.`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return text || `**Possible Conditions:**
• Unable to analyze at this time
• Please consult healthcare professional

**Recommended Actions:**
• Contact your doctor or urgent care center
• Do not delay medical care if symptoms are severe

**Self-Care Steps:**
• Keep a record of your symptoms
• Monitor for any worsening

**When to Seek Medical Help:**
• If symptoms are severe or worsening
• For proper medical evaluation`;

  } catch (error: any) {
    console.error('Symptom analysis error:', error);
    
    // Concise error response
    console.error('Error details:', error?.message || error);
    
    return `**Possible Conditions:**
• Unable to analyze - technical error
• Please consult healthcare professional

**Recommended Actions:**
• Contact your doctor or urgent care center
• Do not delay medical care if symptoms are concerning

**Self-Care Steps:**
• Keep a record of your symptoms
• Monitor for changes

**When to Seek Medical Help:**
• If symptoms are severe or worsening
• For proper medical diagnosis`;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { prompt, symptoms, patientInfo } = await request.json();
    
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return NextResponse.json(
        { error: 'Symptoms are required for analysis' },
        { status: 400 }
      );
    }

    // Generate symptom analysis
    const analysis = await analyzeSymptoms(prompt, symptoms, patientInfo || {});
    
    // Save symptom analysis to chat history for future reference
    let sessionId = '';
    try {
      await dbConnect();
      const userId = (session.user as any).id || session.user?.email;
      sessionId = `symptom-check-${Date.now()}`;
      
      // Create summary of symptoms for the user message
      const symptomSummary = symptoms.map((s: SymptomData) => 
        `${s.name} (${s.severity}${s.duration ? `, ${s.duration}` : ''})`
      ).join(', ');
      
      const userMessage = {
        id: `user-${Date.now()}`,
        content: `Symptom Check: ${symptomSummary}${patientInfo.age ? `\nAge: ${patientInfo.age}` : ''}${patientInfo.gender ? `\nGender: ${patientInfo.gender}` : ''}${patientInfo.medicalHistory ? `\nMedical History: ${patientInfo.medicalHistory}` : ''}`,
        role: 'user' as const,
        timestamp: new Date(),
      };
      
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        content: analysis,
        role: 'assistant' as const,
        timestamp: new Date(),
      };
      
      await ChatHistory.create({
        userId,
        sessionId,
        messages: [userMessage, assistantMessage],
      });
      
      console.log('Symptom analysis saved to chat history');
    } catch (dbError) {
      console.error('Failed to save symptom analysis to history:', dbError);
      // Don't fail the request if DB save fails
    }
    
    return NextResponse.json({
      analysis,
      sessionId,
      timestamp: new Date().toISOString(),
      symptomsAnalyzed: symptoms.length
    });
    
  } catch (error) {
    console.error('Symptom analysis API error:', error);
    return NextResponse.json(
      { 
        analysis: `**Possible Conditions:**
• System error - unable to analyze
• Please consult healthcare professional

**Recommended Actions:**
• Contact your doctor or urgent care center
• Do not delay medical care

**Self-Care Steps:**
• Monitor your symptoms
• Keep a record for your doctor

**When to Seek Medical Help:**
• If symptoms are severe or worsening
• For proper medical evaluation`,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
