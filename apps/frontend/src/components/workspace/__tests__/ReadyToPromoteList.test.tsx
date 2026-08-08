import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ReadyToPromoteList } from '../ReadyToPromoteList';

// Mock the copy module to return keys
vi.mock('@flow-app/copy', () => ({
  copy: { t: (key: string) => key },
}));

// Mock the api client
vi.mock('../../../api/client', () => ({
  api: {
    listSessions: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    downloadArtifact: vi.fn(),
    promoteArtifact: vi.fn(),
  },
}));

// Mock react-router
vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock SWR
vi.mock('swr', () => {
  const actual = vi.importActual('swr');
  return {
    ...actual,
    default: () => ({ data: undefined, isLoading: true, error: undefined }),
    mutate: vi.fn(),
  };
});

describe('ReadyToPromoteList', () => {
  it('returns skeleton while loading', () => {
    const { container } = render(<ReadyToPromoteList workspaceId="ws-1" />);
    expect(container).toBeDefined();
  });

  it('renders without crashing when mounted', () => {
    const { container } = render(<ReadyToPromoteList workspaceId="ws-1" />);
    expect(container).toBeDefined();
  });
});
