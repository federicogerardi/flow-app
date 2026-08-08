import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceForm } from '../WorkspaceForm';

// Mock the copy module to return keys (Copy Module Rule #2)
vi.mock('@flow-app/copy', () => ({
  copy: { t: (key: string) => key },
}));

const WORKSPACE_ACCENTS = [
  '#2563eb', '#7c3aed', '#059669', '#dc2626',
  '#d97706', '#0891b2', '#ea580c', '#4f46e5',
  '#db2777', '#65a30d',
];

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onSave: vi.fn().mockResolvedValue(undefined),
};

describe('WorkspaceForm', () => {
  it('renders create dialog with correct title', () => {
    render(<WorkspaceForm {...defaultProps} />);
    expect(screen.getByText('workspace.form.createTitle')).toBeInTheDocument();
  });

  it('renders edit dialog with correct title when workspace provided', () => {
    const workspace = { id: 'ws-1', name: 'Test WS', accentColor: '#7c3aed' };
    render(<WorkspaceForm {...defaultProps} workspace={workspace as any} />);
    expect(screen.getByText('workspace.form.editTitle')).toBeInTheDocument();
  });

  it('pre-fills name from workspace prop in edit mode', () => {
    const workspace = { id: 'ws-1', name: 'My Workspace', accentColor: '#7c3aed' };
    render(<WorkspaceForm {...defaultProps} workspace={workspace as any} />);
    expect(screen.getByDisplayValue('My Workspace')).toBeInTheDocument();
  });

  it('renders 10 color dots', () => {
    render(<WorkspaceForm {...defaultProps} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(10);
  });

  it('selects the correct accent color dot', () => {
    const workspace = { id: 'ws-1', name: 'Test WS', accentColor: '#7c3aed' };
    render(<WorkspaceForm {...defaultProps} workspace={workspace as any} />);
    const radios = screen.getAllByRole('radio');
    const selected = radios.find((r) => r.getAttribute('aria-checked') === 'true');
    expect(selected).toBeDefined();
  });

  it('save button is disabled when name is less than 2 chars', () => {
    render(<WorkspaceForm {...defaultProps} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'A' } });
    const saveButton = screen.getByRole('button', { name: 'shared.actions.save' });
    expect(saveButton).toBeDisabled();
  });

  it('save button is enabled when name is valid', () => {
    render(<WorkspaceForm {...defaultProps} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Valid Name' } });
    const saveButton = screen.getByRole('button', { name: 'shared.actions.save' });
    expect(saveButton).not.toBeDisabled();
  });

  it('calls onSave with name and accentColor on submit', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<WorkspaceForm {...defaultProps} onSave={onSave} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Workspace' } });
    const saveButton = screen.getByRole('button', { name: 'shared.actions.save' });
    fireEvent.click(saveButton);
    expect(onSave).toHaveBeenCalledWith({
      name: 'New Workspace',
      accentColor: WORKSPACE_ACCENTS[0], // default blue
    });
  });

  it('calls onClose when cancel button clicked', () => {
    const onClose = vi.fn();
    render(<WorkspaceForm {...defaultProps} onClose={onClose} />);
    const cancelButton = screen.getByRole('button', { name: 'shared.actions.cancel' });
    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when open is false', () => {
    render(<WorkspaceForm {...defaultProps} open={false} />);
    expect(screen.queryByText('workspace.form.createTitle')).not.toBeInTheDocument();
  });
});
