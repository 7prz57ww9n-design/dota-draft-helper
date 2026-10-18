import { fireEvent, render, screen, within } from '@testing-library/react';
import { initialState, useStore } from '../store/store';
import TeamScreen from './TeamScreen';

const AXE = 2;      // Axe
const LION = 26;    // Lion
const PUDGE = 14;   // Pudge
const ABADDON = 102; // Abaddon

beforeEach(() =>
  useStore.setState({
    ...initialState,
    players: [{
      id: 'pos-4', name: 'Sasha', position: 4,
      pool: [
        { heroId: AXE, comfort: 1 },
        { heroId: PUDGE, comfort: 3 },
        { heroId: LION, comfort: 2 },
        { heroId: ABADDON, comfort: 3 },
      ],
    }],
  }),
);

const poolOrder = () =>
  within(screen.getByRole('region', { name: 'Position 4' }))
    .getAllByRole('listitem')
    .map((li) => li.querySelector('span')!.textContent);

describe('TeamScreen pool order', () => {
  test('shows each pool best → good → okay, alphabetical within a comfort level', () => {
    render(<TeamScreen />);
    expect(poolOrder()).toEqual(['Abaddon', 'Pudge', 'Lion', 'Axe']);
  });

  test('re-sorts when comfort changes', () => {
    render(<TeamScreen />);
    fireEvent.change(screen.getByLabelText('Comfort Axe position 4'), { target: { value: '3' } });
    expect(poolOrder()).toEqual(['Abaddon', 'Axe', 'Pudge', 'Lion']);
  });
});
