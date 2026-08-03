import type { PlayerProfileRepository } from '@flow-app/domain';
import { PlayerProfile } from '@flow-app/domain';

export class GetPlayerProfileUseCase {
  constructor(private readonly playerProfileRepo: PlayerProfileRepository) {}

  async execute(userId: string): Promise<PlayerProfile | null> {
    return this.playerProfileRepo.findByUserId(userId);
  }
}
