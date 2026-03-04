'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Volume2, 
  VolumeX, 
  Bell, 
  BellOff, 
  Sparkles, 
  Zap,
  Music,
  Gauge,
  Save,
  Loader2,
  CheckCircle2,
  Settings,
  Shield,
  Clock,
  Moon,
  Sun,
  Palette,
  Volume1,
  Flame,
  Trophy,
  Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';
import { useToast } from "@/hooks/use-toast";
import { useSound } from '@/hooks/use-sound';
import { usePushNotifications } from '@/hooks/use-push-notifications';

interface GamificationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Persist settings to localStorage
const SETTINGS_STORAGE_KEY = 'letsprep_gamification_settings';

interface GamificationSettings {
  soundEnabled: boolean;
  soundVolume: number;
  musicEnabled: boolean;
  notificationsEnabled: boolean;
  streakReminders: boolean;
  questReminders: boolean;
  achievementNotifications: boolean;
  tournamentNotifications: boolean;
  hapticFeedback: boolean;
  animationsEnabled: boolean;
  reducedMotion: boolean;
}

const DEFAULT_SETTINGS: GamificationSettings = {
  soundEnabled: true,
  soundVolume: 0.5,
  musicEnabled: false,
  notificationsEnabled: true,
  streakReminders: true,
  questReminders: true,
  achievementNotifications: true,
  tournamentNotifications: true,
  hapticFeedback: true,
  animationsEnabled: true,
  reducedMotion: false,
};

