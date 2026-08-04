import { Box } from '@mui/material';
import { useMachine } from '@xstate/react';
import { toolPageMachine } from '../../machines/tool-page-machine';

interface ToolPageLayoutProps {
  children: React.ReactNode;
}

/**
 * Wraps tool pages with XState machine for phase-driven rendering.
 * The machine manages: configuring → submitting → running → completed|failed|cancelled.
 */
export function ToolPageLayout({ children }: ToolPageLayoutProps) {
  const [state] = useMachine(toolPageMachine);

  return (
    <Box data-phase={state.context.phase}>
      {children}
    </Box>
  );
}

export { toolPageMachine };
