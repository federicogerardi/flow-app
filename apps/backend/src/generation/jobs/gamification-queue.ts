import { Queue } from 'bullmq';

let gamificationQueue: Queue | null;

export function getGamificationQueue(redisUrl: string): Queue {
  if (!gamificationQueue) {
    gamificationQueue = new Queue('gamification-events', {
      connection: { url: redisUrl },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 3600 * 24 },
        removeOnFail: { age: 3600 * 24 * 7 },
      },
    });
  }
  return gamificationQueue;
}
