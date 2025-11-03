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

    // Always use email as userId for consistency (email is more reliable than session id)
    const userId = session.user?.email || (session.user as any).id;
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

// GET - Handle both: mark as taken from email link OR fetch logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const medicationId = searchParams.get('medicationId');
    const scheduledTime = searchParams.get('scheduledTime');
    const scheduledDate = searchParams.get('scheduledDate');
    const userIdParam = searchParams.get('userId');

    await dbConnect();

    // Case 1: Mark as taken from email link (has medicationId, scheduledTime, scheduledDate)
    if (medicationId && scheduledTime && scheduledDate && userIdParam) {
      // Check if log already exists
      const existingLog = await MedicationLog.findOne({
        userId: userIdParam,
        medicationId,
        scheduledTime,
        scheduledDate: new Date(scheduledDate),
      });

      if (existingLog && existingLog.status === 'taken') {
        // Already marked as taken
        return new NextResponse(
          `<!DOCTYPE html>
          <html>
          <head>
            <title>Already Marked</title>
            <style>
              body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #001d3d 0%, #003566 100%); }
              .container { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2); max-width: 500px; }
              h1 { color: #003566; margin-bottom: 20px; }
              .icon { font-size: 64px; margin-bottom: 20px; }
              p { color: #666; font-size: 16px; line-height: 1.6; }
              .button { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #ffc300; color: #000814; text-decoration: none; border-radius: 6px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">✅</div>
              <h1>Already Marked as Taken</h1>
              <p>This medication was already marked as taken at ${new Date(existingLog.takenAt).toLocaleString()}.</p>
              <a href="/health-metrics" class="button">View Dashboard</a>
            </div>
          </body>
          </html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }

      // Mark as taken
      if (existingLog) {
        existingLog.status = 'taken';
        existingLog.takenAt = new Date();
        await existingLog.save();
      } else {
        await MedicationLog.create({
          userId: userIdParam,
          medicationId,
          medicationName: 'Medication', // We don't have the name in the URL
          scheduledTime,
          scheduledDate: new Date(scheduledDate),
          takenAt: new Date(),
          status: 'taken',
        });
      }

      // Return success HTML page
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Medication Marked as Taken</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #001d3d 0%, #003566 100%); }
            .container { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2); max-width: 500px; }
            h1 { color: #003566; margin-bottom: 20px; }
            .icon { font-size: 64px; margin-bottom: 20px; }
            p { color: #666; font-size: 16px; line-height: 1.6; }
            .time { color: #003566; font-weight: bold; font-size: 18px; margin: 20px 0; }
            .button { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #ffc300; color: #000814; text-decoration: none; border-radius: 6px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">💊✅</div>
            <h1>Medication Marked as Taken!</h1>
            <div class="time">Scheduled Time: ${scheduledTime}</div>
            <p>Great job! Your medication has been marked as taken.</p>
            <p>Keep up the good work with your medication adherence!</p>
            <a href="/health-metrics" class="button">View Dashboard</a>
          </div>
        </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Case 2: Fetch logs (original functionality)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user?.email || (session.user as any).id;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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
    console.error('Error in mark-taken GET:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
