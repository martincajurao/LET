'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase/index';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from 'next/link';
import { 
  GraduationCap, 
  History, 
  LogOut, 
  Zap, 
  Moon, 
  Sun, 
  Settings, 
  Menu,
  LayoutDashboard,
  Trophy,
  Crown,
  Sparkles,
  Smartphone,
  Compass,
  Users
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTheme } from '@/hooks/use-theme';
import { getRankData } from '@/lib/xp-system';

export function Navbar() {
  const { user, logout } = useUser();
  const { isDark, toggleDarkMode } = useTheme();
  const [isImmersive, setIsImmersive] = useState(false);

  useEffect(() => {
    const checkImmersive = () => {
      setIsImmersive(document.body.classList.contains('immersive-mode'));
    };
    checkImmersive();
    const observer = new MutationObserver(checkImmersive);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const rankData = useMemo(() => user ? getRankData(user.xp || 0) : null, [user?.xp]);

  const navItems = useMemo(() => [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, href: '/dashboard' },
    { label: 'Quest Hub', icon: <Compass className="w-4 h-4" />, href: '/tasks' },
    { label: 'Network', icon: <Users className="w-4 h-4" />, href: '/community' },
    { label: 'Global Arena', icon: <Trophy className="w-4 h-4" />, href: '/events' },
  ], []);

  if (isImmersive) return null;

  return (
    <nav className="pt-safe bg-background/80 backdrop-blur-xl border-b sticky top-0 z-[100] shadow-sm px-4 md:px-8">
      <div className="h-16 flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-primary rounded-[1rem] flex items-center justify-center shadow-lg shadow-primary/25">
              <GraduationCap className="text-primary-foreground w-6 h-6" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-foreground block leading-none">LET's Prep</span>
                {user && (<Badge variant="outline" className="h-5 px-2 font-black text-[9px] border-primary/20 text-primary bg-primary/5">Rank {rankData?.rank}</Badge>)}
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Professional Ranking</span>
            </div>
          </Link>
        </div>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 p-1 px-3 rounded-full hover:bg-muted transition-all border border-transparent hover:border-border outline-none">
                      <Menu className="w-5 h-5 text-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 mt-2 rounded-2xl border bg-card shadow-2xl p-2" align="end">
                    <DropdownMenuLabel className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-3 py-2">Navigation</DropdownMenuLabel>
                    {navItems.map((item) => (
                      <DropdownMenuItem key={item.label} asChild>
                        <Link href={item.href} className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl hover:bg-muted transition-colors">
                          <div className="text-primary">{item.icon}</div>
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-muted" onClick={toggleDarkMode}>
                {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </Button>
              <Link href="/tasks" className="flex items-center gap-2 bg-muted/40 hover:bg-accent/10 px-3 sm:px-4 py-2 rounded-2xl border border-border/50 cursor-pointer transition-all active:scale-95 group">
                <div className="w-5 h-5 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-600 fill-current animate-sparkle" />
                </div>
                <span className="text-sm font-black text-foreground">{typeof user.credits === 'number' ? user.credits : 0}</span>
                <Zap className="w-3 h-3 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-0.5 rounded-full hover:bg-muted transition-all outline-none focus:ring-2 focus:ring-primary/20 relative">
                  <Avatar className="w-9 h-9 border-2 border-background shadow-md">
                    {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || "User"} />}
                    <AvatarFallback className="text-xs font-black bg-primary/10 text-primary uppercase">🎓</AvatarFallback>
                  </Avatar>
                  {user.isPro && (<div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 shadow-sm border border-background"><Crown className="w-2.5 h-2.5 text-yellow-900" /></div>)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 mt-2 rounded-2xl border bg-card shadow-2xl p-2" align="end">
                <div className="p-3 mb-2 bg-muted/30 rounded-xl">
                  <div className="flex items-center justify-between gap-2 mb-1"><p className="text-sm font-black truncate">{user.displayName}</p><Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] font-black uppercase px-1.5 py-0">{rankData?.title}</Badge></div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">{user.email}</p>
                </div>
                <DropdownMenuLabel className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-3 py-2">Career Overview</DropdownMenuLabel>
                <DropdownMenuItem asChild><div className="px-3 py-2 space-y-2"><div className="flex justify-between items-center text-[10px] font-black uppercase"><span className="text-muted-foreground">{rankData?.title}</span><span className="text-primary">{rankData?.xpInRank || 0} / {rankData?.nextRankXp} XP</span></div><Progress value={rankData?.progress || 0} className="h-1.5" /></div></DropdownMenuItem>
                <DropdownMenuSeparator className="my-2 bg-border/50" />
                <DropdownMenuItem asChild><Link href="/profile?tab=settings" className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl hover:bg-muted transition-colors"><Settings className="w-4 h-4 text-primary" /> Profile Settings</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/settings" className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl hover:bg-muted transition-colors"><Smartphone className="w-4 h-4 text-primary" /> App Settings</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/profile?tab=history" className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl hover:bg-muted transition-colors"><History className="w-4 h-4 text-emerald-500" /> Analysis Vault</Link></DropdownMenuItem>
                <DropdownMenuSeparator className="my-2 bg-border/50" />
                <DropdownMenuItem onClick={logout} className="flex items-center gap-3 p-3 font-bold cursor-pointer rounded-xl text-destructive hover:bg-destructive/10 transition-colors"><LogOut className="w-4 h-4" /> Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (<Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest border-primary/20 opacity-40">Guest Teacher</Badge>)}
      </div>
    </nav>
  );
}
