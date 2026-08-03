import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';
describe('EmptyState', () => {
    it('renders title and message', () => {
        render(<EmptyState title="No items" message="Nothing to show"/>);
        expect(screen.getByText('No items')).toBeInTheDocument();
        expect(screen.getByText('Nothing to show')).toBeInTheDocument();
    });
    it('renders CTA button when ctaLabel and onCta provided', () => {
        render(<EmptyState title="No items" message="Nothing to show" ctaLabel="Create item" onCta={vi.fn()}/>);
        expect(screen.getByRole('button', { name: 'Create item' })).toBeInTheDocument();
    });
    it('does not render button when no ctaLabel', () => {
        render(<EmptyState title="No items" message="Nothing to show"/>);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
    it('button click calls onCta', () => {
        const onCta = vi.fn();
        render(<EmptyState title="No items" message="Nothing to show" ctaLabel="Create item" onCta={onCta}/>);
        fireEvent.click(screen.getByRole('button', { name: 'Create item' }));
        expect(onCta).toHaveBeenCalledOnce();
    });
});
//# sourceMappingURL=EmptyState.test.js.map