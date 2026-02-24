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
    // For now, using example patterns
    this.suspiciousIPs.add('127.0.0.1'); // localhost for testing
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

    // 8. Credit Farming Patterns
    if (this.detectCreditFarming(metrics)) {
      flags.push('credit_farming');
      severity = 'medium';
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
    // Engagement Score (0-100)
    const engagementScore = this.calculateEngagementScore(metrics);

    // Consistency Score (0-100)
    const consistencyScore = this.calculateConsistencyScore(metrics);

    // Learning Score (0-100)
    const learningScore = this.calculateLearningScore(metrics);

    // Overall Quality Score
    const overallQuality = (engagementScore + consistencyScore + learningScore) / 3;

    // Improvement Rate (based on historical data)
    const improvementRate = this.calculateImprovementRate(userId, metrics);

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

    // Time-based engagement (optimal 10-120 seconds per question)
    if (metrics.averageQuestionTime >= 10 && metrics.averageQuestionTime <= 120) {
      score += 40;
    } else if (metrics.averageQuestionTime >= 5 && metrics.averageQuestionTime <= 180) {
      score += 25;
    } else {
      score += 10;
    }

    // Session duration engagement (optimal 30-90 minutes)
    if (metrics.sessionDuration >= 1800 && metrics.sessionDuration <= 5400) {
      score += 30;
    } else if (metrics.sessionDuration >= 900 && metrics.sessionDuration <= 7200) {
      score += 20;
    } else {
      score += 10;
    }

    // Volume engagement (reasonable daily activity)
    if (metrics.questionsPerHour >= 10 && metrics.questionsPerHour <= 30) {
      score += 30;
    } else if (metrics.questionsPerHour >= 5 && metrics.questionsPerHour <= 50) {
      score += 20;
    } else {
      score += 5;
    }

    return Math.min(score, 100);
  }

  private calculateConsistencyScore(metrics: UserActivityMetrics): number {
    let score = 50; // Base score

    // Consistent session timing
    if (metrics.averageQuestionTime >= 10 && metrics.averageQuestionTime <= 120) {
      score += 30;
    }

    // Regular activity patterns
    if (metrics.totalSessionTime > 0 && metrics.questionsPerHour <= 40) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  private calculateLearningScore(metrics: UserActivityMetrics): number {
    let score = 50; // Base score

    // Learning indicators (taking time to think)
    if (metrics.averageQuestionTime >= 15 && metrics.averageQuestionTime <= 90) {
      score += 30;
    }

    // Appropriate session length for learning
    if (metrics.sessionDuration >= 1200 && metrics.sessionDuration <= 3600) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  private calculateImprovementRate(userId: string, metrics: UserActivityMetrics): number {
    const history = this.userActivityHistory.get(userId);
    if (!history || history.length < 2) return 0;

    const recent = history[history.length - 1];
    const previous = history[history.length - 2];

    // Calculate improvement based on quality metrics
    const recentQuality = this.calculateQualityScore(recent);
    const previousQuality = this.calculateQualityScore(previous);

    return Math.min(((recentQuality.overallQuality - previousQuality.overallQuality) / previousQuality.overallQuality) * 100, 100);
  }

  private detectBotBehavior(metrics: UserActivityMetrics): boolean {
    // Perfect timing patterns (too consistent)
    if (metrics.averageQuestionTime < 2 && metrics.totalQuestionsAnswered > 50) {
      return true;
    }

    // Unhuman speed
    if (metrics.questionsPerHour > 200) {
      return true;
    }

    // No breaks (continuous activity)
    if (metrics.sessionDuration > 18000) { // > 5 hours straight
      return true;
    }

    return false;
  }

  private detectCreditFarming(metrics: UserActivityMetrics): boolean {
    // Quick completion of daily tasks repeatedly
    if (metrics.questionsPerHour > 80 && metrics.averageQuestionTime < 5) {
      return true;
    }

    // Pattern of minimum required activity only
    if (metrics.totalQuestionsAnswered >= 20 && metrics.averageQuestionTime < 3) {
      return true;
    }

    return false;
  }

  private generateRecommendations(flags: string[]): string[] {
    const recommendations: string[] = [];

    if (flags.includes('suspicious_speed')) {
      recommendations.push('Take time to read each question carefully');
    }

    if (flags.includes('excessive_volume')) {
      recommendations.push('Consider taking breaks between study sessions');
    }

    if (flags.includes('excessive_session_duration')) {
      recommendations.push('Rest is important for effective learning');
    }

    if (flags.includes('multiple_accounts_device')) {
      recommendations.push('Use one account per device for best experience');
    }

    if (flags.includes('bot_behavior')) {
      recommendations.push('Human-paced learning is most effective');
    }

    if (flags.includes('credit_farming')) {
      recommendations.push('Focus on understanding rather than speed');
    }

    if (flags.includes('streak_manipulation')) {
      recommendations.push('Maintain consistent daily activity');
    }

    return recommendations;
  }

  /**
   * Update device fingerprint tracking
   */
  public updateDeviceFingerprint(userId: string, fingerprint: string): void {
    const existing = this.deviceFingerprints.get(fingerprint) || { count: 0, lastSeen: 0 };
    existing.count++;
    existing.lastSeen = Date.now();
    this.deviceFingerprints.set(fingerprint, existing);
  }

  /**
   * Check rate limits for user actions
   */
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

  /**
   * Record user activity for historical analysis
   */
  public recordActivity(userId: string, metrics: UserActivityMetrics): void {
    const history = this.userActivityHistory.get(userId) || [];
    history.push(metrics);
    
    // Keep only last 30 days of activity
    if (history.length > 30) {
      history.shift();
    }
    
    this.userActivityHistory.set(userId, history);
  }

  /**
   * Get user activity history
   */
  public getActivityHistory(userId: string): UserActivityMetrics[] {
    return this.userActivityHistory.get(userId) || [];
  }

  /**
   * Clear old data to prevent memory leaks
   */
  public cleanup(): void {
    const now = Date.now();
    
    // Clean old rate limits
    for (const [key, limit] of this.rateLimits.entries()) {
      if (now > limit.resetTime) {
        this.rateLimits.delete(key);
      }
    }

    // Clean old device fingerprints
    for (const [fingerprint, info] of this.deviceFingerprints.entries()) {
      if (now - info.lastSeen > 86400000) { // 24 hours
        this.deviceFingerprints.delete(fingerprint);
      }
    }
  }
}

// Export singleton instance
export const abusePrevention = AbusePreventionSystem.getInstance();
