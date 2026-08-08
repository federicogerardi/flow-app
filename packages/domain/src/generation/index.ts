// Entities
export { Session, InvalidSessionStateError, SessionNotFoundError, StepNotFoundError } from './entities/Session';
export { Artifact } from './entities/Artifact';

// Value Objects
export { SessionId } from './value-objects/SessionId';
export { ToolKey, InvalidToolKeyError } from './value-objects/ToolKey';
export type { ToolKeyValue } from './value-objects/ToolKey';
export { StepNumber, InvalidStepNumberError } from './value-objects/StepNumber';
export { ArtifactId } from './value-objects/ArtifactId';
export { ArtifactContent } from './value-objects/ArtifactContent';
export { SessionStatus, InvalidSessionStatusError } from './value-objects/SessionStatus';
export type { SessionStatusValue } from './value-objects/SessionStatus';
export { ArtifactStatus, InvalidArtifactStatusError, InvalidArtifactTransitionError } from './value-objects/ArtifactStatus';
export type { ArtifactStatusValue } from './value-objects/ArtifactStatus';
export { ReadinessPolicy } from './value-objects/ReadinessPolicy';
export type { AcquisitionData } from './value-objects/ReadinessPolicy';
export { ToolOutputCategory, InvalidToolOutputCategoryError } from './value-objects/ToolOutputCategory';
export type { ToolOutputCategoryValue } from './value-objects/ToolOutputCategory';
export { CrawlData, InvalidCrawlDataError } from './value-objects/CrawlData';
export type { CrawlDataProps } from './value-objects/CrawlData';

// Lifecycle
export { SessionLifecycle } from './session-lifecycle';
export type { SessionState, SessionEventType, SessionEvent } from './session-lifecycle';

// Domain Events
export { SessionStarted } from './domain-events/SessionStarted';
export { StepCompleted } from './domain-events/StepCompleted';
export { SessionCompleted } from './domain-events/SessionCompleted';
export { SessionFailed } from './domain-events/SessionFailed';
export { SessionCancelled } from './domain-events/SessionCancelled';

// Domain Services
export { ContextEnricher } from './domain-services/ContextEnricher';

// Repository Interfaces
export type { SessionRepository, SessionFilters } from './repositories/SessionRepository';

// Tools
export { toolRegistry, getTool, getAssetProducerTools, getContentProducerTools, ToolNotFoundError } from './tools';
export type { ToolDefinition, StepDefinition, StepPromptDefinition, TextInput } from './tools/tool-definition';
export { ModelTier, InvalidModelTierError } from './value-objects/ModelTier';

// Prompting
export {
  PromptTemplateId,
  PromptVersion,
  PromptComponent,
  PromptComponentRegistry,
  PromptComponentNotFoundError,
  PromptComposer,
  getDefaultComponents,
  DEFAULT_COMPONENTS,
  InvalidPromptTemplateKeyError,
  InvalidPromptTemplateIdFormatError,
  InvalidPromptVersionError,
  EmptyComponentContentError,
} from './prompting';
export type { PromptTemplateContent, PromptTemplateRepository, ComposedPrompt } from './prompting';
export { PromptComponentType, InvalidPromptComponentTypeError } from './prompting';
export type { PromptComponentTypeValue } from './prompting';
