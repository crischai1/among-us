// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MIRA } from '../../shared/map/mira';
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

  it('switches to MIRA HQ and lists its gimmicks', () => {
    render(<HelpOverlay onClose={() => {}} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Map' }));
    fireEvent.click(screen.getByRole('tab', { name: MIRA.name }));
    expect(screen.getByText(`${MIRA.vents.length} vents in 1 network`)).toBeInTheDocument();
    expect(screen.getByText('Door log')).toBeInTheDocument();
    expect(screen.getByText('Decontamination')).toBeInTheDocument();
    expect(screen.getByText('None: impostors can’t lock rooms here')).toBeInTheDocument();
  });

  it('shows Polus with its lockable doors and cameras', () => {
    render(<HelpOverlay onClose={() => {}} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Map' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Polus' }));
    expect(screen.getByText('Seismic Stabilizers', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Security (6 views)')).toBeInTheDocument();
    expect(screen.getByText('12 vents in 4 networks')).toBeInTheDocument();
    // Emergency button and vitals are both in the Office.
    expect(screen.getAllByText('Office', { selector: 'dd' })).toHaveLength(2);
  });
});
