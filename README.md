
# LET's Prep - Gamified Teacher Board Exam Simulator

A full-stack, gamified web application for teachers preparing for the Licensure Examination for Teachers (LET). Built with Next.js, Firebase, Puter AI, and ShadCN UI.

## 🚀 Developer Setup

To connect your local environment to Git and GitHub with your credentials, run the following commands in your terminal:

```bash
git config --global user.email "martincajurao@gmail.com"
git config --global user.name "Martin Cajurao"
git config --global pull.ff only
```

## 🎯 Features

### 1. AI Credit Economy System
- Virtual currency: AI Credits.
- **Free Users**:
  - 1 AI explanation = 2 credits.
  - 1 rewarded ad = 3 credits.
  - Max 20 AI explanations/day, 5 ads/day, 50 credits earnable/day.
- **Pro Users**: Unlimited AI, no ads, advanced analytics.

### 2. Puter AI (GPT-5 Nano) Integration
- "Explain with AI" per question.
- Structured pedagogical reasoning: Correct Answer, Why Correct, Why Others Wrong.
- 5-second cooldown and Firestore caching for cost efficiency.

### 3. Gamification & Retention
- **Daily Tasks**: Credits for practicing questions, finishing tests, and reviewing mistakes.
- **Streak System**: Track daily activity with bonus credits for 3 and 7-day streaks.
- **Event Mode**: Weekly Challenges, Daily Speed Battles, and Monthly Masters competitions.
- **Referral System**: Unique invite codes with milestone rewards (Credits and Pro trials).

### 4. Monetization & Growth
- **Ad-Gated Content**: Detailed analysis and AI explanations require rewarded ads for free users.
- **Pro Subscriptions**: Stripe integration for unlimited access.
- **Global Leaderboard**: Competitive ranking based on simulation scores.

## 🛠 Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + ShadCN UI
- **Backend**: Firebase Auth, Firestore, Server Actions
- **AI**: Puter.js SDK (GPT-5 Nano)

## 🔒 Abuse Protection
- Server-side credit validation and cooldown enforcement.
- IP/Device tracking for referrals.
- Anti-refresh and realistic test duration detection.
