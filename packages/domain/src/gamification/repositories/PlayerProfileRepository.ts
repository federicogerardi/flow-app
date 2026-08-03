import type { PlayerProfile } from '../entities/PlayerProfile';

export interface PlayerProfileRepository {
  findByUserId(userId: string): Promise<PlayerProfile | null>;
  findOrCreate(userId: string): Promise<PlayerProfile>;
  save(profile: PlayerProfile): Promise<void>;
  saveWithLock(profile: PlayerProfile, expectedVersion: number): Promise<void>;
}
