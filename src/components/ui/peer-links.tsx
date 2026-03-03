
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  orderBy,
  limit,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  MessageSquare, 
  UserPlus, 
  Loader2, 
  Send, 
  ShieldCheck,
  ChevronRight,
  X,
  Link as LinkIcon
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getRankData } from '@/lib/xp-system';

interface Peer {
  id: string;
  displayName: string;
  photoURL?: string;
  xp: number;
  majorship?: string;
  status: 'pending' | 'accepted';
  friendshipId: string;
  isInitiator: boolean;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export function PeerLinks() {
  const { user, refreshUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [peers, setPeers] = useState<Peer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatPeer, setActiveChatChatPeer] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !firestore) return;

    const friendshipsQuery = query(
      collection(firestore, 'friendships'),
      where('userIds', 'array-contains', user.uid)
    );

    const unsub = onSnapshot(friendshipsQuery, async (snap) => {
      const peerLinks: Peer[] = [];
      
      for (const fDoc of snap.docs) {
        const data = fDoc.data();
        const otherUserId = data.userIds.find((id: string) => id !== user.uid);
        
        // Fetch peer user profile
        const peerSnap = await getDoc(doc(firestore, 'users', otherUserId));
        if (peerSnap.exists()) {
          const peerData = peerSnap.data();
          peerLinks.push({
            id: otherUserId,
            displayName: peerData.displayName || 'Teacher',
            photoURL: peerData.photoURL,
            xp: peerData.xp || 0,
            majorship: peerData.majorship,
            status: data.status,
            friendshipId: fDoc.id,
            isInitiator: data.initiatorId === user.uid
          });
        }
      }
      
      setPeers(peerLinks);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid, firestore]);

