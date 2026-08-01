import { DomainError } from '../shared/domain-error';

export class NotWorkspaceOwnerError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly retryable = false;
  constructor(userId: string, workspaceId: string) {
    super(`User ${userId} is not the owner of workspace ${workspaceId}`);
  }
}

export class NotAWorkspaceMemberError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly retryable = false;
  constructor(userId: string, workspaceId: string) {
    super(`User ${userId} is not a member of workspace ${workspaceId}`);
  }
}

export class InsufficientWorkspacePermissionError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly retryable = false;
  constructor(userId: string, workspaceId: string, requiredRole: string) {
    super(`User ${userId} requires role ${requiredRole} in workspace ${workspaceId}`);
  }
}

export class MemberAlreadyExistsError extends DomainError {
  readonly code = 'CONFLICT';
  readonly retryable = false;
  constructor(userId: string, workspaceId: string) {
    super(`User ${userId} is already a member of workspace ${workspaceId}`);
  }
}

export class CannotRemoveOwnerError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor() {
    super('Cannot remove the workspace owner');
  }
}

export class NotAnActiveMemberError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(userId: string, workspaceId: string) {
    super(`User ${userId} is not an active member of workspace ${workspaceId}`);
  }
}

export class InvalidMembershipStateError extends DomainError {
  readonly code = 'INVALID_STATE';
  readonly retryable = false;
  constructor(message: string) {
    super(message);
  }
}

export class WorkspaceNotFoundError extends DomainError {
  readonly code = 'WORKSPACE_NOT_FOUND';
  readonly retryable = false;
  constructor(id: string) {
    super(`Workspace ${id} not found`);
  }
}
