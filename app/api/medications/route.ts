import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Medication from '@/models/Medication';

// GET - Fetch medications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Always use email as userId for consistency (email is more reliable than session id)
    const userId = session.user?.email || (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    await dbConnect();

    const query: any = { userId };
    if (activeOnly) {
      query.active = true;
    }

    const medications = await Medication.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ medications });
  } catch (error) {
    console.error('Error fetching medications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medications' },
      { status: 500 }
    );
  }
}

// POST - Add new medication
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Always use email as userId for consistency (email is more reliable than session id)
    const userId = session.user?.email || (session.user as any).id;
    const {
      name,
      frequency,
      timeOfDay,
      startDate,
      endDate,
      notes,
      reminderEnabled,
    } = await request.json();

    if (!name || !frequency || !timeOfDay || !startDate) {
      return NextResponse.json(
        { error: 'Name, frequency, timeOfDay, and startDate are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const medication = await Medication.create({
      userId,
      name,
      frequency,
      timeOfDay,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      notes,
      reminderEnabled: reminderEnabled !== undefined ? reminderEnabled : true,
      active: true,
    });

    return NextResponse.json({ medication }, { status: 201 });
  } catch (error) {
    console.error('Error creating medication:', error);
    return NextResponse.json(
      { error: 'Failed to create medication' },
      { status: 500 }
    );
  }
}

// PATCH - Update medication
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Always use email as userId for consistency (email is more reliable than session id)
    const userId = session.user?.email || (session.user as any).id;
    const { id, ...updates } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Medication ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const medication = await Medication.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true }
    );

    if (!medication) {
      return NextResponse.json(
        { error: 'Medication not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ medication });
  } catch (error) {
    console.error('Error updating medication:', error);
    return NextResponse.json(
      { error: 'Failed to update medication' },
      { status: 500 }
    );
  }
}

// DELETE - Delete medication
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Always use email as userId for consistency (email is more reliable than session id)
    const userId = session.user?.email || (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const medicationId = searchParams.get('id');

    if (!medicationId) {
      return NextResponse.json(
        { error: 'Medication ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const result = await Medication.deleteOne({ _id: medicationId, userId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Medication not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting medication:', error);
    return NextResponse.json(
      { error: 'Failed to delete medication' },
      { status: 500 }
    );
  }
}
