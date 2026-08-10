import { useState, useCallback } from 'react';
import { PromoteDialog } from './PromoteDialog';
import { PromotedBadge } from './PromotedBadge';
import { PromoteActionButton } from './PromoteActionButton';

interface PromoteButtonProps {
  artifactId: string;
  workspaceId: string;
  /** The asset type this tool produces (e.g., "persona", "brief"). Hides button if undefined. */
  produces?: string;
  /** If already promoted, the Asset UUID. Causes the button to render in "done" state on mount.
   *  When this becomes null (e.g., asset was deleted), the artifact becomes promotable again. */
  promotedAssetId?: string | null;
  onPromoted?: (assetId: string, assetType: string, name: string | null) => void;
}

export function PromoteButton({ artifactId, workspaceId, produces, promotedAssetId, onPromoted }: PromoteButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  // Track local promoted state so the button goes disabled immediately after dialog save,
  // even if the parent hasn't re-fetched yet.
  const [locallyPromoted, setLocallyPromoted] = useState(false);

  const isDone = !!(promotedAssetId) || locallyPromoted;

  const handleDialogPromoted = useCallback((assetId: string, assetType: string, name: string | null) => {
    setLocallyPromoted(true);
    onPromoted?.(assetId, assetType, name);
  }, [onPromoted]);

  if (!produces) return null;

  if (isDone) {
    return <PromotedBadge />;
  }

  return (
    <>
      <PromoteActionButton onClick={() => setDialogOpen(true)} />
      <PromoteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        artifactId={artifactId}
        workspaceId={workspaceId}
        assetType={produces}
        onPromoted={handleDialogPromoted}
      />
    </>
  );
}