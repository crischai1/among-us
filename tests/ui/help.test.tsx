// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SKELD } from '../../shared/map/skeld';

vi.mock('../../src/net/session', () => ({ send: () => {} }));

const { HelpOverlay } = await import('../../src/ui/HelpOverlay');

describe('HelpOverlay', () => {
  it('opens on the rules and closes with Escape', () => {
    const onClose = vi.fn();
    render(<HelpOverlay onClose={onClose} />);
    expect(screen.getByText('Crewmates')).toBeInTheDocument();
    expect(screen.getByText('Meetings')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the map with facts taken from its definition', () => {
    render(<HelpOverlay onClose={() => {}} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Map' }));
    for (const s of SKELD.sabotages) expect(screen.getByText(s.label, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`^${SKELD.vents.length} vents in`))).toBeInTheDocument();
    expect(screen.getByText('Cafeteria', { selector: 'dd' })).toBeInTheDocument();
  });
});
