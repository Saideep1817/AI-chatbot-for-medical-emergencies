# AI Symptom Checker Feature

## Overview
Comprehensive AI-driven symptom analysis tool that provides probable conditions, urgency assessment, and actionable recommendations based on user-inputted symptoms.

## Features Implemented ✅

### 1. **Multi-Step Symptom Input**

#### **Patient Information (Optional)**
- **Age**: Numeric input for patient age
- **Gender**: Dropdown selection (Male, Female, Other, Prefer not to say)
- **Medical History**: Textarea for relevant conditions, medications, allergies

#### **Symptom Selection**
- **20 Common Symptoms**: Quick-select buttons for common symptoms
  - Headache, Fever, Cough, Sore throat, Fatigue, Nausea
  - Dizziness, Chest pain, Shortness of breath, Abdominal pain
  - Back pain, Joint pain, Muscle aches, Skin rash, Vomiting
  - Diarrhea, Constipation, Loss of appetite, Weight loss, Insomnia

- **Custom Symptom Input**: Add any symptom not in the list

#### **Detailed Symptom Information**
For each symptom, users can specify:
- **Name**: Symptom description
- **Severity**: Mild, Moderate, or Severe
- **Duration**: How long they've had it (e.g., "2 days", "1 week")
- **Location**: Body part affected (14 options: Head, Neck, Chest, Abdomen, etc.)
- **Description**: Additional details about the symptom

### 2. **AI-Powered Analysis**

#### **Urgency Classification**
Four levels of urgency with color-coded indicators:
- 🔴 **EMERGENCY**: Life-threatening symptoms requiring immediate attention
- 🟠 **HIGH**: Serious symptoms needing medical evaluation within 24 hours
- 🟡 **MEDIUM**: Concerning symptoms requiring healthcare provider consultation
- 🟢 **LOW**: Minor symptoms manageable with self-care and monitoring

#### **Emergency Detection**
Automatic detection of emergency keywords:
- Chest pain, heart attack, difficulty breathing
- Severe bleeding, unconscious, stroke, seizure
- Severe allergic reaction, anaphylaxis
- Severe abdominal pain, severe headache
- High fever with severe symptoms

**Emergency Response**: Immediate recommendation to call 911 or visit ER

#### **Comprehensive Analysis Structure**
```
**URGENCY LEVEL:** [EMERGENCY/HIGH/MEDIUM/LOW]

**EMERGENCY ALERT:** (if applicable)
🚨 SEEK IMMEDIATE MEDICAL ATTENTION 🚨

**POSSIBLE CONDITIONS:**
• 2-4 most likely conditions based on symptoms
• Ordered by likelihood
• Both common and serious possibilities

**RECOMMENDATIONS:**
• Specific actionable recommendations
• Self-care measures (if appropriate)
• When and how urgently to seek medical care
• What to monitor or watch for

**NEXT STEPS:**
• Immediate actions to take
• Timeline for seeking medical care
• Follow-up recommendations
• When to return for reassessment

**RED FLAGS TO WATCH FOR:**
• Symptoms requiring immediate medical attention
• Warning signs of deterioration
```

### 3. **Safety Protocols**

#### **Critical Safety Features**
1. ✅ Always emphasizes this is NOT a medical diagnosis
2. ✅ Cannot replace professional medical evaluation
3. ✅ Conservative assessments - when in doubt, recommends professional consultation
4. ✅ Never provides specific medication recommendations or dosages
5. ✅ Always includes appropriate medical disclaimers

#### **Emergency Red Flags**
Automatically triggers EMERGENCY classification if ANY detected:
- Chest pain, pressure, or tightness
- Severe difficulty breathing
- Signs of stroke (weakness, speech problems, facial drooping)
- Severe allergic reactions (swelling, difficulty breathing)
- Severe bleeding or trauma
- Loss of consciousness or altered mental state
- Severe abdominal pain
- High fever with severe symptoms
- Suicidal thoughts or severe mental health crisis

### 4. **User Interface**

#### **Two-Column Layout**
**Left Column - Input:**
- Patient information form
- Common symptoms grid
- Detailed symptom form
- Added symptoms list with severity badges
- "Analyze Symptoms" button

**Right Column - Results:**
- Analysis results with urgency badge
- Formatted analysis with sections
- Action buttons (Discuss with AI, Start New Analysis)
- "How It Works" information panel
- Important disclaimer

#### **Visual Design**
- **Color-coded severity badges**: Green (mild), Yellow (moderate), Red (severe)
- **Urgency level indicators**: Color-coded borders and backgrounds
- **Responsive grid layout**: Adapts to mobile and desktop
- **Clean, medical-grade UI**: Professional and trustworthy appearance

### 5. **Integration with Chat System**

#### **Automatic History Saving**
- Every symptom analysis automatically saved to chat history
- Appears in chat sidebar with "Symptom Check:" prefix
- Includes patient info and symptom summary
- Full analysis preserved for future reference

#### **Session Naming**
- Format: `symptom-check-{timestamp}`
- Easy to identify in chat history
- Separate from regular chat sessions

#### **Quick Access**
- "Discuss with AI Assistant" button
- Redirects to chat page for follow-up questions
- Can reference previous symptom checks

### 6. **API Implementation**

#### **Endpoint**: `POST /api/symptom-analysis`

**Request Body:**
```typescript
{
  prompt: string,
  symptoms: [
    {
      id: string,
      name: string,
      severity: 'mild' | 'moderate' | 'severe',
      duration: string,
      location?: string,
      description?: string
    }
  ],
  patientInfo: {
    age?: string,
    gender?: string,
    medicalHistory?: string
  }
}
```

