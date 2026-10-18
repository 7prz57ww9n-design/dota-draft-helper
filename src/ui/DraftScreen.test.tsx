import { fireEvent, render, screen, within } from '@testing-library/react';
import { AXE, JUGGERNAUT, LION, SVEN, player, profile, profilesOf } from '../domain/testFixtures';
import { initialState, useStore } from '../store/store';
import DraftScreen from './DraftScreen';

function pickViaPicker(query: string) {
  const input = screen.getByRole('combobox', { name: /…$/ });
  fireEvent.change(input, { target: { value: query } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

beforeEach(() => {
  useStore.setState({
    ...initialState,
    draft: { mode: 'freeform', weFirst: true, available: null, actions: [], win: 'balanced' },
    players: [
      player(1, [JUGGERNAUT, SVEN]),
      player(3, [AXE]),
      player(4, [AXE, LION]),
    ],
    profiles: profilesOf(
      profile(JUGGERNAUT, { push: 2 }),
      profile(SVEN, { push: 1 }),
      profile(AXE, { initiation: 3 }),
      profile(LION, { disable: 3 }),
    ),
  });
});

describe('DraftScreen', () => {
  test('picking a pos-1 hero removes pos-1-only suggestions and raises coverage', () => {
    render(<DraftScreen />);
    const suggestions = screen.getByTestId('pick-suggestions');
    expect(within(suggestions).getAllByText(/Sven/).length).toBeGreaterThan(0);
    expect(screen.getByTestId('coverage-push').textContent).toContain('0/4');

    pickViaPicker('Juggernaut');

    expect(useStore.getState().draft.actions).toEqual([
      { side: 'us', kind: 'pick', heroId: JUGGERNAUT, position: 1 },
    ]);
    expect(within(screen.getByTestId('pick-suggestions')).queryByText(/Sven/)).toBeNull();
    expect(screen.getByTestId('coverage-push').textContent).toContain('2/4');
  });

  test('empty pools show "No candidates" and do not throw', () => {
    useStore.setState({ players: [] });
    render(<DraftScreen />);
    expect(screen.getByText('No candidates for Pos 1')).toBeTruthy();
    pickViaPicker('Juggernaut');
    expect(screen.getByRole('dialog')).toBeTruthy(); // 0 options -> prompt with all open positions
  });

  test('a hero in two open pools opens the position prompt', () => {
    render(<DraftScreen />);
    pickViaPicker('Axe');
    const dialog = screen.getByRole('dialog');
    const labels = within(dialog).getAllByRole('button').map((b) => b.textContent);
    expect(labels[0]).toContain('Pos 3');
    expect(labels[1]).toContain('Pos 4');
    expect(useStore.getState().draft.actions).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole('button', { name: /Pos 4/ }));
    expect(useStore.getState().draft.actions).toEqual([
      { side: 'us', kind: 'pick', heroId: AXE, position: 4 },
    ]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('Escape cancels the position prompt without applying', () => {
    render(<DraftScreen />);
    pickViaPicker('Axe');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useStore.getState().draft.actions).toHaveLength(0);
  });

  test('Undo removes the pick', () => {
    render(<DraftScreen />);
    pickViaPicker('Juggernaut');
    expect(useStore.getState().draft.actions).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /undo/i }));
    expect(useStore.getState().draft.actions).toHaveLength(0);
    expect(screen.getByTestId('coverage-push').textContent).toContain('0/4');
  });

  test('enemy override applies the next entry as an enemy pick', () => {
    render(<DraftScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Enemy pick' }));
    pickViaPicker('Lion');
    expect(useStore.getState().draft.actions).toEqual([{ side: 'enemy', kind: 'pick', heroId: LION }]);
  });

  test('captains draft shows the available-heroes step until started', () => {
    useStore.setState({
      draft: { mode: 'captainsDraft', weFirst: true, available: null, actions: [], win: 'balanced' },
    });
    render(<DraftScreen />);
    expect(screen.getByText('Available heroes')).toBeTruthy();
    expect(screen.queryByTestId('pick-suggestions')).toBeNull();
    pickViaPicker('Axe');
    fireEvent.click(screen.getByRole('button', { name: /start draft/i }));
    expect(useStore.getState().draft.available).toEqual([AXE]);
    expect(screen.getByTestId('pick-suggestions')).toBeTruthy();
  });
});
