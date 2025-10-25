import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ChatHistory from '@/models/ChatHistory';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Missing GEMINI_API_KEY environment variable');
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const { message, messages, sessionId } = await req.json();
    
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }
    
    const userId = (session.user as any).id || session.user.email;
    
    console.log('Received message:', message);
    
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid message format' }),
        { status: 400 }
      );
    }
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    console.log('Generating content with Gemini...');
    
    // System prompt for better formatting
    const systemPrompt = `You are a friendly and professional medical AI assistant. Format your responses to be visually appealing and easy to read:

1. Use emojis strategically to make content engaging (e.g., 💊 for medication, 🌡️ for fever, ⚠️ for warnings, ✅ for recommendations, 🏥 for medical care)
2. Structure information with clear sections using bold headers (e.g., **Quick Relief Tips**, **When to See a Doctor**)
3. Use bullet points with emojis for lists
4. Keep paragraphs short and scannable
5. Highlight critical information with ⚠️ or 🚨 emojis
6. Use line breaks generously for better readability
7. Add a warm, empathetic tone while remaining professional

Example format:
**[Section Title]** 🎯
Brief intro sentence.

✅ **Point 1** - Description
✅ **Point 2** - Description

⚠️ **Important Note**
Critical information here.

Now respond to the user's query following this format.`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt + "\n\nUser Query: " + message }]
        }
      ]
    });
    
    const response = await result.response;
    const text = response.text();
    
    console.log('Generated response:', text.substring(0, 100) + '...');
    
    // Save chat history to database
    try {
      await dbConnect();
      
      const currentSessionId = sessionId || `session-${Date.now()}`;
      
      // Create message objects
      const userMessage = {
        id: `user-${Date.now()}`,
        content: message,
        role: 'user' as const,
        timestamp: new Date(),
      };
      
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        content: text,
        role: 'assistant' as const,
        timestamp: new Date(),
      };
      
      // Find or create chat history for this session
      let chatHistory = await ChatHistory.findOne({ userId, sessionId: currentSessionId });
      
      if (chatHistory) {
        // Update existing chat history
        chatHistory.messages.push(userMessage, assistantMessage);
        await chatHistory.save();
      } else {
        // Create new chat history
        chatHistory = await ChatHistory.create({
          userId,
          sessionId: currentSessionId,
          messages: [userMessage, assistantMessage],
        });
      }
      
      console.log('Chat history saved successfully');
    } catch (dbError) {
      console.error('Failed to save chat history:', dbError);
      // Don't fail the request if DB save fails
    }
    
    return new Response(
      JSON.stringify({ message: text }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
  } catch (error: unknown) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process request';
    console.error('Error details:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: errorMessage 
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}