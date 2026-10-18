import { fireEvent, render, screen, within } from '@testing-library/react';
import { HEROES } from '../data/heroes';
import { TAG_DEFINITIONS } from '../domain/tags';
import { initialState, useStore } from '../store/store';
import RatingsScreen from './RatingsScreen';

const pudge = HEROES.find((h) => h.localizedName === 'Pudge')!;
const axe = HEROES.find((h) => h.localizedName === 'Axe')!;

beforeEach(() => {
  useStore.setState({
    ...initialState,
    players: [{ id: 'pos-1', name: 'A', position: 1, pool: [{ heroId: pudge.id, comfort: 2 }, { heroId: axe.id, comfort: 3 }] }],
    profiles: {},
  });
});

const tagRow = (label: string) => screen.getByRole('radiogroup', { name: label });

describe('RatingsScreen', () => {
  test('shows empty state with no pools', () => {
    useStore.setState({ players: [] });
    render(<RatingsScreen />);
    expect(screen.getByText(/no heroes in any pool/i)).toBeTruthy();
  });

  test('lists pool heroes alphabetically and edits the first one by default', () => {
    render(<RatingsScreen />);
    const list = screen.getByRole('list', { name: 'Heroes to rate' });
    expect(within(list).getAllByRole('button').map((b) => b.textContent)).toEqual([
      expect.stringContaining('Axe'), expect.stringContaining('Pudge'),
    ]);
    expect(screen.getByRole('heading', { level: 3, name: 'Axe' })).toBeInTheDocument();
  });

  test('each tag row shows its label and definition and sets a 0–3 rating', () => {
    render(<RatingsScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Pudge/ }));
    expect(screen.getByText(TAG_DEFINITIONS.waveclear)).toBeInTheDocument();
    const waveclear = tagRow('Waveclear');
    expect(within(waveclear).getByRole('radio', { name: /^0/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(within(waveclear).getByRole('radio', { name: /^3/ }));
    expect(useStore.getState().profiles[pudge.id].ratings.waveclear).toBe(3);
    expect(within(waveclear).getByRole('radio', { name: /^3/ })).toHaveAttribute('aria-checked', 'true');
    expect(useStore.getState().profiles[axe.id]).toBeUndefined();
  });

  test('power curve and damage type are editable', () => {
    render(<RatingsScreen />);
    fireEvent.click(within(tagRow('Mid game')).getByRole('radio', { name: /^2/ }));
    expect(useStore.getState().profiles[axe.id].power.mid).toBe(2);
    fireEvent.change(screen.getByLabelText('Damage type'), { target: { value: 'magical' } });
    expect(useStore.getState().profiles[axe.id].damageType).toBe('magical');
  });

  test('hero list shows how many tags are rated, and Next moves to the next hero', () => {
    render(<RatingsScreen />);
    fireEvent.click(within(tagRow('Initiation')).getByRole('radio', { name: /^3/ }));
    expect(screen.getByRole('button', { name: /Axe/ })).toHaveTextContent('1/27 rated');
    fireEvent.click(screen.getByRole('button', { name: /next hero/i }));
    expect(screen.getByRole('heading', { level: 3, name: 'Pudge' })).toBeInTheDocument();
  });
});
