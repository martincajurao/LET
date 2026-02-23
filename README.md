EXTEND EXISTING LET WEB APP (FULL GAMIFIED SYSTEM)

Modify the existing LET Practice Web App.

IMPORTANT:

Do NOT rebuild the app.

Do NOT remove existing features.

Extend the current Firebase architecture only.

Keep system modular and scalable.

Optimize for cost efficiency and abuse prevention.

The app already has:

150-question mock tests per category

Randomized questions

Score percentage display

Leaderboard

Firebase backend (Firestore)

Web-based UI (dark mode supported)

We are adding engagement + monetization + growth features.

1️⃣ AI CREDIT ECONOMY SYSTEM

Create a virtual currency called AI Credits.

Rules (Free Users):

1 AI explanation = 2 credits

1 rewarded ad = 3 credits

Max 20 AI explanations per day

Max 5 rewarded ads per day

Max 50 credits earnable per day

Pro Users:

Unlimited AI explanations

No ads

Instant result analytics

Advanced performance insights

Display credit balance in navbar.

Use Firebase Anonymous Auth if no login.

All credit transactions must be handled via Cloud Functions only.

2️⃣ GEMINI 2.5 FLASH INTEGRATION (COST CONTROLLED)

Add “Explain with AI” button per question.

Requirements:

Max 250 words

Structured output:

Correct Answer

Why Correct

Why Others Wrong

5-second cooldown per user

Cache explanation by questionId in Firestore

ALWAYS check cache before API call

Track dailyAiUsage

Deduct credits BEFORE API call

All Gemini calls must go through Cloud Functions.
Never expose API key in frontend.

Use minimal prompt:

“You are an LET review assistant. Explain briefly (max 250 words). Structure:

Correct Answer

Why Correct

Why Others Wrong.
Be concise.”

Only send:

Question

Choices

Correct answer

3️⃣ LOCK DETAILED RESULTS BEHIND AD (FREE USERS)

After finishing a full mock test:

Free Users:

Show basic percentage

Show “Unlock Full Analysis (Watch Ad)” button

Unlock detailed breakdown after successful ad

Pro Users:

Immediate access

No ads

4️⃣ DAILY TASK SYSTEM

Add Daily Task dashboard.

Tasks:

Complete 20 questions → +5 credits

Finish 1 mock test → +10 credits

Review 10 wrong answers → +5 credits

3-day streak → +15 credits

7-day streak → +30 credits

Reset every 24h using server timestamp.
Track:

streakCount

lastActiveDate

lastTaskReset

5️⃣ EVENT / COMPETITION MODE (EXTEND LEADERBOARD)

Add time-based competitions.

Create:

events/{eventId}

title

category

questionCount

startTime

endTime

rewardType

rewardAmount

isActive

event_leaderboard/{eventId}/participants/{userId}

score

accuracy

timeSpent

submittedAt

Ranking:

Highest score

Highest accuracy

Lowest timeSpent

Reward distribution handled via Cloud Function at event end.

Event types:

Weekly Challenge

Daily Speed Battle

Monthly LET Masters

Free Users:

1 free entry/day

Extra entry = Watch Ad or 5 credits

Pro Users:

Unlimited entries

6️⃣ REFERRAL SYSTEM

Generate unique referralCode per user.

users/{userId}

referralCode

referredBy

referralCount

referralCreditsEarned

referralTier

Rules:

Referrer gets +10 credits

New user gets +5 credits

Reward only after new user completes 1 full mock test

No self-referral

Reward only once per referred user

Milestones:

5 referrals → +20 credits

10 referrals → 3-day Pro trial

25 referrals → +100 credits

50 referrals → special badge

Add referral leaderboard (monthly reset).

All referral rewards must be server validated.

7️⃣ WEB ADS INTEGRATION

Use Google AdSense (rewarded/interstitial).

Rules:

Grant reward only after ad completion event

Prevent duplicate rewards

Store dailyAdCount

Handle ad failure safely

8️⃣ PRO SUBSCRIPTION (WEB)

Integrate Stripe monthly subscription.

Benefits:

Unlimited AI

No ads

Full analytics

Priority AI

Subscription validation must be server verified.

9️⃣ ABUSE PROTECTION

Implement:

Server-side credit validation

Ad reward verification

Cooldown enforcement

Daily AI limit enforcement

Block negative credits

Prevent refresh abuse

Prevent multiple event submissions

Detect unrealistic test duration

IP/device tracking for referral abuse

Optional:

Add reCAPTCHA for suspicious activity

🔟 FIRESTORE ADDITIONS

users/{userId}

credits

isPro

dailyAdCount

dailyAiUsage

dailyCreditEarned

streakCount

lastActiveDate

lastTaskReset

referralCode

referredBy

referralCount

referralCreditsEarned

referralTier

ai_explanations/{questionId}

explanation

createdAt

PERFORMANCE REQUIREMENT

Before Gemini call:

Check cache

Check credits

Check daily limit

Apply cooldown

Deduct credits

Call API

Store in cache

System must scale to 10,000+ users.

Return:

Modified files only

Cloud Functions code

Firestore security rules

Subscription validation logic

Modular architecture

🎯 FINAL GOAL

Create a gamified LET web app with:

Retention (Daily tasks)

Monetization (AI credits + ads + Pro)

Growth (Referral system)

Engagement (Events + leaderboard)

Cost control (Gemini caching)