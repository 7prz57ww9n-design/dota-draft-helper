import { render, screen, within } from '@testing-library/react';
import { HEROES } from '../data/heroes';
import { initialState, useStore } from '../store/store';
import HeroesScreen from './HeroesScreen';

const PUDGE = 14;
const LION = 26;
const AXE = 2;

beforeEach(() => useStore.setState({ ...initialState }));

describe('HeroesScreen', () => {
  test('groups every hero under its primary attribute like the in-game grid', () => {
    render(<HeroesScreen />);
    const groups = ['Strength', 'Agility', 'Intelligence', 'Universal'].map((name) =>
      screen.getByRole('region', { name }),
    );
    const total = groups.reduce((n, g) => n + within(g).getAllByRole('listitem').length, 0);
    expect(total).toBe(HEROES.length);
    expect(within(groups[0]).getByTitle(/^Pudge/)).toBeInTheDocument();
  });

  test('marks heroes picked or banned in the current draft and heroes in our pools', () => {
    useStore.setState({
      ...initialState,
      players: [{ id: 'pos-5', name: 'Sasha', position: 5, pool: [{ heroId: LION, comfort: 3 }] }],
      draft: {
        ...initialState.draft,
        actions: [
          { side: 'us', kind: 'ban', heroId: PUDGE },
          { side: 'enemy', kind: 'pick', heroId: AXE },
        ],
      },
    });
    render(<HeroesScreen />);
    expect(screen.getByTitle(/^Pudge/)).toHaveAttribute('title', 'Pudge — banned');
    expect(screen.getByTitle(/^Axe/)).toHaveAttribute('title', 'Axe — picked by enemy');
    expect(screen.getByTitle(/^Lion/)).toHaveAttribute('title', 'Lion — in pool: Pos 5');
    expect(within(screen.getByTitle(/^Lion/)).getByText('5')).toBeInTheDocument();
  });
});
