# Economy Balance & Profitability Plan

## Executive Summary
The system aims to make profit from ads and pro users while covering AI API costs. Currently, the monetization infrastructure is incomplete - there's no actual ad implementation or payment system.

---

## Phase 1: Monetization Infrastructure (Priority: HIGH)

### 1.1 Ad Integration (Revenue Source #1)
**Status:** NOT IMPLEMENTED
**Action:** Integrate Google AdMob

```typescript
// Required packages:
// npm install @react-native/google-mobile-ads

// NEW: src/lib/ad-config.ts
export const AD_CONFIG = {
  // Rewarded Ads (earn credits/XP by watching)
  REWARDED_AD_UNIT: 'ca-app-pub-xxxxxxxxxxxx/xxxxxxxxxx',
  
  // Interstitial Ads (between questions)
  INTERSTITIAL_AD_UNIT: 'ca-app-pub-xxxxxxxxxxxx/xxxxxxxxxx',
  
  // Banner Ads (passive display)
  BANNER_AD_UNIT: 'ca-app-pub-xxxxxxxxxxxx/xxxxxxxxxx',
  
  // Earning rates
  REWARDED_AD_CREDITS: 3,      // Credits per ad watch
  REWARDED_AD_XP: 30,          // XP per ad watch
  INTERSTITIAL_COOLDOWN: 5 * 60 * 1000, // 5 minutes between interstitials
  
  // Daily limits (user-friendly)
  MAX_REWARDED_ADS_PER_DAY: 20,
  MAX_INTERSTITIALS_PER_DAY: 10,
};

export const AD_REVENUE_ESTIMATE = {
  // Industry averages (CPM - cost per 1000 impressions)
  REWARDED_AD_CPM: 10.00,      // $10 per 1000 rewarded ad completions
  INTERSTITIAL_CPM: 5.00,      // $5 per 1000 interstitial views
  BANNER_CPM: 2.00,            // $2 per 1000 banner impressions
  
  // Target: Cover AI API costs
  AI_API_COST_PER_USER_PER_MONTH: 0.50, // Estimate
  BREAK_EVEN_USERS_PER_1000: 50, // 50 daily active users at 20 ads each
};
```

### 1.2 Pro Subscription System (Revenue Source #2)
**Status:** Flag exists but NO payment system
**Action:** Implement Stripe integration

```typescript
// NEW: src/lib/pro-subscriptions.ts
export const PRO_TIERS = {
  MONTHLY: {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    price: 4.99, // $4.99/month
    features: [
      'Unlimited AI explanations',
      'No ads (or 75% ad revenue share)',
      '2x XP multiplier',
      'Exclusive Pro-only events',
      'Priority support',
      'Custom avatar frame',
    ],
    benefits: {
      unlimitedAiUsage: true,
      noAds: false,
      xpMultiplier: 2.0,
      dailyCreditBonus: 50,
      maxDailyAds: 20, // Still allow earning
    },
  },
  YEARLY: {
    id: 'pro_yearly',
    name: 'Pro Yearly',
    price: 39.99, // $39.99/year (save 33%)
    features: [
      'All Monthly features',
      '2 months free',
      'Exclusive yearly challenges',
      'Lifetime achievement badges',
    ],
    benefits: {
      unlimitedAiUsage: true,
      noAds: true,
      xpMultiplier: 2.5,
      dailyCreditBonus: 100,
    },
  },
  LIFETIME: {
    id: 'pro_lifetime',
    name: 'Lifetime Pro',
    price: 149.99, // One-time
    features: [
      'All Yearly features',
      'Forever ad-free',
      'VIP badge',
      'Name in credits',
    ],
    benefits: {
      unlimitedAiUsage: true,
      noAds: true,
      xpMultiplier: 3.0,
      dailyCreditBonus: 200,
    },
  },
};
```

---

## Phase 2: AI Cost Management (Priority: HIGH)

### 2.1 AI Usage Tracking & Cost Controls

