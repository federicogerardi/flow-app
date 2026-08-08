import { Breadcrumbs, Box, Typography, Button, Link, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router';
import { useBreadcrumbs } from '../layout/AppShell';
import type { ReactNode } from 'react';

interface PageHeaderAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  color?: 'primary' | 'error' | 'default';
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Inline metadata rendered right of the title (compact chips/stats) */
  meta?: ReactNode;
  /** Single action — backward compat. Prefer `actions` for multiple icons. */
  action?: { label: string; onClick: () => void };
  /** Multiple icon-only outline actions rendered as a group on the right */
  actions?: PageHeaderAction[];
}

export function PageHeader({ title, subtitle, meta, action, actions }: PageHeaderProps) {
  const navigate = useNavigate();
  const { crumbs } = useBreadcrumbs();

  return (
    <Box sx={{ mb: meta ? 1.5 : 3 }}>
      {crumbs.length > 0 && (
        <Breadcrumbs sx={{ mb: 1 }}>
          {crumbs.map((c, i) =>
            c.path ? (
              <Link
                key={i}
                component="button"
                variant="body2"
                onClick={() => navigate(c.path!)}
                underline="hover"
              >
                {c.label}
              </Link>
            ) : (
              <Typography key={i} variant="body2" color="text.secondary">
                {c.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h2">{title}</Typography>
            {meta && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{meta}</Box>}
          </Box>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {actions && actions.map((a, i) => (
            <Tooltip key={i} title={a.label}>
              <IconButton
                size="small"
                onClick={a.onClick}
                color={a.color ?? 'default'}
                aria-label={a.label}
              >
                {a.icon}
              </IconButton>
            </Tooltip>
          ))}
          {!actions && action && (
            <Button variant="contained" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}