import { Breadcrumbs, Box, Typography, Button, Link } from '@mui/material';
import { useNavigate } from 'react-router';
import { useBreadcrumbs } from '../layout/AppShell';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const navigate = useNavigate();
  const { crumbs } = useBreadcrumbs();

  return (
    <Box sx={{ mb: 3 }}>
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
          <Typography variant="h2">{title}</Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && (
          <Button variant="contained" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </Box>
    </Box>
  );
}
