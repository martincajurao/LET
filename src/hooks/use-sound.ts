'use client';

import { useCallback, useRef, useEffect } from 'react';

// Sound effect types
export type SoundType = 
  | 'correct' 
  | 'wrong' 
  | 'achievement' 
  | 'levelup' 
  | 'click' 
  | 'questComplete'
  | 'unlock'
  | 'streak'
  | 'coin';

interface SoundOptions {
  volume?: number;
  playbackRate?: number;
}

// Base64 encoded sound data (short beep/ding sounds)
// In production, you'd use actual audio files
const SOUND_CONFIGS: Record<SoundType, { frequency: number; duration: number; type: OscillatorType }> = {
  correct: { frequency: 880, duration: 0.1, type: 'sine' },
  wrong: { frequency: 220, duration: 0.15, type: 'sawtooth' },
  achievement: { frequency: 523, duration: 0.3, type: 'sine' },
  levelup: { frequency: 659, duration: 0.4, type: 'sine' },
  click: { frequency: 440, duration: 0.05, type: 'sine' },
  questComplete: { frequency: 784, duration: 0.2, type: 'sine' },
  unlock: { frequency: 1047, duration: 0.25, type: 'sine' },
  streak: { frequency: 698, duration: 0.3, type: 'sine' },
  coin: { frequency: 1200, duration: 0.1, type: 'sine' },
};

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private masterVolume: number = 0.3;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioContext();
    }
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  play(type: SoundType, options: SoundOptions = {}) {
    if (!this.enabled || !this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const config = SOUND_CONFIGS[type];
    const volume = (options.volume ?? 1) * this.masterVolume;
    const playbackRate = options.playbackRate ?? 1;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency * playbackRate, this.audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + config.duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + config.duration);
    } catch (e) {
      // Silent fail for audio issues
    }
  }

  playSequence(types: SoundType[], delay: number = 100) {
    types.forEach((type, index) => {
      setTimeout(() => this.play(type), index * delay);
    });
  }
}

// Singleton instance
let soundManager: SoundManager | null = null;

function getSoundManager(): SoundManager {
  if (!soundManager) {
    soundManager = new SoundManager();
  }
  return soundManager;
}

export function useSound() {
  const manager = useRef(getSoundManager());

  const play = useCallback((type: SoundType, options?: SoundOptions) => {
    manager.current.play(type, options);
  }, []);

  const playCorrect = useCallback(() => play('correct'), [play]);
  const playWrong = useCallback(() => play('wrong'), [play]);
  const playAchievement = useCallback(() => play('achievement'), [play]);
  const playLevelUp = useCallback(() => play('levelup'), [play]);
  const playClick = useCallback(() => play('click'), [play]);
  const playQuestComplete = useCallback(() => play('questComplete'), [play]);
  const playUnlock = useCallback(() => play('unlock'), [play]);
  const playStreak = useCallback(() => play('streak'), [play]);
  const playCoin = useCallback(() => play('coin'), [play]);

  const setEnabled = useCallback((enabled: boolean) => {
    manager.current.setEnabled(enabled);
  }, []);

  const setVolume = useCallback((volume: number) => {
    manager.current.setVolume(volume);
  }, []);

  return {
    play,
    playCorrect,
    playWrong,
    playAchievement,
    playLevelUp,
    playClick,
    playQuestComplete,
    playUnlock,
    playStreak,
    playCoin,
    setEnabled,
    setVolume,
  };
}

// For use outside React components
export const sound = {
  play: (type: SoundType, options?: SoundOptions) => getSoundManager().play(type, options),
  correct: () => getSoundManager().play('correct'),
  wrong: () => getSoundManager().play('wrong'),
  achievement: () => getSoundManager().play('achievement'),
  levelup: () => getSoundManager().play('levelup'),
  click: () => getSoundManager().play('click'),
  questComplete: () => getSoundManager().play('questComplete'),
  unlock: () => getSoundManager().play('unlock'),
  streak: () => getSoundManager().play('streak'),
  coin: () => getSoundManager().play('coin'),
  setEnabled: (enabled: boolean) => getSoundManager().setEnabled(enabled),
  setVolume: (volume: number) => getSoundManager().setVolume(volume),
};

