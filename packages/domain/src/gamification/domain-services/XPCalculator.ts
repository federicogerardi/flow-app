/**
 * Stateless pure function — maps domain event type to XP amount.
 * Zero I/O, zero infrastructure imports.
 */
export class XPCalculator {
  static xpFor(eventType: string): number {
    switch (eventType) {
      case 'SessionCompleted': return 50;
      case 'ArtifactPromoted': return 100;  // Deferred: event not yet emitted by generation context
      case 'MemberJoined': return 75;
      case 'MessageAdded': return 10;
      default: return 0;
    }
  }
}
