
import { processDailyTasks } from '@/ai/flows/daily-task';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ reward: 0, error: 'User ID missing' }, { status: 400 });
    }

    const result = await processDailyTasks({ userId });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ reward: 0, error: error.message }, { status: 500 });
  }
}
