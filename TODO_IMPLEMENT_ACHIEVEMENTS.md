# TODO: Implement Missing Achievements

## Step 1: Add missing user stats fields to UserProfile
- File: `src/firebase/auth/use-user.tsx`
- Add: `squadQuestsCompleted`, `duelsCreated`, `questionsUnder20Seconds`, `weeklyFullSimulations`

## Step 2: Add missing achievements to EXTENDED_ACHIEVEMENTS
- File: `src/components/ui/enhanced-achievements.tsx`
- Add: "Board Exam Warrior", "Team Player", "Challenger", update "Speed Reader"

## Step 3: Update achievement tracking logic
- File: `src/components/ui/enhanced-achievements.tsx`
- Update getProgress() to handle new achievement types

## Step 4: Integrate achievement triggers
- File: `src/components/ui/friend-duels.tsx` - trigger "Challenger" achievement
- File: `src/components/ui/squad-hub.tsx` - trigger "Team Player" achievement

## Step 5: Add tracking in exam completion
- Add weekly simulation tracking
- Add speed tracking for questions under 20 seconds

