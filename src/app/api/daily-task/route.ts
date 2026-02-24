import { processDailyTasks } from '@/ai/flows/daily-task';
import { NextRequest, NextResponse } from 'next/server';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Enhanced rate limiting with device fingerprinting
function checkRateLimit(userId: string, deviceFingerprint?: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const key = deviceFingerprint ? `${userId}:${deviceFingerprint}` : userId;
  
  const existing = rateLimitStore.get(key);
  
  if (!existing || now > existing.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 3600000 }); // 1 hour window
    return { allowed: true };
  }
  
  if (existing.count >= 10) { // Max 10 claims per hour
    return { allowed: false, reason: 'Too many reward claims. Please try again later.' };
  }
  
  existing.count++;
  return { allowed: true };
}

// IP-based abuse detection
function detectIPAbuse(ipAddress: string): { suspicious: boolean; reason?: string } {
  // In production, maintain a database of suspicious IPs
  const suspiciousIPs = ['127.0.0.1']; // Example
  
  if (suspiciousIPs.includes(ipAddress)) {
    return { suspicious: true, reason: 'Suspicious activity detected from this IP' };
  }
  
  return { suspicious: false };
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
      totalSessionTime,
      averageQuestionTime,
      isPro,
      userTier,
      deviceFingerprint,
      ipAddress
    } = body;

    if (!userId) {
      return NextResponse.json({ 
        reward: 0, 
        error: 'User authentication required' 
      }, { status: 401 });
    }

    // Extract IP from request headers
    const clientIP = ipAddress || 
      req.headers.get('x-forwarded-for')?.split(',')[0] || 
      req.headers.get('x-real-ip') || 
      'unknown';

    // IP abuse detection
    const ipCheck = detectIPAbuse(clientIP);
    if (ipCheck.suspicious) {
      return NextResponse.json({ 
        reward: 0, 
        error: 'Security check failed',
        warning: ipCheck.reason 
      }, { status: 403 });
    }

    // Rate limiting
    const rateLimitCheck = checkRateLimit(userId, deviceFingerprint);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json({ 
        reward: 0, 
        error: rateLimitCheck.reason 
      }, { status: 429 });
    }

    // Validate input ranges to prevent injection
    if (
      (dailyQuestionsAnswered && (dailyQuestionsAnswered < 0 || dailyQuestionsAnswered > 1000)) ||
      (dailyTestsFinished && (dailyTestsFinished < 0 || dailyTestsFinished > 100)) ||
      (mistakesReviewed && (mistakesReviewed < 0 || mistakesReviewed > 500)) ||
      (streakCount && (streakCount < 0 || streakCount > 365)) ||
      (dailyCreditEarned && (dailyCreditEarned < 0 || dailyCreditEarned > 1000))
    ) {
      return NextResponse.json({ 
        reward: 0, 
        error: 'Invalid input values detected' 
      }, { status: 400 });
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
      totalSessionTime: totalSessionTime || 0,
      averageQuestionTime: averageQuestionTime || 0,
      isPro: isPro || false,
      userTier: userTier || 'Bronze',
      deviceFingerprint,
      ipAddress: clientIP
    });

    // Log abuse flags for monitoring (in production, send to monitoring service)
    if (result.abuseFlags && result.abuseFlags.length > 0) {
      console.warn(`Abuse detected for user ${userId}:`, {
        flags: result.abuseFlags,
        ip: clientIP,
        deviceFingerprint,
        timestamp: new Date().toISOString()
      });
    }

    // Add security headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });

    return NextResponse.json(result, { headers });
  } catch (error: any) {
    console.error('Daily task processing error:', error);
    return NextResponse.json({ 
      reward: 0, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
}
