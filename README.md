# LET's Prep - Professional Teacher Practice

A gamified board exam simulation platform for Filipino educators, featuring high-fidelity simulations, AI pedagogical analysis, and native Android styling.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + ShadCN UI
- **Backend**: Firebase (Auth, Firestore)
- **AI Engine**: Genkit + Gemini 2.5 Flash / Puter.js
- **Icons**: Lucide React

## Deployment

To deploy the latest version to production:

1. **Connect Git**:
   ```bash
   git config --global user.email "martincajurao@gmail.com"
   git config --global user.name "Martin Cajurao"
   ```

2. **Initialize Firebase** (if not already):
   ```bash
   firebase login
   firebase use default
   ```

3. **Deploy Core Infrastructure**:
   ```bash
   firebase deploy --only firestore:rules,hosting
   ```

## Key Features
- **Simulation Engine**: 150-question mock tests with adaptive category selection.
- **AI Tutor**: Credits-based pedagogical explanations for mistakes.
- **Daily Tasks**: Engagement rewards system for consistent practice.
- **Global Arena**: Time-limited competition modes with leaderboard integration.
- **Mobile Native UI**: Material Design 3 bottom navigation and haptic feedback design.

## Project Structure
- `/src/ai/flows`: Generative AI logic using Genkit.
- `/src/app/api`: Server-side API routes for reward processing and events.
- `/src/components/exam`: Simulation and results components.
- `/src/components/ui`: ShadCN and custom Material Design components.
- `/firestore.rules`: Robust data protection policies.
