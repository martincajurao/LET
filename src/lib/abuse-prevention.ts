/**
 * Abuse Prevention and Quality Monitoring System
 * Implements comprehensive anti-abuse mechanisms for the LET practice platform.
 * Enhanced with Trust Scoring and Behavioral Pacing.
 */

export interface AbuseDetectionResult {
  isSuspicious: boolean;
  flags: string[];
  severity: 'low' | 'medium' | 'high';
  recommendations: string[];
  shouldBlock: boolean;
  trustMultiplier: number;
}

export interface UserActivityMetrics {
  totalQuestionsAnswered: number;
  averageQuestionTime: number;
  totalSessionTime: number;
  questionsPerHour: number;
  sessionDuration: number;
  deviceFingerprint: string;
  ipAddress: string;
  lastActiveTime: number;
  streakCount: number;
}

export interface QualityMetrics {
  engagementScore: number;    // 0-100 based on time and volume
  consistencyScore: number;  // 0-100 based on regularity
  learningScore: number;     // 0-100 based on thoughtful responses
  overallQuality: number;    // Weighted average
  improvementRate: number;   // Historical progress
}

class AbusePreventionSystem {
  private static instance: AbusePreventionSystem;
  private suspiciousIPs = new Set<string>();
  private deviceFingerprints = new Map<string, { count: number; lastSeen: number }>();
  private rateLimits = new Map<string, { count: number; resetTime: number }>();

  private constructor() {
    this.initializeSuspiciousIPs();
  }

  public static getInstance(): AbusePreventionSystem {
    if (!AbusePreventionSystem.instance) {
      AbusePreventionSystem.instance = new AbusePreventionSystem();
    }
    return AbusePreventionSystem.instance;
  }

  private initializeSuspiciousIPs() {
    // In production, load from database
    this.suspiciousIPs.add('127.0.0.1'); 
  }

  /**
   * Comprehensive abuse detection based on user activity patterns.
   * Returns a trustMultiplier that directly scales rewards.
   */
  public detectAbuse(userId: string, metrics: UserActivityMetrics): AbuseDetectionResult {
    const flags: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';
    let trustMultiplier = 1.0;

    // 1. Speed Abuse Detection (Strict)
    if (metrics.averageQuestionTime < 3 && metrics.totalQuestionsAnswered > 5) {
      flags.push('suspicious_speed');
      severity = 'high';
      trustMultiplier = 0.2; // 80% penalty
    } else if (metrics.averageQuestionTime < 8) {
      flags.push('low_engagement');
      severity = 'medium';
      trustMultiplier = 0.6;
    } else if (metrics.averageQuestionTime >= 15 && metrics.averageQuestionTime <= 120) {
      trustMultiplier = 1.2; // Quality bonus
    }

    // 2. Volume Abuse Detection
    if (metrics.questionsPerHour > 150) {
      flags.push('bot_volume');
      severity = 'high';
      trustMultiplier = Math.min(trustMultiplier, 0.1);
    }

    // 3. Multi-Account Prevention
    if (metrics.deviceFingerprint) {
      const deviceInfo = this.deviceFingerprints.get(metrics.deviceFingerprint);
      if (deviceInfo && deviceInfo.count > 3) {
        flags.push('multi_account_device');
        severity = 'high';
      }
    }

    // 4. Streak Manipulation Check
    const now = Date.now();
    const daysSinceLast = (now - metrics.lastActiveTime) / (1000 * 60 * 60 * 24);
    if (daysSinceLast > 2 && metrics.streakCount > 0) {
      flags.push('streak_anomaly');
      severity = 'medium';
    }

    const isSuspicious = flags.length > 0;
    const shouldBlock = severity === 'high' && flags.length > 1;

    return {
      isSuspicious,
      flags,
      severity,
      recommendations: this.generateRecommendations(flags),
      shouldBlock,
      trustMultiplier
    };
  }

  /**
   * Calculate detailed quality metrics for the user dashboard.
   */
  public calculateQualityScore(metrics: UserActivityMetrics): QualityMetrics {
    const timeFactor = Math.min(metrics.averageQuestionTime / 30, 1); // Max score at 30s
    const volumeFactor = Math.min(metrics.totalQuestionsAnswered / 50, 1);
    
    const engagementScore = Math.round(timeFactor * 60 + volumeFactor * 40);
    const consistencyScore = metrics.streakCount > 7 ? 100 : (metrics.streakCount / 7) * 100;
    const learningScore = metrics.averageQuestionTime > 15 ? 90 : 40;
    
    const overallQuality = (engagementScore * 0.4) + (consistencyScore * 0.3) + (learningScore * 0.3);

    return {
      engagementScore,
      consistencyScore,
      learningScore,
      overallQuality,
      improvementRate: 0
    };
  }

  private generateRecommendations(flags: string[]): string[] {
    const recommendations: string[] = [];
    if (flags.includes('suspicious_speed')) recommendations.push('Read pedagogical explanations carefully.');
    if (flags.includes('bot_volume')) recommendations.push('Maintain a steady study pace.');
    if (flags.includes('multi_account_device')) recommendations.push('Multiple accounts per device are restricted.');
    return recommendations;
  }

  public checkRateLimit(userId: string, action: string, limit: number, windowMs: number = 3600000): { allowed: boolean; resetTime?: number } {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const existing = this.rateLimits.get(key);
    
    if (!existing || now > existing.resetTime) {
      this.rateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true };
    }
    
    if (existing.count >= limit) {
      return { allowed: false, resetTime: existing.resetTime };
    }
    
    existing.count++;
    return { allowed: true };
  }
}

export const abusePrevention = AbusePreventionSystem.getInstance();
