import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { processDailyTasks } from './ai/flows/daily-task';

// Initialize Firebase Admin
admin.initializeApp();

// Advanced rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string, deviceFingerprint?: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const key = deviceFingerprint ? `${userId}:${deviceFingerprint}` : userId;
  
  const existing = rateLimitStore.get(key);
  
  if (!existing || now > existing.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 3600000 }); // 1 hour window
    return { allowed: true };
  }
  
  if (existing.count >= 12) { // Max 12 claims per hour (higher for recovery flexibility)
    return { allowed: false, reason: 'Calibration limit reached. Try again in 1 hour.' };
  }
  
  existing.count++;
  return { allowed: true };
}

// Daily Task Function
export const dailyTask = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method === 'GET') {
    res.json({ 
      status: 'online',
      engine: 'DailyTaskFlow v2.2.0',
      timestamp: Date.now()
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body || {};
    const { 
      userId,
      dailyQuestionsAnswered,
      dailyTestsFinished,
      mistakesReviewed,
      streakCount,
      dailyCreditEarned,
      taskLoginClaimed,
      taskQuestionsClaimed,
      taskMockClaimed,
      taskMistakesClaimed,
      lastActiveDate,
      lastTaskReset,
      totalSessionTime,
      averageQuestionTime,
      isPro,
      userTier,
      deviceFingerprint,
      isStreakRecoveryRequested
    } = body;

    if (!userId) {
      res.status(401).json({ reward: 0, error: 'Authorization required' });
      return;
    }

    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    // Strict validation of input types to prevent farming
    if (typeof dailyQuestionsAnswered !== 'number' || dailyQuestionsAnswered > 500) {
      res.status(400).json({ error: 'Inconsistent metadata' });
      return;
    }

    const rateLimitCheck = checkRateLimit(userId, deviceFingerprint);
    if (!rateLimitCheck.allowed) {
      res.status(429).json({ reward: 0, error: rateLimitCheck.reason });
      return;
    }

    const result = await processDailyTasks({ 
      userId,
      dailyQuestionsAnswered: dailyQuestionsAnswered || 0,
      dailyTestsFinished: dailyTestsFinished || 0,
      mistakesReviewed: mistakesReviewed || 0,
      streakCount: streakCount || 0,
      dailyCreditEarned: dailyCreditEarned || 0,
      taskLoginClaimed: taskLoginClaimed || false,
      taskQuestionsClaimed: taskQuestionsClaimed || false,
      taskMockClaimed: taskMockClaimed || false,
      taskMistakesClaimed: taskMistakesClaimed || false,
      lastActiveDate,
      lastTaskReset,
      totalSessionTime: totalSessionTime || 0,
      averageQuestionTime: averageQuestionTime || 0,
      isPro: isPro || false,
      userTier: userTier || 'Bronze',
      deviceFingerprint,
      ipAddress: clientIP,
      isStreakRecoveryRequested: isStreakRecoveryRequested || false
    });

    // Security headers
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    
    res.json(result);
  } catch (error: any) {
    console.error('Daily task processing error:', error);
    res.status(500).json({ reward: 0, error: 'Calibration sync failed' });
  }
});

// Events Function
export const events = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method === 'GET') {
    try {
      // Mock events data - in production, this would be fetched from Firestore
      const mockEvents = [
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

      const activeEvents = mockEvents.filter(e => e.isActive && e.endTime > Date.now());
      res.json({ events: activeEvents });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const { userId, eventId, score, accuracy, timeSpent } = body;

      if (!userId || !eventId || score === undefined) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // In production, save to Firestore: event_leaderboard/{eventId}/participants/{userId}
      // For now, return success
      res.json({ 
        success: true, 
        message: 'Score submitted successfully',
        rank: Math.floor(Math.random() * 10) + 1 // Mock rank
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
});

// Download Function
export const download = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const fileId = '1P6koEZkbneHP21ik3B_vYub3GS5_zKow';
  const baseUrl = 'https://docs.google.com/uc?export=download';
  const url = `${baseUrl}&id=${fileId}`;

  try {
    // Stage 1: Initial request to establishment session and check for confirmation page
    const initialResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!initialResponse.ok) {
      throw new Error(`Source fetch failed: ${initialResponse.status}`);
    }

    const contentType = initialResponse.headers.get('content-type') || '';
    const setCookie = initialResponse.headers.get('set-cookie');

    // If Google returns HTML, it's likely the "Large File" warning page
    if (contentType.includes('text/html')) {
      const bodyText = await initialResponse.text();
      
      // Stage 2: Extract the confirmation token using a more robust regex
      // Google uses this token to ensure users acknowledge the file couldn't be scanned
      const confirmMatch = bodyText.match(/confirm=([a-zA-Z0-9-_]+)/);
      
      if (confirmMatch) {
        const confirmToken = confirmMatch[1];
        const confirmedUrl = `${url}&confirm=${confirmToken}`;
        
        // Stage 3: Final request with token and session cookies to start the binary stream
        const finalResponse = await fetch(confirmedUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Cookie': setCookie || '',
          },
        });

        if (!finalResponse.ok) {
          throw new Error(`Confirmed download failed: ${finalResponse.status}`);
        }

        // Stage 4: Stream binary directly to client with professional headers
        res.set('Content-Type', 'application/vnd.android.package-archive');
        res.set('Content-Disposition', 'attachment; filename="let-practice-app.apk"');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        
        if (finalResponse.body) {
          const reader = finalResponse.body.getReader();
          const stream = new ReadableStream({
            start(controller) {
              function push() {
                reader.read().then(({ done, value }) => {
                  if (done) {
                    controller.close();
                    return;
                  }
                  controller.enqueue(value);
                  push();
                });
              }
              push();
            }
          });
          stream.pipeTo(new WritableStream({
            write(chunk) {
              res.write(chunk);
            },
            close() {
              res.end();
            }
          }));
        }
        return;
      }
    }

    // Fallback: If it's already binary or no token was found, stream the initial response
    res.set('Content-Type', 'application/vnd.android.package-archive');
    res.set('Content-Disposition', 'attachment; filename="let-practice-app.apk"');
    
    if (initialResponse.body) {
      const reader = initialResponse.body.getReader();
      const stream = new ReadableStream({
        start(controller) {
          function push() {
            reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              controller.enqueue(value);
              push();
            });
          }
          push();
        }
      });
      stream.pipeTo(new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        }
      }));
    }
  } catch (error: any) {
    console.error('Download Proxy Error:', error);
    // Ultimate Fallback: Redirect directly to Google Drive if the proxy handshake fails
    res.redirect(`https://drive.google.com/uc?export=download&id=${fileId}`);
  }
});

// APK Function
export const apk = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method === 'GET') {
    try {
      const apkConfigRef = admin.firestore().collection('app_config').doc('apk');
      const snapshot = await apkConfigRef.get();

      if (snapshot.exists) {
        res.json(snapshot.data());
      } else {
        res.json({
          version: null,
          downloadURL: null,
          message: 'No APK uploaded yet',
        });
      }
    } catch (error: any) {
      console.error('Error fetching APK config:', error);
      res.status(500).json({ error: 'Failed to fetch APK config' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      // Note: Firebase Functions don't handle multipart/form-data easily
      // This would need to be handled differently or use a different approach
      res.status(501).json({ error: 'File upload not supported in this environment' });
    } catch (error: any) {
      console.error('APK upload error:', error);
      res.status(500).json({ error: error.message || 'Failed to upload APK' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
});
