import { NextRequest, NextResponse } from 'next/server';

// Event types
interface Event {
  id: string;
  title: string;
  category: string;
  questionCount: number;
  startTime: number;
  endTime: number;
  rewardType: string;
  rewardAmount: number;
  isActive: boolean;
}

// Mock events data - in production, this would be fetched from Firestore
const mockEvents: Event[] = [
  {
    id: 'weekly-1',
    title: 'Weekly Challenge',
    category: 'General Education',
    questionCount: 50,
    startTime: Date.now() - 86400000, // Started yesterday
    endTime: Date.now() + 6 * 86400000, // Ends in 6 days
    rewardType: 'credits',
    rewardAmount: 25,
    isActive: true,
  },
  {
    id: 'daily-speed-1',
    title: 'Daily Speed Battle',
    category: 'Professional Education',
    questionCount: 25,
    startTime: Date.now() - 3600000, // Started 1 hour ago
    endTime: Date.now() + 23 * 3600000, // Ends in 23 hours
    rewardType: 'credits',
    rewardAmount: 15,
    isActive: true,
  },
  {
    id: 'monthly-masters',
    title: 'Monthly LET Masters',
    category: 'Specialization',
    questionCount: 150,
    startTime: Date.now() - 15 * 86400000, // Started 15 days ago
    endTime: Date.now() + 15 * 86400000, // Ends in 15 days
    rewardType: 'pro',
    rewardAmount: 7,
    isActive: true,
  },
];

export async function GET(req: NextRequest) {
  try {
    // In production, fetch from Firestore
    const activeEvents = mockEvents.filter(e => e.isActive && e.endTime > Date.now());
    return NextResponse.json({ events: activeEvents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, eventId, score, accuracy, timeSpent } = body;

    if (!userId || !eventId || score === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // In production, save to Firestore: event_leaderboard/{eventId}/participants/{userId}
    // For now, return success
    return NextResponse.json({ 
      success: true, 
      message: 'Score submitted successfully',
      rank: Math.floor(Math.random() * 10) + 1 // Mock rank
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
