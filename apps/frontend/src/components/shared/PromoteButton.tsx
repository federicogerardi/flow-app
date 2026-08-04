import { Button, Tooltip } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import { copy } from '@flow-app/copy';

interface PromoteButtonProps {
  artifactId: string;
  workspaceId: string;
  onPromoted?: () => void;
  disabled?: boolean;
}

export function PromoteButton({ artifactId: _artifactId, workspaceId: _workspaceId, onPromoted: _onPromoted, disabled = true }: PromoteButtonProps) {
  return (
    <Tooltip title={disabled ? 'API in arrivo — presto disponibile' : copy.t('shared.actions.promote')}>
      <span>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PushPinIcon />}
          disabled={disabled}
          onClick={() => {
            // TODO: call api.promoteArtifact(artifactId, workspaceId) when endpoint exists
          }}
        >
          {copy.t('shared.actions.promote')}
        </Button>
      </span>
    </Tooltip>
  );
}
