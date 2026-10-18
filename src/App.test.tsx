import { render, screen } from '@testing-library/react';
import App from './App';
import { initialState, useStore } from './store/store';

describe('App default tab', () => {
  test('Team when there is no draft in progress', () => {
    useStore.setState({ ...initialState });
    render(<App />);
    expect(screen.getByRole('tab', { name: 'Team' }).getAttribute('aria-selected')).toBe('true');
  });

  test('Draft when a persisted draft has actions', () => {
    useStore.setState({
      ...initialState,
      draft: {
        ...initialState.draft,
        actions: [{ side: 'enemy', kind: 'ban', heroId: 9 }],
      },
    });
    render(<App />);
    expect(screen.getByRole('tab', { name: 'Draft' }).getAttribute('aria-selected')).toBe('true');
  });
});
