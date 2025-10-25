import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Medication from '@/models/Medication';
import User from '@/models/User';
import { sendMedicationReminderEmail } from '@/lib/email';

// Test endpoint - sends reminder for the FIRST active medication immediately
// NO AUTH for testing - remove in production!
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Get the first active medication (any user)
    const medication = await Medication.findOne({
      active: true,
      reminderEnabled: true,
    });

    if (!medication) {
      return NextResponse.json({
        error: 'No active medications found with reminders enabled',
      }, { status: 404 });
    }

    // Get user email - userId might be email or numeric ID
    const user = await User.findOne({ email: medication.userId });

    if (!user || !user.email) {
      return NextResponse.json({
        error: 'User email not found',
        userId: medication.userId,
      }, { status: 404 });
    }

    // Send email for the first time slot
    const scheduledTime = medication.timeOfDay[0];
    const now = new Date();

    try {
      const result = await sendMedicationReminderEmail({
        to: user.email,
        medicationName: medication.name,
        scheduledTime,
        medicationId: medication._id.toString(),
        userId: medication.userId,
        scheduledDate: now.toISOString().split('T')[0],
      });

      return NextResponse.json({
        success: true,
        message: 'Test reminder sent!',
        medication: {
          name: medication.name,
          time: scheduledTime,
        },
        sentTo: user.email,
        result,
      });
    } catch (emailError) {
      console.error('EMAIL ERROR:', emailError);
      return NextResponse.json({
        error: 'Failed to send email',
        details: emailError instanceof Error ? emailError.message : 'Unknown error',
        stack: emailError instanceof Error ? emailError.stack : undefined,
        medication: {
          name: medication.name,
          time: scheduledTime,
        },
        userEmail: user.email,
        resendConfigured: !!process.env.RESEND_API_KEY,
        emailFrom: process.env.EMAIL_FROM,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in test reminder:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test reminder',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
