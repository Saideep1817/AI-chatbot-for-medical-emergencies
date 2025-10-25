import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import MedicationLog from '@/models/MedicationLog';

// POST - Mark medication as taken
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || session.user?.email;
    const { medicationId, medicationName, scheduledTime, scheduledDate } = await request.json();

    if (!medicationId || !scheduledTime || !scheduledDate) {
      return NextResponse.json(
        { error: 'medicationId, scheduledTime, and scheduledDate are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if log already exists for this medication and time
    const existingLog = await MedicationLog.findOne({
      userId,
      medicationId,
      scheduledTime,
      scheduledDate: new Date(scheduledDate),
    });

    if (existingLog) {
      // Update existing log
      existingLog.status = 'taken';
      existingLog.takenAt = new Date();
      await existingLog.save();
      return NextResponse.json({ log: existingLog });
    }

    // Create new log
    const log = await MedicationLog.create({
      userId,
      medicationId,
      medicationName,
      scheduledTime,
      scheduledDate: new Date(scheduledDate),
      takenAt: new Date(),
      status: 'taken',
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    console.error('Error marking medication as taken:', error);
    return NextResponse.json(
      { error: 'Failed to mark medication as taken' },
      { status: 500 }
    );
  }
}

// GET - Get medication logs for a specific date range
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || session.user?.email;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    await dbConnect();

    const query: any = { userId };
    
    if (startDate && endDate) {
      query.scheduledDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const logs = await MedicationLog.find(query).sort({ scheduledDate: -1, scheduledTime: 1 });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching medication logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medication logs' },
      { status: 500 }
    );
  }
}
