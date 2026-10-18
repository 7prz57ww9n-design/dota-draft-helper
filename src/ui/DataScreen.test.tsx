import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { initialState, useStore } from '../store/store';
import DataScreen from './DataScreen';

beforeEach(() => {
  useStore.setState({ ...initialState, players: [{ id: 'pos-1', name: 'A', position: 1, pool: [] }] });
});

describe('DataScreen', () => {
  test('invalid import shows alert and leaves data untouched', async () => {
    render(<DataScreen />);
    const file = new File(['{"schemaVersion":2}'], 'bad.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Import JSON file'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/schemaVersion/));
    expect(useStore.getState().players).toHaveLength(1);
  });

  test('reset clears data after confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<DataScreen />);
    fireEvent.click(screen.getByText('Reset all data'));
    expect(useStore.getState().players).toHaveLength(0);
    expect(useStore.getState().watchlist).toEqual({});
  });
});
