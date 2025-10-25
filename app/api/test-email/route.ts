import { NextRequest, NextResponse } from 'next/server';
import { sendMedicationReminderEmail } from '@/lib/email';

// Test email endpoint - sends a test email immediately
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 });
    }

    const result = await sendMedicationReminderEmail({
      to: email,
      medicationName: 'Test Medication',
      scheduledTime: '20:00',
      medicationId: 'test123',
      userId: 'testuser',
      scheduledDate: new Date().toISOString().split('T')[0],
    });

    return NextResponse.json({
      success: true,
      message: 'Test email sent!',
      result,
      sentTo: email,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test email', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        resendConfigured: !!process.env.RESEND_API_KEY,
        emailFrom: process.env.EMAIL_FROM
      },
      { status: 500 }
    );
  }
}

// GET endpoint to show instructions
export async function GET() {
  return NextResponse.json({
    message: 'Test Email Endpoint',
    usage: 'POST to this endpoint with { "email": "your@email.com" }',
    example: 'curl -X POST http://localhost:3000/api/test-email -H "Content-Type: application/json" -d \'{"email":"your@email.com"}\'',
  });
}