  // Chat Messages Listener
  useEffect(() => {
    if (!activeChatPeer || !firestore) return;

    const messagesQuery = query(
      collection(firestore, 'friendships', activeChatPeer.friendshipId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    const unsub = onSnapshot(messagesQuery, (snap) => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    });

    return () => unsub();
  }, [activeChatPeer, firestore]);

  const handleAcceptLink = async (peer: Peer) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'friendships', peer.friendshipId), { 
        status: 'accepted',
        lastUpdated: serverTimestamp() 
      });
      toast({ variant: "reward", title: "Link Synchronized", description: `You are now linked with ${peer.displayName}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed", description: "Could not accept peer link." });
    }
  };

  const handleRejectLink = async (peer: Peer) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'friendships', peer.friendshipId));
      toast({ title: "Link Purged", description: "Peer request has been removed." });
    } catch (e) {
      toast({ variant: "destructive", title: "Purge Failed", description: "Could not remove request." });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChatPeer || !user || !firestore || isSending) return;
    setIsSending(true);
    try {
      await addDoc(collection(firestore, 'friendships', activeChatPeer.friendshipId, 'messages'), {
        senderId: user.uid,
        text: newMessage,
        timestamp: Date.now()
      });
      // Update last activity on friendship doc
      await updateDoc(doc(firestore, 'friendships', activeChatPeer.friendshipId), {
        lastUpdated: serverTimestamp()
      });
      setNewMessage("");
    } catch (e) {
      toast({ variant: "destructive", title: "Comm Interruption", description: "Message could not be transmitted." });
    } finally {
      setIsSending(false);
    }
  };

  const acceptedPeers = useMemo(() => peers.filter(p => p.status === 'accepted'), [peers]);
  const pendingRequests = useMemo(() => peers.filter(p => p.status === 'pending' && !p.isInitiator), [peers]);
  const sentRequests = useMemo(() => peers.filter(p => p.status === 'pending' && p.isInitiator), [peers]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-card rounded-[3rem] border-2 border-dashed border-border/50">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Syncing Peer Network...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Pending Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2 px-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Incoming Links ({pendingRequests.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map(peer => (
              <Card key={peer.id} className="android-surface border-none shadow-md3-1 rounded-2xl bg-card group overflow-hidden">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary border border-primary/10 shadow-inner">
                      {peer.displayName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm text-foreground truncate">{peer.displayName}</p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate">Rank {getRankData(peer.xp).rank}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleAcceptLink(peer)} 
                      className="h-9 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg bg-primary"
                    >
                      Accept
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRejectLink(peer)} 
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-rose-50 hover:text-rose-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Peer List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Peer Roster ({acceptedPeers.length})
          </h3>
          <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 bg-primary/5 text-primary">Active Links</Badge>
        </div>

        {acceptedPeers.length === 0 ? (
          <Card className="p-12 text-center border-2 border-dashed border-border/50 rounded-[2.5rem] bg-muted/5">
            <LinkIcon className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h4 className="text-lg font-black mb-1 text-foreground">No Active Links</h4>
            <p className="text-xs text-muted-foreground font-medium max-w-xs mx-auto mb-6 leading-relaxed">Link with peers in the Global Feed to start collaborative traces and tactical comms.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {acceptedPeers.map(peer => {
              const rank = getRankData(peer.xp);
              return (
                <Card key={peer.id} className="android-surface border-none shadow-md3-1 rounded-2xl bg-card hover:shadow-xl transition-all group cursor-pointer" onClick={() => setActiveChatChatPeer(peer)}>
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary border border-primary/10 shadow-inner group-hover:bg-primary group-hover:text-white transition-all duration-500">
                          {peer.displayName.charAt(0)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-card rounded-full shadow-sm" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm text-foreground truncate">{peer.displayName}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate">{peer.majorship || 'Aspiring Teacher'}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-muted/30 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <MessageSquare className="w-5 h-5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Sent Requests Section */}
      {sentRequests.length > 0 && (
        <div className="pt-4 border-t border-border/50">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 px-2 mb-4">
            Pending Transmission Trace ({sentRequests.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sentRequests.map(peer => (
              <div key={peer.id} className="flex items-center justify-between p-4 bg-muted/10 rounded-2xl border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center font-bold text-muted-foreground border">
                    {peer.displayName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">{peer.displayName}</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Waiting for verification...</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleRejectLink(peer)} 
                  className="h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-[8px] font-black uppercase"
                >
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tactical Chat Dialog */}
      <Dialog open={!!activeChatPeer} onOpenChange={() => setActiveChatChatPeer(null)}>
        <DialogContent className="max-w-md w-full h-[85vh] sm:h-[600px] rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden outline-none z-[1300] flex flex-col bg-background">
          <DialogHeader className="p-6 border-b bg-card shrink-0 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center font-black text-primary shadow-inner">
                {activeChatPeer?.displayName.charAt(0)}
              </div>
              <div className="text-left">
                <DialogTitle className="text-lg font-black tracking-tight text-foreground">{activeChatPeer?.displayName}</DialogTitle>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black uppercase text-emerald-600 tracking-widest">Active Comm-Link</span>
                </div>
              </div>
            </div>
            <DialogClose className="rounded-full h-10 w-10 bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center active:scale-90">
              <X className="w-5 h-5 text-muted-foreground" />
            </DialogClose>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-muted/5" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                <ShieldCheck className="w-12 h-12 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">End-to-end encrypted trace</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === user?.uid;
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn(
                      "flex w-full",
                      isMine ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[80%] p-4 rounded-2xl text-sm font-medium shadow-sm relative",
                      isMine 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-card border border-border/50 text-foreground rounded-tl-none"
                    )}>
                      {msg.text}
                      <p className={cn(
                        "text-[7px] font-black uppercase tracking-widest mt-1 opacity-40",
                        isMine ? "text-white" : "text-muted-foreground"
                      )}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          <div className="p-6 bg-card border-t shrink-0">
            <div className="flex gap-2">
              <Input 
                placeholder="Type communication..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="h-12 rounded-xl border-2 font-medium bg-muted/10 focus:bg-card transition-all"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
                size="icon"
                className="h-12 w-12 rounded-xl shadow-lg bg-primary shrink-0 active:scale-90 transition-all"
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 text-primary-foreground fill-current" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
