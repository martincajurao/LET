/**
 * Abuse Prevention and Quality Monitoring System
 * Implements comprehensive anti-abuse mechanisms for the LET practice platform
 */

export interface AbuseDetectionResult {
  isSuspicious: boolean;
  flags: string[];
  severity: 'low' | 'medium' | 'high';
  recommendations: string[];
  shouldBlock: boolean;
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
  engagementScore: number;
  consistencyScore: number;
  learningScore: number;
  overallQuality: number;
  improvementRate: number;
}

class AbusePreventionSystem {
  private static instance: AbusePreventionSystem;
  private suspiciousIPs = new Set<string>();
  private deviceFingerprints = new Map<string, { count: number; lastSeen: number }>();
  private userActivityHistory = new Map<string, UserActivityMetrics[]>();
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
    // In production, load from database or external service
    this.suspiciousIPs.add('127.0.0.1'); 
  }

  /**
   * Comprehensive abuse detection based on user activity patterns
   */
  public detectAbuse(userId: string, metrics: UserActivityMetrics): AbuseDetectionResult {
    const flags: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    // 1. Speed Abuse Detection
    if (metrics.averageQuestionTime < 3 && metrics.totalQuestionsAnswered > 10) {
      flags.push('suspicious_speed');
      severity = 'medium';
    }

    // 2. Volume Abuse Detection
    if (metrics.questionsPerHour > 100) {
      flags.push('excessive_volume');
      severity = 'high';
    } else if (metrics.questionsPerHour > 60) {
      flags.push('high_volume');
      severity = 'medium';
    }

    // 3. Session Abuse Detection
    if (metrics.sessionDuration > 14400) { // > 4 hours continuous
      flags.push('excessive_session_duration');
      severity = 'medium';
    }

    // 4. Device Fingerprint Abuse
    const deviceInfo = this.deviceFingerprints.get(metrics.deviceFingerprint);
    if (deviceInfo && deviceInfo.count > 5) {
      flags.push('multiple_accounts_device');
      severity = 'high';
    }

    // 5. IP-based Abuse Detection
    if (this.suspiciousIPs.has(metrics.ipAddress)) {
      flags.push('suspicious_ip');
      severity = 'high';
    }

    // 6. Streak Manipulation
    if (metrics.streakCount > 30) {
      const daysSinceLastActive = (Date.now() - metrics.lastActiveTime) / (1000 * 60 * 60 * 24);
      if (daysSinceLastActive > 2) {
        flags.push('streak_manipulation');
        severity = 'medium';
      }
    }

    // 7. Bot-like Behavior
    if (this.detectBotBehavior(metrics)) {
      flags.push('bot_behavior');
      severity = 'high';
    }

    const isSuspicious = flags.length > 0;
    const shouldBlock = severity === 'high' || (severity === 'medium' && flags.length > 2);

    return {
      isSuspicious,
      flags,
      severity,
      recommendations: this.generateRecommendations(flags),
      shouldBlock
    };
  }

  /**
   * Calculate quality metrics based on user engagement patterns
   */
  public calculateQualityScore(metrics: UserActivityMetrics): QualityMetrics {
    const engagementScore = this.calculateEngagementScore(metrics);
    const consistencyScore = this.calculateConsistencyScore(metrics);
    const learningScore = this.calculateLearningScore(metrics);
    const overallQuality = (engagementScore + consistencyScore + learningScore) / 3;
    const improvementRate = 0; 

    return {
      engagementScore,
      consistencyScore,
      learningScore,
      overallQuality,
      improvementRate
    };
  }

  private calculateEngagementScore(metrics: UserActivityMetrics): number {
    let score = 0;
    if (metrics.averageQuestionTime >= 10 && metrics.averageQuestionTime <= 120) {
      score += 40;
    } else if (metrics.averageQuestionTime >= 5 && metrics.averageQuestionTime <= 180) {
      score += 25;
    } else {
      score += 10;
    }
    return Math.min(score, 100);
  }

  private calculateConsistencyScore(metrics: UserActivityMetrics): number {
    let score = 50; 
    if (metrics.averageQuestionTime >= 10 && metrics.averageQuestionTime <= 120) {
      score += 30;
    }
    return Math.min(score, 100);
  }

  private calculateLearningScore(metrics: UserActivityMetrics): number {
    let score = 50; 
    if (metrics.averageQuestionTime >= 15 && metrics.averageQuestionTime <= 90) {
      score += 30;
    }
    return Math.min(score, 100);
  }

  private detectBotBehavior(metrics: UserActivityMetrics): boolean {
    if (metrics.averageQuestionTime < 2 && metrics.totalQuestionsAnswered > 50) {
      return true;
    }
    if (metrics.questionsPerHour > 200) {
      return true;
    }
    return false;
  }

  private generateRecommendations(flags: string[]): string[] {
    const recommendations: string[] = [];
    if (flags.includes('suspicious_speed')) recommendations.push('Take time to read each question carefully');
    if (flags.includes('excessive_volume')) recommendations.push('Consider taking breaks between study sessions');
    if (flags.includes('bot_behavior')) recommendations.push('Human-paced learning is most effective');
    return recommendations;
  }

  public checkRateLimit(userId: string, action: string, limit: number, windowMs: number = 3600000): { allowed: boolean; resetTime?: number } {
    const key = `${userId}:${action}`;
    const existing = this.rateLimits.get(key);
    if (!existing || Date.now() > existing.resetTime) {
      this.rateLimits.set(key, { count: 1, resetTime: Date.now() + windowMs });
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
