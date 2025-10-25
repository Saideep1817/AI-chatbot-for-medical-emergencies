import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ChatHistory from '@/models/ChatHistory';

// GET - Fetch chat history for current user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const userId = (session.user as any).id || session.user.email;
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    await dbConnect();

    let chatHistory;
    if (sessionId) {
      // Get specific session
      chatHistory = await ChatHistory.findOne({ userId, sessionId });
      return new Response(
        JSON.stringify({ chatHistory }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } else {
      // Get all sessions for user (list view)
      const sessions = await ChatHistory.find({ userId })
        .sort({ updatedAt: -1 })
        .select('sessionId messages createdAt updatedAt');
      
      // Format sessions with title (first user message) and preview
      const formattedSessions = sessions.map(session => {
        const firstUserMessage = session.messages.find((m: any) => m.role === 'user');
        const title = firstUserMessage 
          ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
          : 'New Chat';
        
        return {
          sessionId: session.sessionId,
          title,
          messageCount: session.messages.length,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        };
      });

      return new Response(
        JSON.stringify({ sessions: formattedSessions }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch chat history' }),
      { status: 500 }
    );
  }
}

// DELETE - Clear chat history
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const userId = (session.user as any).id || session.user.email;
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    await dbConnect();

    if (sessionId) {
      // Delete specific session
      await ChatHistory.deleteOne({ userId, sessionId });
    } else {
      // Delete all sessions for user
      await ChatHistory.deleteMany({ userId });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Chat history cleared' }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to clear chat history' }),
      { status: 500 }
    );
  }
}
