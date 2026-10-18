import { fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { initialState, useStore } from '../store/store';
import { PAGE_HELP } from './help';

beforeEach(() => useStore.setState({ ...initialState }));

describe('page help', () => {
  test('every page shows its one-line summary', () => {
    render(<App />);
    for (const tab of ['Heroes', 'Team', 'Ratings', 'Threats', 'Synergy', 'Data', 'Draft'] as const) {
      fireEvent.click(screen.getByRole('tab', { name: tab }));
      expect(screen.getByText(PAGE_HELP[tab].summary)).toBeInTheDocument();
    }
  });

  test('help button opens the current page help and Escape closes it', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Threats' }));
    fireEvent.click(screen.getByRole('button', { name: /how this page works/i }));
    const dialog = screen.getByRole('dialog', { name: /threats/i });
    expect(dialog).toHaveTextContent('Watch column');
    expect(dialog).toHaveTextContent('Illusions → answered by AoE / cleave');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('close button closes the panel', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /how this page works/i }));
    fireEvent.click(screen.getByRole('button', { name: /close help/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
