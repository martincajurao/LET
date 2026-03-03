# TODO: Rank-Based Question Limits Implementation

## Objective
Implement dynamic question limits based on user rank for category exams and full simulation exams.

## Steps Completed:

### Step 1: Add Helper Functions to xp-system.ts ✅
- [x] Add QUESTION_LIMITS config with rank tiers
- [x] Add getQuestionLimitsByRank(rank) function
- [x] Export the new configuration

### Step 2: Create Admin Configuration Component ✅
- [x] Create rank-tier-config.tsx component for admin UI
- [x] Add UI inputs for each rank tier (6 tiers)

### Step 3: Integration Files Created
- [x] Admin page has imports for RankTierInput
- [x] Main page.tsx updated with getDoc import and config fetching

## Configuration Structure (Firestore):
```
system_configs/global
├── timePerQuestion: number
├── limitGenEd: number (base)
├── limitProfEd: number (base)
├── limitSpec: number (base)
├── rankLimits: {
    1: { genEd: 10, profEd: 10, spec: 10 },    // Rank 1-2
    3: { genEd: 25, profEd: 25, spec: 25 },    // Rank 3-4
    5: { genEd: 50, profEd: 50, spec: 50 },    // Rank 5-6
    7: { genEd: 75, profEd: 75, spec: 75 },    // Rank 7-8
    9: { genEd: 100, profEd: 100, spec: 100 }, // Rank 9
    10: { genEd: 150, profEd: 150, spec: 150 } // Rank 10+ (Full)
  }
└── updatedAt: timestamp
```

## Default Rank Tiers:
- Rank 1-2: 10 questions per category
- Rank 3-4: 25 questions per category
- Rank 5-6: 50 questions per category
- Rank 7-8: 75 questions per category
- Rank 9: 100 questions per category
- Rank 10+: 150 questions per category (Full LET: 450 total)

## Notes:
- The xp-system.ts now exports `getQuestionLimitsByRank()` function
- The rank-tier-config.tsx component is ready to be added to the admin page
- page.tsx has the logic to fetch config from Firestore and apply rank-based limits

