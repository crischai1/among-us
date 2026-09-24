// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../shared/settings';

const sent: unknown[] = [];
vi.mock('../../src/net/session', () => ({ send: (m: unknown) => sent.push(m) }));

const { SettingsPanel } = await import('../../src/ui/SettingsPanel');

describe('SettingsPanel', () => {
  it('is read-only for non-hosts', () => {
    render(<SettingsPanel settings={DEFAULT_SETTINGS} editable={false} />);
    expect(screen.getByText('Only the host can change settings.')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText('25s')).toBeInTheDocument();
  });

  it('host edits send setSettings patches', () => {
    sent.length = 0;
    render(<SettingsPanel settings={DEFAULT_SETTINGS} editable />);
    const row = screen.getByText('Kill Cooldown').parentElement!;
    fireEvent.click(row.querySelectorAll('button')[1]);
    expect(sent).toEqual([{ t: 'setSettings', patch: { killCooldown: 27.5 } }]);
    fireEvent.click(screen.getByText('Long'));
    expect(sent[1]).toEqual({ t: 'setSettings', patch: { killDistance: 'long' } });
  });
});
