import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Medication from '@/models/Medication';

// Debug endpoint to see all medications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || session.user?.email;

    await dbConnect();

    const medications = await Medication.find({ userId }).sort({ createdAt: -1 });

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const reminderTime = new Date(now.getTime() + 5 * 60000);
    const reminderTimeStr = `${String(reminderTime.getHours()).padStart(2, '0')}:${String(reminderTime.getMinutes()).padStart(2, '0')}`;

    return NextResponse.json({
      currentTime,
      reminderTimeIn5Min: reminderTimeStr,
      totalMedications: medications.length,
      medications: medications.map(med => ({
        id: med._id,
        name: med.name,
        frequency: med.frequency,
        timeOfDay: med.timeOfDay,
        reminderEnabled: med.reminderEnabled,
        active: med.active,
        startDate: med.startDate,
        endDate: med.endDate,
        willSendReminderNow: med.timeOfDay.includes(reminderTimeStr) && med.reminderEnabled && med.active
      }))
    });
  } catch (error) {
    console.error('Error fetching medications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medications' },
      { status: 500 }
    );
  }
}
