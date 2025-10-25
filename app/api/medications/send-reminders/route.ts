import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Medication from '@/models/Medication';
import User from '@/models/User';
import { sendMedicationReminderEmail } from '@/lib/email';

// This endpoint should be called by a cron job every minute
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // For testing: send reminders for current time (change back to 5 minutes for production)
    // Production: const reminderTime = new Date(now.getTime() + 5 * 60000);
    const reminderTime = now; // Testing: send for current time
    const reminderTimeStr = `${String(reminderTime.getHours()).padStart(2, '0')}:${String(reminderTime.getMinutes()).padStart(2, '0')}`;

    // Find all active medications with reminders enabled that match the reminder time
    const medications = await Medication.find({
      active: true,
      reminderEnabled: true,
      timeOfDay: reminderTimeStr,
      startDate: { $lte: now },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    });

    const remindersSent = [];

    for (const medication of medications) {
      try {
        // Get user email - userId is stored as email string
        const user = await User.findOne({ email: medication.userId });

        if (user && user.email) {
          await sendMedicationReminderEmail({
            to: user.email,
            medicationName: medication.name,
            scheduledTime: reminderTimeStr,
            medicationId: medication._id.toString(),
            userId: medication.userId,
            scheduledDate: now.toISOString().split('T')[0],
          });

          remindersSent.push({
            medicationId: medication._id,
            medicationName: medication.name,
            userId: medication.userId,
            email: user.email,
            scheduledTime: reminderTimeStr,
          });
        }
      } catch (error) {
        console.error(`Failed to send reminder for medication ${medication._id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      currentTime,
      reminderTime: reminderTimeStr,
      remindersSent: remindersSent.length,
      details: remindersSent,
    });
  } catch (error) {
    console.error('Error sending medication reminders:', error);
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // For testing: check current time (change back to 5 minutes for production)
    const reminderTime = now;
    const reminderTimeStr = `${String(reminderTime.getHours()).padStart(2, '0')}:${String(reminderTime.getMinutes()).padStart(2, '0')}`;

    const medications = await Medication.find({
      active: true,
      reminderEnabled: true,
      timeOfDay: reminderTimeStr,
      startDate: { $lte: now },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    });

    return NextResponse.json({
      currentTime,
      reminderTime: reminderTimeStr,
      medicationsFound: medications.length,
      medications: medications.map(m => ({
        name: m.name,
        timeOfDay: m.timeOfDay,
        userId: m.userId,
      })),
    });
  } catch (error) {
    console.error('Error checking reminders:', error);
    return NextResponse.json(
      { error: 'Failed to check reminders' },
      { status: 500 }
    );
  }
}
