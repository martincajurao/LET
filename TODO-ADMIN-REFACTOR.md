# TODO: Admin Page Complete Settings Refactor

## Objective
Refactor the admin page with complete settings to manage all system parameters from a comprehensive settings hub.

## Steps Completed:

### Step 1: Add State Variables for All Settings ✅
- [x] State for time per question
- [x] State for base question limits
- [x] State for rank-based question limits
- [x] State for XP rewards
- [x] State for anti-abuse settings
- [x] State for AI feature settings
- [x] State for exam settings

### Step 2: Fetch Settings from Firestore ✅
- [x] Update fetchData to load all settings from system_configs/global
- [x] Handle missing settings with defaults

### Step 3: Add Save Functionality ✅
- [x] Implement saveSettings function to persist all settings to Firestore
- [x] Add loading state during save

### Step 4: Update System Params Tab UI ✅
- [x] Add Exam Settings section
- [x] Add Base Question Limits section
- [x] Add Rank-Based Question Limits section (using RankTierInput)
- [x] Add XP Rewards Configuration section
- [x] Add Anti-Abuse Settings section
- [x] Add AI Feature Settings section

### Step 5: Add New Icons ✅
- [x] Add necessary icons for new settings sections

## Configuration Structure (Firestore):
```
system_configs/global
├── timePerQuestion: number
├── limitGenEd: number (base)
├── limitProfEd: number (base)
├── limitSpec: number (base)
├── rankLimits: { rank: { genEd, profEd, spec } }
├── xpRewards: { ... }
├── antiAbuse: { ... }
├── aiSettings: { ... }
├── examSettings: { ... }
└── updatedAt: timestamp
```

## Notes:
- Using existing RankTierInput component from rank-tier-config.tsx
- Following existing UI patterns from the admin page
- All settings saved to Firestore for runtime configuration

