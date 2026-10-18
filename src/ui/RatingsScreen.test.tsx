import { fireEvent, render, screen, within } from '@testing-library/react';
import { HEROES } from '../data/heroes';
import { defaultProfile } from '../data/ratingDefaults';
import { TAG_DEFINITIONS, TAG_LABELS } from '../domain/tags';
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

  test('hero list shows tag count and edited state, and Next moves to the next hero', () => {
    render(<RatingsScreen />);
    const before = Object.keys(defaultProfile(axe.id).ratings).length;
    expect(screen.getByRole('button', { name: /Axe/ })).toHaveTextContent(`${before}/21 tags`);
    expect(screen.getByRole('button', { name: /Axe/ })).not.toHaveTextContent('edited');
    fireEvent.click(within(tagRow('Waveclear')).getByRole('radio', { name: /^3/ }));
    expect(screen.getByRole('button', { name: /Axe/ })).toHaveTextContent('edited');
    fireEvent.click(screen.getByRole('button', { name: /next hero/i }));
    expect(screen.getByRole('heading', { level: 3, name: 'Pudge' })).toBeInTheDocument();
  });

  test('rows start from the hero defaults, marked default until edited, and reset restores them', () => {
    render(<RatingsScreen />);
    const [key, value] = Object.entries(defaultProfile(axe.id).ratings)[0];
    const label = TAG_LABELS[key as keyof typeof TAG_LABELS];
    const row = () => tagRow(label);
    expect(within(row()).getByRole('radio', { name: new RegExp('^' + value) })).toHaveAttribute('aria-checked', 'true');
    expect(row().closest('.rating-row')).toHaveTextContent('default');
    fireEvent.click(within(row()).getByRole('radio', { name: /^0/ }));
    expect(useStore.getState().profiles[axe.id].ratings[key as keyof typeof TAG_LABELS]).toBe(0);
    expect(row().closest('.rating-row')).toHaveTextContent('edited');
    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(useStore.getState().profiles[axe.id]).toBeUndefined();
    expect(within(row()).getByRole('radio', { name: new RegExp('^' + value) })).toHaveAttribute('aria-checked', 'true');
  });
});
