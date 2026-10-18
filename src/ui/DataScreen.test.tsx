import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { exportData } from '../store/exportImport';
import { initialState, useStore } from '../store/store';
import DataScreen from './DataScreen';

beforeEach(() => {
  useStore.setState({ ...initialState, players: [{ id: 'pos-1', name: 'A', position: 1, pool: [] }] });
});

describe('DataScreen', () => {
  test('invalid import shows alert and leaves data untouched', async () => {
    render(<DataScreen />);
    const file = new File(['{"schemaVersion":3}'], 'bad.json', { type: 'application/json' });
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

  test('export then reset then import restores the data', async () => {
    useStore.setState({
      players: [{ id: 'pos-1', name: 'A', position: 1, pool: [{ heroId: 14, comfort: 3 }] }],
      profiles: { '14@1': { heroId: 14, ratings: { initiation: 2 }, power: { early: 1, mid: 2, late: 3 }, damageType: 'magical' } },
      synergies: [{ a: 14, b: 1, strength: 2, laneDuo: true }],
      watchlist: { 14: 2 },
    });
    const before = exportData(useStore.getState());
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => { blob = b; return 'blob:x'; });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<DataScreen />);
    fireEvent.click(screen.getByText('Export JSON'));
    expect(click).toHaveBeenCalled();
    const json = await blob!.text();
    useStore.getState().resetAll();
    expect(useStore.getState().players).toHaveLength(0);
    const file = new File([json], 'dota-draft-helper.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Import JSON file'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Imported/));
    expect(exportData(useStore.getState())).toEqual(before);
  });
});
