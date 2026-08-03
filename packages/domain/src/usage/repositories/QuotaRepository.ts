import type { Quota } from '../entities/Quota';

export interface QuotaRepository {
  findByUserAndPeriod(userId: string, period: string): Promise<Quota | null>;
  findCurrent(userId: string): Promise<Quota | null>;
  save(quota: Quota): Promise<void>;
  saveWithLock(quota: Quota, expectedVersion: number): Promise<void>;
}