export function GamificationSettings({ open, onOpenChange }: GamificationSettingsProps) {
  const [settings, setSettings] = useState<GamificationSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();
  const { setEnabled: setSoundEnabled, setVolume } = useSound();
  const { requestPermission, permission, isSupported: notificationsSupported } = usePushNotifications();

  // Load settings on mount
  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
  }, []);

  // Apply settings when they change
  useEffect(() => {
    setSoundEnabled(settings.soundEnabled);
    setVolume(settings.soundVolume);
  }, [settings.soundEnabled, settings.soundVolume, setSoundEnabled, setVolume]);

  const handleToggle = (key: keyof GamificationSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleVolumeChange = (value: number) => {
    setSettings(prev => ({ ...prev, soundVolume: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Save to localStorage
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      
      // Request notification permission if enabling
      if (settings.notificationsEnabled && permission === 'default') {
        await requestPermission();
      }
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSaved(true);
      toast({
        title: "Settings Saved!",
        description: "Your preferences have been updated."
      });
      
      setTimeout(() => {
        setSaved(false);
        onOpenChange(false);
      }, 1000);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save settings. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestNotificationPermission = async () => {
    if (!notificationsSupported) {
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "This browser doesn't support notifications."
      });
      return;
    }
    
    const result = await requestPermission();
    if (result === 'granted') {
      setSettings(prev => ({ ...prev, notificationsEnabled: true }));
      toast({
        title: "Notifications Enabled!",
        description: "You'll receive important updates."
      });
    } else {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "Enable notifications in your browser settings."
      });
    }
  };

  const SettingRow = ({ 
    icon, 
    title, 
    description, 
    enabled, 
    onToggle,
    badge,
    disabled = false
  }: { 
    icon: React.ReactNode; 
    title: string; 
    description: string; 
    enabled: boolean; 
    onToggle: () => void;
    badge?: string;
    disabled?: boolean;
  }) => (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
      enabled 
        ? "bg-primary/5 border-primary/20" 
        : "bg-muted/30 border-transparent"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-foreground">{title}</p>
            {badge && (
              <Badge className="h-4 text-[8px] bg-primary/10 text-primary border-0">
                {badge}
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-medium">{description}</p>
        </div>
      </div>
      <Switch 
        checked={enabled} 
        onCheckedChange={onToggle}
        disabled={disabled}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2.5rem] bg-card border-none shadow-2xl p-0 max-w-[450px] max-h-[85vh] overflow-hidden outline-none">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black">Game Experience</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Customize your learning journey
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="p-4 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Sound Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Sound</p>
            </div>
            
            <SettingRow 
              icon={settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              title="Sound Effects"
              description="Play sounds for actions"
              enabled={settings.soundEnabled}
              onToggle={() => handleToggle('soundEnabled')}
            />
            
            {settings.soundEnabled && (
              <div className="px-4 py-3 bg-muted/30 rounded-xl space-y-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-muted-foreground">Volume</span>
                  <span className="text-foreground">{Math.round(settings.soundVolume * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1"
                  value={settings.soundVolume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>
            )}
            
            <SettingRow 
              icon={<Music className="w-5 h-5" />}
              title="Background Music"
              description="Ambient sounds while studying"
              enabled={settings.musicEnabled}
              onToggle={() => handleToggle('musicEnabled')}
              disabled={!settings.soundEnabled}
            />
          </div>

          {/* Notification Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Notifications</p>
            </div>
            
            {permission === 'default' && settings.notificationsEnabled && (
              <div className="p-4 bg-yellow-500/10 rounded-2xl border-2 border-yellow-500/20">
                <p className="text-xs font-bold text-yellow-700 mb-2">
                  Click "Allow" to enable notifications
                </p>
                <Button 
                  size="sm" 
                  onClick={handleRequestNotificationPermission}
                  className="h-8 rounded-lg font-black text-xs"
                >
                  Enable Notifications
                </Button>
              </div>
            )}
            
            <SettingRow 
              icon={settings.notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
              title="Push Notifications"
              description="Receive important alerts"
              enabled={settings.notificationsEnabled}
              onToggle={() => handleToggle('notificationsEnabled')}
              badge={permission === 'granted' ? 'Active' : undefined}
              disabled={!notificationsSupported}
            />
            
            {settings.notificationsEnabled && (
              <>
                <SettingRow 
                  icon={<Flame className="w-5 h-5" />}
                  title="Streak Reminders"
                  description="Alert before streak resets"
                  enabled={settings.streakReminders}
                  onToggle={() => handleToggle('streakReminders')}
                />
                
                <SettingRow 
                  icon={<Zap className="w-5 h-5" />}
                  title="Quest Reminders"
                  description="Daily quest notifications"
                  enabled={settings.questReminders}
                  onToggle={() => handleToggle('questReminders')}
                />
                
                <SettingRow 
                  icon={<Trophy className="w-5 h-5" />}
                  title="Achievements"
                  description="Unlock notifications"
                  enabled={settings.achievementNotifications}
                  onToggle={() => handleToggle('achievementNotifications')}
                />
                
                <SettingRow 
                  icon={<Shield className="w-5 h-5" />}
                  title="Tournaments"
                  description="Weekly competition alerts"
                  enabled={settings.tournamentNotifications}
                  onToggle={() => handleToggle('tournamentNotifications')}
                />
              </>
            )}
          </div>

          {/* Visual Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Visual</p>
            </div>
            
            <SettingRow 
              icon={<Gauge className="w-5 h-5" />}
              title="Animations"
              description="UI motion effects"
              enabled={settings.animationsEnabled}
              onToggle={() => handleToggle('animationsEnabled')}
            />
            
            <SettingRow 
              icon={<Moon className="w-5 h-5" />}
              title="Reduced Motion"
              description="Minimize animations"
              enabled={settings.reducedMotion}
              onToggle={() => handleToggle('reducedMotion')}
            />
            
            <SettingRow 
              icon={<Smartphone className="w-5 h-5" />}
              title="Haptic Feedback"
              description="Vibration on mobile"
              enabled={settings.hapticFeedback}
              onToggle={() => handleToggle('hapticFeedback')}
            />
          </div>
        </div>

        <div className="p-4 border-t bg-muted/20">
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 rounded-xl font-black text-sm gap-2 shadow-lg"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Mini settings button for embedding
interface MiniSettingsButtonProps {
  onClick: () => void;
}

export function MiniSettingsButton({ onClick }: MiniSettingsButtonProps) {
  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={onClick}
      className="rounded-full w-10 h-10 bg-muted/50 hover:bg-muted"
    >
      <Settings className="w-5 h-5 text-muted-foreground" />
    </Button>
  );
}

export default GamificationSettings;

