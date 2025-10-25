import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Medication from '@/models/Medication';

// Debug endpoint - NO AUTH (for testing only - remove in production!)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const medications = await Medication.find({}).sort({ createdAt: -1 });

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const reminderTime = new Date(now.getTime() + 5 * 60000);
    const reminderTimeStr = `${String(reminderTime.getHours()).padStart(2, '0')}:${String(reminderTime.getMinutes()).padStart(2, '0')}`;

    return NextResponse.json({
      debug: 'This endpoint shows ALL medications in database (no auth)',
      currentTime,
      reminderTimeIn5Min: reminderTimeStr,
      totalMedications: medications.length,
      medications: medications.map(med => ({
        id: med._id,
        userId: med.userId,
        name: med.name,
        frequency: med.frequency,
        timeOfDay: med.timeOfDay,
        reminderEnabled: med.reminderEnabled,
        active: med.active,
        startDate: med.startDate,
        endDate: med.endDate,
        createdAt: med.createdAt,
        matchesReminderTime: med.timeOfDay.some((t: string) => t === reminderTimeStr),
        willSendReminder: med.timeOfDay.includes(reminderTimeStr) && med.reminderEnabled && med.active
      }))
    });
  } catch (error) {
    console.error('Error fetching medications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medications', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
