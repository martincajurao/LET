# App Refactor Log

## [2024-05-22] Professional UI & Auth Stabilization

### 1. Default Theme: Dark Mode
- Updated `src/app/layout.tsx` script to default to the `.dark` class.
- Updated `src/hooks/use-theme.tsx` to initialize state as dark and handle missing storage keys correctly.

### 2. Authentication: Virtual Bypass Trace
- Updated `src/firebase/auth/use-user.tsx` to handle `auth/admin-restricted-operation`.
- Implemented a persistent **Virtual Session** stored in `localStorage` for testing environments where Anonymous Auth is restricted.
- Testers are initialized with "Tester" profile documents in Firestore if available, otherwise using local storage persistence.

### 3. Exam Engine: Immersive 3-Phase Calibration
- **Distraction-Free**: Now uses `fixed inset-0 z-[2000]` and hides all navigation components during simulations.
- **3-Phase Structure**: Intelligently groups items into General Ed, Professional Ed, and Specialization tracks.
- **Rest States**: Integrated a calibration roadmap on rest screens, showing completed vs. up-next phases.
- **Interactive Advance**: Clicking the "Up Next" phase card now triggers the next track immediately.
- **Live Stopwatch**: High-visibility simulation clock added to the rest screen for pacing awareness.
- **Auto-Advance**: Selecting an answer provides a visual highlight and automatically moves to the next question.

### 4. Continuous QuickFire Refactor
- **Phase Bypass**: Short simulations (≤ 10 items) now bypass rest phases and roadmaps entirely.
- **Mixed Content**: QuickFire correctly combines questions from all three pedagogical tracks into a single continuous trace.
- **Interaction Fix**: Refactored option selection to use direct touch events, resolving an issue where Radix components were unresponsive in specific Android WebView layers.

### 5. Stability Pass: Resolved Crashes
- Fixed `ReferenceError: ShieldCheck is not defined` in `src/components/ui/mobile-bottom-nav.tsx`.
- Fixed `ReferenceError: Sparkles is not defined` in `src/app/tasks/page.tsx`.
- Optimized spacings and safe-area paddings to prevent overlapping UI in Android WebViews.

### 6. Layout: Top Margin Correction
- Removed redundant `pt-safe` paddings from page containers that were conflicting with the Appbar's own safe-area logic.