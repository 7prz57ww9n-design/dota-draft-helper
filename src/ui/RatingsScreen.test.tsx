import { fireEvent, render, screen } from '@testing-library/react';
import { HEROES } from '../data/heroes';
import { initialState, useStore } from '../store/store';
import RatingsScreen from './RatingsScreen';

const pudge = HEROES.find((h) => h.localizedName === 'Pudge')!;

beforeEach(() => {
  useStore.setState({
    ...initialState,
    players: [{ id: 'pos-1', name: 'A', position: 1, pool: [{ heroId: pudge.id, comfort: 2 }] }],
    profiles: {},
  });
});

describe('RatingsScreen', () => {
  test('shows empty state with no pools', () => {
    useStore.setState({ players: [] });
    render(<RatingsScreen />);
    expect(screen.getByText(/no heroes in any pool/i)).toBeTruthy();
  });

  test('clicking a rating cell cycles 0 -> 1 -> 2 -> 3 -> 0', () => {
    render(<RatingsScreen />);
    const cell = screen.getByRole('button', { name: /Pudge Initiation/ });
    expect(cell.textContent).toBe('0');
    const seen: (number | undefined)[] = [];
    for (let i = 0; i < 4; i++) {
      fireEvent.click(cell);
      seen.push(useStore.getState().profiles[pudge.id]?.ratings.initiation);
    }
    expect(seen).toEqual([1, 2, 3, 0]);
    expect(cell.textContent).toBe('0');
  });

  test('power cells cycle and damage type is selectable', () => {
    render(<RatingsScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Pudge Power mid/ }));
    expect(useStore.getState().profiles[pudge.id].power.mid).toBe(1);
    fireEvent.change(screen.getByLabelText('Pudge damage type'), { target: { value: 'magical' } });
    expect(useStore.getState().profiles[pudge.id].damageType).toBe('magical');
  });
});