```typescript
// NEW: src/lib/ai-cost-manager.ts
export const AI_COST_TRACKING = {
  // Google GenAI pricing (approximate)
  INPUT_COST_PER_1K: 0.000125,  // $0.000125 per 1K input tokens
  OUTPUT_COST_PER_1K: 0.0005,   // $0.0005 per 1K output tokens
  
  // Estimated cost per feature
  COST_PER_DAILY_TASK: 0.001,    // ~$0.001 per daily task processing
  COST_PER_EXPLANATION: 0.002,   // ~$0.002 per question explanation
  COST_PER_PERFORMANCE_SUMMARY: 0.005, // ~$0.005 per weekly summary
  
  // Free tier limits (cover with ads)
  FREE_DAILY_AI_LIMIT: 5,
  FREE_MONTHLY_AI_VALUE: 0.15, // $0.15/month free
  
  // Pro unlocks
  PRO_MONTHLY_INCLUDED_VALUE: 2.00, // $2/month worth of AI
  PRO_YEARLY_INCLUDED_VALUE: 24.00, // $24/year worth of AI
};

// NEW: AI usage pricing for non-Pro users
export const AI_FEATURE_COSTS = {
  EXPLANATION_BASIC: 3,       // Credits per explanation
  EXPLANATION_DEEP: 5,        // Credits per deep dive
  PERFORMANCE_SUMMARY_WEEKLY: 10,
  PERFORMANCE_SUMMARY_MONTHLY: 25,
  PERSONALIZED_RECOMMENDATION: 15,
};

export const AI_EARNING_RATES = {
  // How users can earn credits for AI
  CORRECT_ANSWER: 2,          // 2 credits per correct answer
  MISTAKE_REVIEW: 3,          // 3 credits per mistake review
  DAILY_TASK_BONUS: 20,       // 20 credits for daily tasks
  STREAK_BONUS: 10,           // 10 credits per streak milestone
  REFERRAL_BONUS: 50,         // 50 credits per successful referral
};
```

### 2.2 AI Usage Tracking in User Profile

```typescript
// Add to UserProfile interface in use-user.tsx
interface ExtendedUserProfile {
  // ... existing fields
  aiCreditsUsedToday?: number;
  aiCreditsUsedThisMonth?: number;
  totalAiCreditsSpent?: number;
  aiSubscriptionActive?: boolean;
  aiSubscriptionExpiry?: number;
  lifetimeAiValue?: number; // Track total AI value consumed
}
```

---

## Phase 3: Economy Balance (Priority: MEDIUM)

### 3.1 Revised Reward Structure

```typescript
// UPDATED: src/lib/xp-system.ts

export const XP_REWARDS = {
  // Base rewards (reduced from previous)
  CORRECT_ANSWER: 10,          // Was 15
  FINISH_TRACK: 100,          // Was 150
  FINISH_FULL_SIM: 500,       // Was 750
  MISTAKE_REVIEW: 30,         // Was 50
  AD_WATCH_XP: 30,            // Same (incentivize ad watching)
  QUICK_FIRE_COMPLETE: 40,   // Was 60
  DAILY_STREAK_BONUS: 50,     // Was 100
  QUESTION_OF_THE_DAY: 20,    // Was 30
  DAILY_LOGIN_BONUS: 30,      // Was 50
  POMODORO_COMPLETE: 25,      // Was 40
  ACHIEVEMENT_UNLOCK: 150,    // Was 250
  PERSONAL_BEST: 100,         // Was 200
  
  // Skill Expression
  CONFIDENT_CORRECT_BONUS: 10,  // Was 15
  CONFIDENT_WRONG_PENALTY: -5, // Was -10
};

// NEW: Pro multipliers
export const PRO_MULTIPLIERS = {
  XP_MULTIPLIER_MONTHLY: 2.0,
  XP_MULTIPLIER_YEARLY: 2.5,
  XP_MULTIPLIER_LIFETIME: 3.0,
  CREDIT_BONUS_PER_DAY: {
    MONTHLY: 50,
    YEARLY: 100,
    LIFETIME: 200,
  },
};

// NEW: Creditable actions for AI spending
export const CREDIT_EARNING = {
  // Passive earning
  DAILY_LOGIN: 10,
  DAILY_TASK_COMPLETE: 20,
  STREAK_MILESTONE: 50,  // Every 7 days
  
  // Active earning
  CORRECT_ANSWER: 2,
  FINISH_MOCK_TEST: 25,
  PERFECT_SCORE_BONUS: 100,
  
  // Engagement earning
  REFERRAL_SIGNUP: 25,
  REFERRAL_COMPLETE: 50,
};
```

### 3.2 Daily Limits Balancing

```typescript
// NEW: src/lib/daily-limits.ts
export const DAILY_LIMITS = {
  FREE_USER: {
    questions: 50,
    mockTests: 3,
    aiExplanations: 5,
    rewardedAds: 20,
    creditsEarned: 150,
    xpPerDay: 500,
  },
  PRO_MONTHLY: {
    questions: 200,
    mockTests: 10,
    aiExplanations: 50,
    rewardedAds: 20, // Can still earn
    creditsEarned: 500,
    xpPerDay: 2000,
  },
  PRO_YEARLY: {
    questions: 999999, // Unlimited
    mockTests: 999999,
    aiExplanations: 100,
    rewardedAds: 20,
    creditsEarned: 1000,
    xpPerDay: 5000,
  },
  PRO_LIFETIME: {
    questions: 999999,
    mockTests: 999999,
    aiExplanations: 999999,
    rewardedAds: 20,
    creditsEarned: 999999,
    xpPerDay: 999999,
  },
};
```

---

## Phase 4: Profitability Calculator (Priority: MEDIUM)

### 4.1 Revenue vs Cost Dashboard

