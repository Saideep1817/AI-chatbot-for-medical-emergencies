import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import HealthMetric from '@/models/HealthMetric';

// GET - Fetch health metrics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || session.user?.email;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '30');
    const days = parseInt(searchParams.get('days') || '30');

    await dbConnect();

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query: any = {
      userId,
      recordedAt: { $gte: startDate },
    };

    if (type) {
      query.type = type;
    }

    const metrics = await HealthMetric.find(query)
      .sort({ recordedAt: -1 })
      .limit(limit);

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error fetching health metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health metrics' },
      { status: 500 }
    );
  }
}

// POST - Add new health metric
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || session.user?.email;
    const { type, value, unit, notes, recordedAt } = await request.json();

    if (!type || !value || !unit) {
      return NextResponse.json(
        { error: 'Type, value, and unit are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const metric = await HealthMetric.create({
      userId,
      type,
      value,
      unit,
      notes,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    });

    return NextResponse.json({ metric }, { status: 201 });
  } catch (error) {
    console.error('Error creating health metric:', error);
    return NextResponse.json(
      { error: 'Failed to create health metric' },
      { status: 500 }
    );
  }
}

// DELETE - Delete health metric
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || session.user?.email;
    const { searchParams } = new URL(request.url);
    const metricId = searchParams.get('id');

    if (!metricId) {
      return NextResponse.json(
        { error: 'Metric ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const result = await HealthMetric.deleteOne({ _id: metricId, userId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Metric not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting health metric:', error);
    return NextResponse.json(
      { error: 'Failed to delete health metric' },
      { status: 500 }
    );
  }
}
