import { useState } from 'react';
import { mutate } from 'swr';
import { PromoteDialog } from '../components/shared/PromoteDialog';
import { TOOL_PRODUCES_MAP } from '../constants/assets';
import type { SessionListItemDTO } from '@flow-app/contracts';

interface PromoteDialogState {
  open: boolean;
  sessionId: string | null;
  artifactId: string | null;
  assetType: string;
}

const INITIAL_DIALOG: PromoteDialogState = {
  open: false,
  sessionId: null,
  artifactId: null,
  assetType: '',
};

interface UsePromoteActionOptions {
  workspaceId: string;
  /** SWR keys to revalidate after promotion (via global mutate) */
  mutateKeys?: string[];
}

/**
 * Encapsulates the "Promote to asset" dialog flow used by session list surfaces
 * (ReadyToPromoteList, SessionList/CompletedCard).
 *
 * Returns:
 * - `isAlreadyPromoted(session)` — true if backend says promoted OR locally promoted
 * - `openPromoteDialog(session)` — opens the naming dialog for a session
 * - `promoteDialog` — ReactNode to render at the bottom of the component
 */
export function usePromoteAction({ workspaceId, mutateKeys = [] }: UsePromoteActionOptions) {
  const [dialog, setDialog] = useState<PromoteDialogState>(INITIAL_DIALOG);
  // Sessions promoted in the current page view — immediate feedback before SWR revalidates.
  // Backend-populated `promotedAssetId` handles persistence across page refreshes.
  const [locallyPromotedIds, setLocallyPromotedIds] = useState<Set<string>>(new Set());

  /** True if the session's last artifact is already promoted (backend state) or was just promoted locally. */
  const isAlreadyPromoted = (session: SessionListItemDTO): boolean =>
    !!session.promotedAssetId || locallyPromotedIds.has(session.id);

  const handleDialogClose = () => setDialog(INITIAL_DIALOG);

  const openPromoteDialog = (session: SessionListItemDTO) => {
    const artifactId = session.lastArtifactId;
    if (!artifactId) return;
    const assetType = TOOL_PRODUCES_MAP[session.toolKey] ?? session.toolKey;
    setDialog({ open: true, sessionId: session.id, artifactId, assetType });
  };

  const handlePromoted = async (sessionId: string) => {
    setLocallyPromotedIds((prev) => new Set(prev).add(sessionId));
    // Invalidate all provided SWR keys so the list reflects the update on next fetch
    await Promise.all(mutateKeys.map((key) => mutate(key)));
  };

  const promoteDialog = dialog.open && dialog.artifactId ? (
    <PromoteDialog
      open={dialog.open}
      onClose={handleDialogClose}
      artifactId={dialog.artifactId}
      workspaceId={workspaceId}
      assetType={dialog.assetType}
      onPromoted={(_assetId, _assetType, _name) => {
        handleDialogClose();
        if (dialog.sessionId) {
          handlePromoted(dialog.sessionId);
        }
      }}
    />
  ) : null;

  return { isAlreadyPromoted, openPromoteDialog, promoteDialog } as const;
}