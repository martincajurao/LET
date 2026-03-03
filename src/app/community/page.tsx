
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  where, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Search, 
  Trophy, 
  Flame, 
  Zap, 
  Star, 
  ChevronRight, 
  Loader2, 
  ShieldCheck,
  Award,
  Globe,
  Compass,
  TrendingUp,
  UserPlus,
  Link as LinkIcon,
  Send,
  Activity,
  Check,
  Clock,
  MapPin,
  Filter,
  Building2,
  Map as MapIcon,
  Crown,
  Medal,
  Timer
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { getRankData } from '@/lib/xp-system';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { SquadHub } from '@/components/ui/squad-hub';
import { PeerLinks } from '@/components/ui/peer-links';

interface ActivityFeedItem {
  id: string;
  userId: string;
  displayName: string;
  overallScore: number;
  timestamp: number;
  subject?: string;
  locationRegion?: string;
  locationCity?: string;
  timeSpent?: number;
}

type FilterLevel = 'global' | 'region' | 'city';

export default function CommunityPage() {
  const { user, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [recentActivity, setRecentActivity] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [topTeachers, setTopTeachers] = useState<any[]>([]);
  const [worldRecords, setWorldRecords] = useState<ActivityFeedItem[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [isSendingRequest, setIsSendingRequest] = useState<string | null>(null);
  
  // Location Filter Level
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('global');

  // Real-time friendship status tracking
  const friendshipsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'friendships'), where('userIds', 'array-contains', user.uid));
  }, [user, firestore]);
  
  const { data: userFriendships } = useCollection(friendshipsQuery);

  const friendshipStatusMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!userFriendships || !user) return map;
    userFriendships.forEach((f: any) => {
      const otherId = f.userIds.find((id: string) => id !== user.uid);
      if (otherId) map.set(otherId, f.status);
    });
    return map;
  }, [userFriendships, user]);

  // Fetch recent activity
  useEffect(() => {
    if (!firestore) return;
    const activityQuery = query(collection(firestore, "exam_results"), orderBy("timestamp", "desc"), limit(12));
    const unsub = onSnapshot(activityQuery, (snap) => {
      setRecentActivity(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityFeedItem)));
      setLoading(false);
    }, (error) => {
      console.error("Activity feed sync failed:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [firestore]);

  // Fetch World Records (Top 1 in categories)
  useEffect(() => {
    if (!firestore) return;
    setLoadingRecords(true);
    
    const categories = ['all', 'General Education', 'Professional Education', 'Specialization'];
    const records: ActivityFeedItem[] = [];
    let completedCount = 0;

    categories.forEach(cat => {
      const recordQuery = query(
        collection(firestore, "exam_results"),
        where("subject", "==", cat === 'all' ? 'all' : cat), // Note: subject storage depends on how it's saved
        orderBy("overallScore", "desc"),
        orderBy("timestamp", "asc"), // Use oldest record if scores are tied for true "Record" status
        limit(1)
      );

      // Fallback: If no category matches 'subject' specifically (older records), search overall
      const unsub = onSnapshot(recordQuery, (snap) => {
        if (!snap.empty) {
          const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as ActivityFeedItem;
          // Avoid duplicates if multiple queries return same doc
          if (!records.find(r => r.id === data.id)) {
            records.push(data);
          }
        }
        completedCount++;
        if (completedCount === categories.length) {
          setWorldRecords([...records].sort((a, b) => b.overallScore - a.overallScore));
          setLoadingRecords(false);
        }
      }, (err) => {
        completedCount++;
        if (completedCount === categories.length) setLoadingRecords(false);
      });
    });
  }, [firestore]);

  // Fetch top teachers based on filter level
  useEffect(() => {
    if (!firestore) return;
    
    let topQuery;
    if (filterLevel === 'city' && user?.locationCity) {
      topQuery = query(
        collection(firestore, "users"), 
        where("locationCity", "==", user.locationCity),
        orderBy("xp", "desc"), 
        limit(10)
      );
    } else if (filterLevel === 'region' && user?.locationRegion) {
      topQuery = query(
        collection(firestore, "users"), 
        where("locationRegion", "==", user.locationRegion),
        orderBy("xp", "desc"), 
        limit(10)
      );
    } else {
      topQuery = query(
        collection(firestore, "users"), 
        orderBy("xp", "desc"), 
        limit(10)
      );
    }

    const unsub = onSnapshot(topQuery, (snap) => {
      setTopTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn("Location query failed (likely index missing):", err);
      setFilterLevel('global');
    });
    return () => unsub();
  }, [firestore, filterLevel, user?.locationRegion, user?.locationCity]);

  const handleAddFriend = async (targetUser: any) => {
    const targetUserId = targetUser.id;
    const targetName = targetUser.displayName || 'Teacher';
    const targetPhoto = targetUser.photoURL || '';

    if (!user || !firestore || isSendingRequest) return;
    if (targetUserId === user.uid) {
      toast({ variant: "destructive", title: "Logic Error", description: "You cannot link with yourself." });
      return;
    }

    setIsSendingRequest(targetUserId);
    try {
      const friendshipId = [user.uid, targetUserId].sort().join('_');
      const friendRef = doc(firestore, 'friendships', friendshipId);
      const snap = await getDoc(friendRef);

      if (snap.exists()) {
        toast({ title: "Trace Active", description: `A link with ${targetName} already exists.` });
        setIsSendingRequest(null);
        return;
      }

      await setDoc(friendRef, {
        userIds: [user.uid, targetUserId],
        status: 'pending',
        initiatorId: user.uid,
        createdAt: Date.now(),
        lastUpdated: serverTimestamp(),
        userNames: {
          [user.uid]: user.displayName,
          [targetUserId]: targetName
        },
        userPhotos: {
          [user.uid]: user.photoURL,
          [targetUserId]: targetPhoto
        }
      });

      toast({ variant: "reward", title: "Request Transmitted!", description: `Link request sent to ${targetName}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Link Failed", description: "Could not establish peer trace." });
    } finally {
      setIsSendingRequest(null);
    }
  };

  const cycleFilter = () => {
    if (filterLevel === 'global') setFilterLevel('region');
    else if (filterLevel === 'region') setFilterLevel('city');
    else setFilterLevel('global');
  };

  const filteredActivity = useMemo(() => {
    let list = recentActivity;
    if (searchQuery) {
      list = list.filter(item => item.displayName?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (filterLevel === 'region' && user?.locationRegion) {
      list = list.filter(item => item.locationRegion === user.locationRegion);
    } else if (filterLevel === 'city' && user?.locationCity) {
      list = list.filter(item => item.locationCity === user.locationCity);
    }
    return list;
  }, [recentActivity, searchQuery, filterLevel, user?.locationRegion, user?.locationCity]);

  const renderFriendButton = (targetUser: any) => {
    const status = friendshipStatusMap.get(targetUser.id);
    const isSelf = targetUser.id === user?.uid;

    if (isSelf) return null;

    if (status === 'accepted') {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 px-2">
          <Check className="w-3 h-3" /> Linked
        </Badge>
      );
    }

    if (status === 'pending') {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 px-2">
          <Clock className="w-3 h-3" /> Sent
        </Badge>
      );
    }

    return (
      <button 
        onClick={() => handleAddFriend(targetUser)}
        disabled={isSendingRequest === targetUser.id}
        className="text-primary hover:text-primary/80 disabled:opacity-30 transition-all p-1"
        title="Add Friend"
      >
        {isSendingRequest === targetUser.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
      </button>
    );
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-32 font-body">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
                <Globe className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-foreground">Intelligence Network</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground font-bold uppercase tracking-widest text-[10px] ml-1">
              <span>Connect with Aspiring Filipino Teachers</span>
              {user?.locationCity && (
                <span className="text-primary flex items-center gap-1"><Building2 className="w-3 h-3" /> {user.locationCity}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-40" />
              <Input 
                placeholder="Search teachers..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-11 rounded-2xl border-2 bg-card shadow-sm font-bold"
              />
            </div>
            <Button 
              onClick={cycleFilter} 
              variant={filterLevel !== 'global' ? "default" : "outline"}
              className="h-14 px-4 rounded-2xl border-2 shrink-0 flex items-center gap-2 active:scale-95 transition-all"
            >
              {filterLevel === 'global' ? <Globe className="w-5 h-5" /> : 
               filterLevel === 'region' ? <MapIcon className="w-5 h-5" /> : 
               <Building2 className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        <Tabs defaultValue="feed" className="space-y-8">
          <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
            <TabsList className="bg-muted/30 p-1.5 rounded-[2rem] h-16 min-w-[500px] grid grid-cols-4 border border-border/50">
              <TabsTrigger value="feed" className="rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg gap-2">
                <Activity className="w-4 h-4" /> Global Feed
              </TabsTrigger>
              <TabsTrigger value="records" className="rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg gap-2">
                <Crown className="w-4 h-4 text-yellow-500" /> Hall of Fame
              </TabsTrigger>
              <TabsTrigger value="peers" className="rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg gap-2">
                <LinkIcon className="w-4 h-4" /> Peer Links
              </TabsTrigger>
              <TabsTrigger value="squad" className="rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg gap-2">
                <Users className="w-4 h-4" /> Study Squad
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="feed" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Elite Vanguard
                  </h3>
                  <Badge variant="outline" className="text-[8px] font-black uppercase border-none px-3 bg-muted/20 text-muted-foreground">
                    {filterLevel === 'city' ? `City: ${user?.locationCity}` : filterLevel === 'region' ? `Region: ${user?.locationRegion}` : "Global"}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {topTeachers.map((edu, idx) => {
                    const rankInfo = getRankData(edu.xp || 0);
                    return (
                      <Card key={edu.id} className="android-surface border-none shadow-md3-1 rounded-2xl overflow-hidden group">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center font-black text-white shadow-lg",
                            idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-orange-500" : "bg-primary/20 text-primary"
                          )}>
                            {idx < 3 ? <Award className="w-6 h-6" /> : idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-sm text-foreground truncate">{edu.displayName || 'Teacher'}</p>
                              <div className="flex gap-1">
                                {renderFriendButton(edu)}
                              </div>
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{rankInfo.title}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-primary">Rank {rankInfo.rank}</p>
                            <div className="flex items-center justify-end gap-1 text-orange-500">
                              <Flame className="w-3 h-3 fill-current" />
                              <span className="text-[10px] font-black">{edu.streakCount || 0}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                    <Compass className="w-4 h-4 text-primary" />
                    Live Trace
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Live Activity</span>
                  </div>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-32 bg-card rounded-[3rem] border-2 border-dashed border-border/50">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Syncing Network...</p>
                  </div>
                ) : filteredActivity.length === 0 ? (
                  <div className="text-center py-24 bg-card rounded-[3rem] border shadow-inner">
                    <Globe className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground font-bold text-sm">No activity detected here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredActivity.map((activity) => (
                      <Card key={activity.id} className="android-surface border-none shadow-md3-1 rounded-[2rem] bg-card hover:shadow-xl transition-all duration-300 group overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/20 group-hover:bg-primary transition-colors" />
                        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center font-black text-primary text-xl shadow-inner group-hover:scale-110 transition-transform">
                              {activity.displayName?.charAt(0) || 'T'}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <p className="font-black text-lg text-foreground">{activity.displayName || 'Teacher'}</p>
                                <div className="flex gap-2">
                                  {renderFriendButton({ id: activity.userId, displayName: activity.displayName })}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                  <Star className="w-3 h-3" /> {activity.subject || 'Simulation'} • {formatDistanceToNow(activity.timestamp)} ago
                                </p>
                                {activity.locationCity && (
                                  <Badge variant="outline" className="h-5 px-2 bg-emerald-500/5 border-emerald-500/20 text-[8px] font-black uppercase text-emerald-600">
                                    <Building2 className="w-2.5 h-2.5 mr-1" /> {activity.locationCity}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">Rating</p>
                              <div className={cn("text-2xl font-black tracking-tighter tabular-nums leading-none", activity.overallScore >= 75 ? "text-emerald-600" : "text-orange-600")}>
                                {activity.overallScore}%
                              </div>
                            </div>
                            <button className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-primary hover:text-primary-foreground active:scale-90 transition-all">
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="records" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <div className="w-20 h-20 bg-yellow-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl border-4 border-yellow-500/20">
                  <Crown className="w-10 h-10 text-yellow-600 animate-victory" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tighter">Global Intelligence Records</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-60">Guinness-Standard Pedagogical Vault</p>
                </div>
              </div>

              {loadingRecords ? (
                <div className="flex flex-col items-center justify-center py-24 bg-card rounded-[3rem] border-2 border-dashed border-border/50">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Decrypting World Records...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {worldRecords.length === 0 ? (
                    <div className="col-span-full py-24 text-center">
                      <ShieldCheck className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                      <p className="text-muted-foreground font-bold">No world records established yet.</p>
                    </div>
                  ) : (
                    worldRecords.map((record, idx) => (
                      <Card key={record.id} className="android-surface border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-yellow-500/10 via-card to-card border-2 border-yellow-500/20 overflow-hidden group">
                        <CardContent className="p-8 relative">
                          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                            <Medal className="w-24 h-24 text-yellow-600" />
                          </div>
                          
                          <div className="flex items-start justify-between mb-8 relative z-10">
                            <div className="space-y-1">
                              <Badge className="bg-yellow-500 text-yellow-900 font-black text-[8px] uppercase tracking-widest rounded-lg px-3 mb-2 border-none">World Record</Badge>
                              <h3 className="text-2xl font-black tracking-tighter leading-none">{record.subject === 'all' ? 'The Perfect Simulation' : record.subject}</h3>
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Absolute Global Peak</p>
                            </div>
                            <div className="text-right">
                              <div className="text-4xl font-black text-yellow-600 tracking-tighter">{record.overallScore}%</div>
                              <span className="text-[8px] font-black uppercase text-muted-foreground opacity-40">Precision</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-5 p-5 bg-card rounded-[2rem] border-2 border-yellow-500/10 shadow-sm relative z-10">
                            <div className="w-14 h-14 bg-yellow-500/20 rounded-2xl flex items-center justify-center font-black text-yellow-700 text-xl shadow-inner">
                              {record.displayName?.charAt(0) || 'T'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-lg text-foreground truncate">{record.displayName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="h-5 px-2 bg-emerald-500/5 border-emerald-500/20 text-[8px] font-black uppercase text-emerald-600">
                                  <Building2 className="w-2.5 h-2.5 mr-1" /> {record.locationCity || 'International'}
                                </Badge>
                                <div className="flex items-center gap-1 text-[8px] font-black text-muted-foreground opacity-60 uppercase">
                                  <Timer className="w-2.5 h-2.5" />
                                  {formatTime(record.timeSpent)}
                                </div>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-yellow-500/10 hover:text-yellow-600">
                              <ChevronRight className="w-5 h-5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="peers" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PeerLinks />
          </TabsContent>

          <TabsContent value="squad" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SquadHub />
          </TabsContent>
        </Tabs>

        <footer className="pt-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-[1px] w-16 bg-border" />
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
              <TrendingUp className="w-4 h-4 text-primary" />
            </motion.div>
            <div className="h-[1px] w-16 bg-border" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-40">Connecting 15K+ Aspiring Teachers</p>
        </footer>
      </div>
    </div>
  );
}
