// Entities
export { Session, InvalidSessionStateError } from './entities/Session';
export { Artifact } from './entities/Artifact';

// Value Objects
export { SessionId } from './value-objects/SessionId';
export type { ToolKey } from './value-objects/ToolKey';
export { StepNumber } from './value-objects/StepNumber';
export { ArtifactId } from './value-objects/ArtifactId';
export { ArtifactContent } from './value-objects/ArtifactContent';
export type { SessionStatus } from './value-objects/SessionStatus';
export type { ArtifactStatus } from './value-objects/ArtifactStatus';
export { ReadinessPolicy } from './value-objects/ReadinessPolicy';
export type { AcquisitionData } from './value-objects/ReadinessPolicy';

// Lifecycle
export { SessionLifecycle } from './session-lifecycle';
export type { SessionState, SessionEventType } from './session-lifecycle';

// Domain Events
export { SessionStarted } from './domain-events/SessionStarted';
export { StepCompleted } from './domain-events/StepCompleted';
export { SessionCompleted } from './domain-events/SessionCompleted';
export { SessionFailed } from './domain-events/SessionFailed';
export { SessionCancelled } from './domain-events/SessionCancelled';

// Domain Services
export { ContextEnricher } from './domain-services/ContextEnricher';

// Repository Interfaces
export type { SessionRepository } from './repositories/SessionRepository';

// Tools
export { toolRegistry, getTool } from './tools';
export type { ToolDefinition, StepDefinition, ModelTier } from './tools/tool-definition';