**Response:**
```typescript
{
  analysis: string,  // Formatted analysis text
  timestamp: string,
  symptomsAnalyzed: number
}
```

#### **AI Model Configuration**
- **Model**: Gemini 1.5 Flash (with fallbacks)
- **Temperature**: 0.3 (lower for consistent medical analysis)
- **Max Tokens**: 2048
- **Safety**: Enhanced prompts for medical accuracy

### 7. **Error Handling**

#### **Graceful Degradation**
- API key not configured → Helpful setup instructions
- Model unavailable → Fallback recommendations
- Network errors → Suggests consulting healthcare professional
- Always maintains user safety even during errors

#### **Fallback Responses**
All error states provide:
- Urgency level assessment
- Recommendation to seek professional care
- Next steps for the user
- Medical disclaimer

### 8. **User Workflow**

#### **Complete Flow**
1. **Enter Patient Info** (optional but recommended)
   - Age, gender, medical history

2. **Add Symptoms**
   - Click common symptom OR add custom
   - Fill in details (severity, duration, location, description)
   - Click "Add Symptom"
   - Repeat for all symptoms

3. **Review Symptoms**
   - See list of added symptoms with details
   - Remove any if needed
   - Edit by removing and re-adding

4. **Analyze**
   - Click "Analyze Symptoms" button
   - AI processes symptoms (takes 3-10 seconds)
   - Results appear in right column

5. **Review Results**
   - Check urgency level
   - Read possible conditions
   - Follow recommendations
   - Note red flags to watch for

6. **Take Action**
   - Follow next steps
   - Discuss with AI if needed
   - Start new analysis for different symptoms

### 9. **Benefits**

✅ **Comprehensive**: Detailed symptom input with multiple parameters
✅ **Safe**: Multiple safety protocols and emergency detection
✅ **Accurate**: AI-powered analysis with medical knowledge
✅ **Actionable**: Clear recommendations and next steps
✅ **Accessible**: Easy-to-use interface with quick symptom selection
✅ **Integrated**: Saves to chat history for future reference
✅ **Professional**: Medical-grade UI and disclaimers

### 10. **Files Involved**

#### **Created/Updated**
- `app/symptom-checker/page.tsx` - Page wrapper
- `components/SymptomCheckerClient.tsx` - Main component (598 lines)
- `app/api/symptom-analysis/route.ts` - API endpoint (387 lines)

#### **Dependencies**
- `@google/generative-ai` - AI analysis
- `next-auth` - Authentication
- `mongoose` - Database storage
- React hooks - State management

### 11. **Testing Scenarios**

#### **Test Case 1: Simple Symptom**
- Input: Headache (mild, 1 day)
- Expected: LOW urgency, common causes, self-care tips

#### **Test Case 2: Multiple Symptoms**
- Input: Fever (moderate, 3 days) + Cough (mild, 3 days)
- Expected: MEDIUM urgency, possible flu/cold, when to see doctor

#### **Test Case 3: Emergency Symptom**
- Input: Chest pain (severe, 30 minutes)
- Expected: EMERGENCY urgency, immediate 911 recommendation

#### **Test Case 4: With Patient Info**
- Input: Age 65, Fever (high, 2 days), Shortness of breath
- Expected: HIGH urgency, considers age in recommendations

### 12. **Compliance & Disclaimers**

Every analysis includes:
- "This analysis is for informational purposes only"
- "Does not constitute medical advice"
- "Please consult with a healthcare professional"
- "For proper medical evaluation and treatment"

**Legal Protection**: Clear disclaimers protect against liability

### 13. **Future Enhancements**

Potential improvements:
1. **Symptom duration picker** - Calendar/time selector
2. **Symptom intensity scale** - 1-10 rating
3. **Photo upload** - For rashes, injuries, etc.
4. **Symptom tracking** - Monitor changes over time
5. **Export to PDF** - Share with doctor
6. **Multi-language support** - Reach more users
7. **Voice input** - Describe symptoms verbally
8. **Symptom templates** - Common combinations
9. **Follow-up reminders** - Check in after analysis
10. **Integration with wearables** - Import health data

## Usage Instructions

### For Users

1. Navigate to `/symptom-checker`
2. Optionally enter patient information
3. Select or add symptoms
4. Fill in symptom details
5. Click "Analyze Symptoms"
6. Review results and follow recommendations
7. Discuss with AI or start new analysis

### For Developers

```typescript
// API Call Example
const response = await fetch('/api/symptom-analysis', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "Analyze symptoms",
    symptoms: [
      {
        id: "1",
        name: "Headache",
        severity: "moderate",
        duration: "2 days",
        location: "Head",
        description: "Throbbing pain"
      }
    ],
    patientInfo: {
      age: "30",
      gender: "female",
      medicalHistory: "None"
    }
  })
});

const data = await response.json();
console.log(data.analysis);
```

## Summary

The Symptom Checker feature is a **fully functional, production-ready** medical symptom analysis tool that:

- ✅ Provides AI-driven symptom analysis
- ✅ Assesses urgency levels (LOW to EMERGENCY)
- ✅ Suggests probable conditions
- ✅ Recommends actionable next steps
- ✅ Integrates with chat history
- ✅ Maintains high safety standards
- ✅ Offers professional, medical-grade UI

**Ready to use!** Navigate to `/symptom-checker` to try it out. 🏥
