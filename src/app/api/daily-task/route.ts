import { processDailyTasks } from '@/ai/flows/daily-task';
import { NextRequest, NextResponse } from 'next/server';

// Advanced rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string, deviceFingerprint?: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const key = deviceFingerprint ? `${userId}:${deviceFingerprint}` : userId;
  
  const existing = rateLimitStore.get(key);
  
  if (!existing || now > existing.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 3600000 }); // 1 hour window
    return { allowed: true };
  }
  
  if (existing.count >= 12) { // Max 12 claims per hour (higher for recovery flexibility)
    return { allowed: false, reason: 'Calibration limit reached. Try again in 1 hour.' };
  }
  
  existing.count++;
  return { allowed: true };
}

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
      taskLoginClaimed,
      taskQuestionsClaimed,
      taskMockClaimed,
      taskMistakesClaimed,
      lastActiveDate,
      lastTaskReset,
      totalSessionTime,
      averageQuestionTime,
      isPro,
      userTier,
      deviceFingerprint,
      isStreakRecoveryRequested
    } = body;

    if (!userId) {
      return NextResponse.json({ reward: 0, error: 'Authorization required' }, { status: 401 });
    }

    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    // Strict validation of input types to prevent farming
    if (typeof dailyQuestionsAnswered !== 'number' || dailyQuestionsAnswered > 500) {
      return NextResponse.json({ error: 'Inconsistent metadata' }, { status: 400 });
    }

    const rateLimitCheck = checkRateLimit(userId, deviceFingerprint);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json({ reward: 0, error: rateLimitCheck.reason }, { status: 429 });
    }

    const result = await processDailyTasks({ 
      userId,
      dailyQuestionsAnswered: dailyQuestionsAnswered || 0,
      dailyTestsFinished: dailyTestsFinished || 0,
      mistakesReviewed: mistakesReviewed || 0,
      streakCount: streakCount || 0,
      dailyCreditEarned: dailyCreditEarned || 0,
      taskLoginClaimed: taskLoginClaimed || false,
      taskQuestionsClaimed: taskQuestionsClaimed || false,
      taskMockClaimed: taskMockClaimed || false,
      taskMistakesClaimed: taskMistakesClaimed || false,
      lastActiveDate,
      lastTaskReset,
      totalSessionTime: totalSessionTime || 0,
      averageQuestionTime: averageQuestionTime || 0,
      isPro: isPro || false,
      userTier: userTier || 'Bronze',
      deviceFingerprint,
      ipAddress: clientIP,
      isStreakRecoveryRequested: isStreakRecoveryRequested || false
    });

    const response = NextResponse.json(result);
    
    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    
    return response;
  } catch (error: any) {
    console.error('Daily task processing error:', error);
    return NextResponse.json({ reward: 0, error: 'Calibration sync failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'online',
    engine: 'DailyTaskFlow v2.2.0',
    timestamp: Date.now()
  });
}