```typescript
// NEW: src/lib/profitability.ts
export const PROFITABILITY_TARGETS = {
  // Monthly goals
  MINIMUM_VIABLE_USERS: 1000,    // Minimum users for ad revenue
  TARGET_PRO_USERS: 50,           // Target Pro subscriptions
  TARGET_PRO_USERS_YEARLY: 200,  // Target yearly subscribers
  
  // Revenue per user (RPUs)
  RPU_ADS_MONTHLY: 0.50,          // Revenue per user from ads
  RPU_PRO_MONTHLY: 4.99,         // Pro monthly subscription
  RPU_PRO_YEARLY: 39.99,         // Pro yearly subscription
  
  // Cost per user
  CPU_AI_MONTHLY: 0.15,          // AI API cost per user
  CPU_SERVER_MONTHLY: 0.05,      // Server costs per user
  
  // Break-even calculation
  BREAK_EVEN_PRO_USERS: 30,       // Need ~30 Pro users to cover 1000 free users' AI costs
};

export function calculateProfitability(users: {
  free: number;
  proMonthly: number;
  proYearly: number;
  proLifetime: number;
  dailyAdViews: number;
}) {
  const adRevenue = users.dailyAdViews * 30 * PROFITABILITY_TARGETS.RPU_ADS_MONTHLY;
  const subRevenue = 
    users.proMonthly * PROFITABILITY_TARGETS.RPU_PRO_MONTHLY +
    users.proYearly / 12 * PROFITABILITY_TARGETS.RPU_PRO_YEARLY; // Normalize to monthly
  
  const totalUsers = users.free + users.proMonthly + users.proYearly + users.proLifetime;
  const aiCost = totalUsers * PROFITABILITY_TARGETS.CPU_AI_MONTHLY;
  const serverCost = totalUsers * PROFITABILITY_TARGETS.CPU_SERVER_MONTHLY;
  
  const totalRevenue = adRevenue + subRevenue;
  const totalCost = aiCost + serverCost;
  const profit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  
  return {
    revenue: totalRevenue,
    cost: totalCost,
    profit,
    margin,
    isProfitable: profit > 0,
    revenueBreakdown: { adRevenue, subRevenue },
    costBreakdown: { aiCost, serverCost },
  };
}
```

---

## Phase 5: Implementation Order

### Step 1: Ad Integration (Week 1-2)
- [ ] Set up Google AdMob account
- [ ] Install @react-native/google-mobile-ads
- [ ] Create AdComponent wrapper
- [ ] Implement rewarded ad for XP/credits
- [ ] Implement interstitial ads between questions
- [ ] Add banner ads to dashboard

### Step 2: Payment Integration (Week 2-3)
- [ ] Set up Stripe account
- [ ] Create Stripe products (Monthly, Yearly, Lifetime)
- [ ] Implement subscription checkout flow
- [ ] Create webhook handler for subscription events
- [ ] Update user profile with subscription status

### 3. AI Cost Controls (Week 3)
- [ ] Implement AI credit system
- [ ] Add AI usage tracking to user profile
- [ ] Create AI pricing page
- [ ] Implement paywall for excessive AI usage

### 4. Economy Refinement (Week 4)
- [ ] Adjust XP/credit rewards based on metrics
- [ ] Implement Pro-only benefits
- [ ] Add referral system with proper tracking
- [ ] Create profitability dashboard

---

## Expected Financial Outcomes

| Metric | Month 1 | Month 3 | Month 6 |
|--------|---------|---------|---------|
| Free Users | 1,000 | 5,000 | 15,000 |
| Pro Users | 10 | 50 | 200 |
| Ad Revenue | $500 | $2,500 | $7,500 |
| Pro Revenue | $50 | $250 | $1,000 |
| AI Costs | $150 | $750 | $2,250 |
| Server Costs | $50 | $250 | $750 |
| **Profit** | **$350** | **$1,750** | **$5,500** |

---

## Files to Create/Modify

### New Files:
- `src/lib/ad-config.ts` - Ad configuration
- `src/lib/pro-subscriptions.ts` - Pro subscription tiers
- `src/lib/ai-cost-manager.ts` - AI cost tracking
- `src/lib/daily-limits.ts` - Daily limits by tier
- `src/lib/profitability.ts` - Profitability calculations
- `src/components/ads/` - Ad components directory
- `src/components/ui/pro-upgrade-dialog.tsx` - Pro upgrade UI
- `src/components/ui/ai-credits-purchase.tsx` - AI credits purchase
- `src/app/api/stripe/` - Stripe API routes

### Modified Files:
- `src/lib/xp-system.ts` - Update rewards, add Pro multipliers
- `src/firebase/auth/use-user.tsx` - Add subscription fields
- `src/components/ui/dashboard-stats.tsx` - Add revenue stats
- `functions/src/index.ts` - Add Stripe webhook handler

