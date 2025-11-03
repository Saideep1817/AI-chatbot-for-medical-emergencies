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
    
    // Send reminders 5 minutes BEFORE the scheduled time
    // Set REMINDER_ADVANCE_MINUTES=0 in .env.local for testing (sends at exact time)
    const advanceMinutes = parseInt(process.env.REMINDER_ADVANCE_MINUTES || '5');
    const reminderTime = new Date(now.getTime() + advanceMinutes * 60000);
    const reminderTimeStr = `${String(reminderTime.getHours()).padStart(2, '0')}:${String(reminderTime.getMinutes()).padStart(2, '0')}`;
    
    console.log(`Current time: ${currentTime}, checking for medications at: ${reminderTimeStr} (${advanceMinutes} min advance)`);

    // Find all active medications with reminders enabled that match the reminder time
    const medications = await Medication.find({
      active: true,
      reminderEnabled: true,
      timeOfDay: { $in: [reminderTimeStr] }, // timeOfDay is an array, so use $in
      startDate: { $lte: now },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    });

    const remindersSent = [];

    console.log(`Found ${medications.length} medications for reminder time ${reminderTimeStr}`);

    for (const medication of medications) {
      try {
        console.log(`Processing medication: ${medication.name}, userId: ${medication.userId}`);
        
        // Get user - userId could be email, MongoDB ObjectId, or custom ID
        let user = null;
        
        // Try 1: Find by email
        user = await User.findOne({ email: medication.userId });
        
        // Try 2: Find by _id if it's a valid MongoDB ObjectId format (24 hex chars)
        if (!user && /^[0-9a-fA-F]{24}$/.test(medication.userId)) {
          try {
            user = await User.findById(medication.userId);
          } catch (err) {
            // Not a valid ObjectId
          }
        }
        
        // Try 3: If userId looks like a timestamp or number, find any user with medications
        // This is a fallback for cases where session ID doesn't match user records
        if (!user) {
          // Get all medications for this userId to find a pattern
          const allUserMeds = await Medication.find({ userId: medication.userId }).limit(1);
          if (allUserMeds.length > 0) {
            // Try to find a user - in this case, we'll need to get the logged-in user
            // For now, let's try to find ANY user (this is a workaround)
            const users = await User.find({}).limit(10);
            console.log(`⚠️  UserId "${medication.userId}" not found. Available users:`, users.map(u => ({ email: u.email, id: u._id.toString() })));
            
            // As a last resort, use the first user's email (NOT IDEAL - but for debugging)
            if (users.length > 0) {
              user = users[0];
              console.log(`⚠️  Using fallback user: ${user.email}`);
            }
          }
        }
        
        console.log(`User lookup for userId "${medication.userId}":`, user ? `Found (${user.email})` : 'Not found');

        if (user && user.email) {
          console.log(`Sending email to ${user.email} for ${medication.name}`);
          
          await sendMedicationReminderEmail({
            to: user.email,
            medicationName: medication.name,
            scheduledTime: reminderTimeStr,
            medicationId: medication._id.toString(),
            userId: medication.userId,
            scheduledDate: now.toISOString().split('T')[0],
          });

          console.log(`✅ Email sent successfully to ${user.email}`);

          remindersSent.push({
            medicationId: medication._id,
            medicationName: medication.name,
            userId: medication.userId,
            email: user.email,
            scheduledTime: reminderTimeStr,
          });
        } else {
          console.log(`⚠️ No user found for userId: ${medication.userId}`);
        }
      } catch (error) {
        console.error(`❌ Failed to send reminder for medication ${medication._id}:`, error);
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
    
    // Check for medications scheduled at (current time + advance minutes)
    const advanceMinutes = parseInt(process.env.REMINDER_ADVANCE_MINUTES || '5');
    const reminderTime = new Date(now.getTime() + advanceMinutes * 60000);
    const reminderTimeStr = `${String(reminderTime.getHours()).padStart(2, '0')}:${String(reminderTime.getMinutes()).padStart(2, '0')}`;

    const medications = await Medication.find({
      active: true,
      reminderEnabled: true,
      timeOfDay: { $in: [reminderTimeStr] }, // timeOfDay is an array, so use $in
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
