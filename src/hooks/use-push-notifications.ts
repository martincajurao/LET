'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface PushNotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: { action: string; title: string }[];
}

// Request permission for push notifications
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }
  
  return Notification.permission;
}

// Check if notifications are supported and permitted
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const newPermission = await requestNotificationPermission();
    setPermission(newPermission);
    
    if (newPermission === 'granted') {
      toast({
        title: "Notifications Enabled!",
        description: "You'll receive reminders for your daily quests."
      });
    }
    
    return newPermission;
  }, [toast]);

  const showNotification = useCallback((options: PushNotificationOptions) => {
    if (permission !== 'granted' || !isSupported) {
      console.warn('Notifications not permitted');
      return;
    }

    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/icon-192.png',
      badge: options.badge,
      tag: options.tag,
      data: options.data,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  }, [permission, isSupported]);

  const showStreakReminder = useCallback((streakCount: number) => {
    return showNotification({
      title: "🔥 Streak at Risk!",
      body: `Your ${streakCount}-day streak will reset tomorrow. Complete one more question to keep it going!`,
      tag: 'streak-reminder',
      icon: '/icon-192.png'
    });
  }, [showNotification]);

  const showDailyQuestReminder = useCallback((questsRemaining: number) => {
    return showNotification({
      title: "📋 Quests Waiting",
      body: `You have ${questsRemaining} incomplete quest${questsRemaining > 1 ? 's' : ''} today. Complete them for bonus rewards!`,
      tag: 'quest-reminder',
      icon: '/icon-192.png'
    });
  }, [showNotification]);

  const showAchievementUnlocked = useCallback((achievementName: string) => {
    return showNotification({
      title: "🏆 Achievement Unlocked!",
      body: `You've earned: ${achievementName}`,
      tag: 'achievement',
      icon: '/icon-192.png'
    });
  }, [showNotification]);

  const showLevelUp = useCallback((newLevel: number, title: string) => {
    return showNotification({
      title: "⬆️ Level Up!",
      body: `Congratulations! You've reached ${title} (Rank ${newLevel})`,
      tag: 'levelup',
      icon: '/icon-192.png'
    });
  }, [showNotification]);

  const showWeeklyTournament = useCallback(() => {
    return showNotification({
      title: "🏆 Weekly Tournament Started!",
      body: "Compete with other learners for exclusive rewards. Ends in 3 days!",
      tag: 'tournament',
      icon: '/icon-192.png'
    });
  }, [showNotification]);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    showStreakReminder,
    showDailyQuestReminder,
    showAchievementUnlocked,
    showLevelUp,
    showWeeklyTournament,
  };
}

// Hook to schedule local notifications
export function useScheduledNotifications() {
  const { showStreakReminder, showDailyQuestReminder } = usePushNotifications();

  // Check and send streak reminder (call this on app load)
  const checkStreakStatus = useCallback((streakCount: number, lastActiveDate?: number) => {
    if (streakCount < 3) return; // Only remind for streaks 3+
    
    const now = Date.now();
    const lastActive = lastActiveDate || 0;
    const hoursSinceLastActive = (now - lastActive) / (1000 * 60 * 60);
    
    // If more than 20 hours since last activity, remind about streak
    if (hoursSinceLastActive > 20 && hoursSinceLastActive < 48) {
      showStreakReminder(streakCount);
    }
  }, [showStreakReminder]);

  // Check incomplete quests (call this on app load)
  const checkDailyQuests = useCallback((completedQuests: number, totalQuests: number) => {
    if (completedQuests < totalQuests && completedQuests > 0) {
      // Only remind if they've started but not completed
      showDailyQuestReminder(totalQuests - completedQuests);
    }
  }, [showDailyQuestReminder]);

  return {
    checkStreakStatus,
    checkDailyQuests,
  };
}

