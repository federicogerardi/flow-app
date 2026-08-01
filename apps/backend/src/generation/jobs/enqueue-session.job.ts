import { Queue } from 'bullmq';

let sessionQueue: Queue | null;

export function getSessionQueue(redisUrl: string): Queue {
  if (!sessionQueue) {
    sessionQueue = new Queue('session-workflow', {
      connection: { url: redisUrl },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 3600 * 24 },
        removeOnFail: { age: 3600 * 24 * 7 },
      },
    });
  }
  return sessionQueue;
}

export async function enqueueSession(sessionId: string): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL not set');

  const queue = getSessionQueue(redisUrl);
  await queue.add(
    `session:${sessionId}`,
    { sessionId },
    { jobId: sessionId },
  );
}
