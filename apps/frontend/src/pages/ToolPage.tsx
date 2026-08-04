import { useParams } from 'react-router';
import { ToolPageLayout } from '../components/layout/ToolPageLayout';

export default function ToolPage() {
  const { workspaceId, toolKey } = useParams<{ workspaceId: string; toolKey: string }>();

  if (!workspaceId || !toolKey) return null;

  return <ToolPageLayout workspaceId={workspaceId} toolKey={toolKey} />;
}
