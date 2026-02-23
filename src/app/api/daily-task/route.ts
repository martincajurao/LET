
import { processDailyTasks } from '@/ai/flows/daily-task';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { 
      userId,
      dailyQuestionsAnswered,
      dailyTestsFinished,
      mistakesReviewed,
      streakCount,
      dailyCreditEarned,
      taskQuestionsClaimed,
      taskMockClaimed,
      taskMistakesClaimed
    } = body;

    if (!userId) {
      return NextResponse.json({ reward: 0, error: 'User ID missing' }, { status: 400 });
    }

    const result = await processDailyTasks({ 
      userId,
      dailyQuestionsAnswered,
      dailyTestsFinished,
      mistakesReviewed,
      streakCount,
      dailyCreditEarned,
      taskQuestionsClaimed,
      taskMockClaimed,
      taskMistakesClaimed
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ reward: 0, error: error.message }, { status: 500 });
  }
}
