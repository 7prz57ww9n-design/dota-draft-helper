import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { initialState, useStore } from '../store/store';
import { FakeBackend } from '../sync/fakeBackend';
import { leaveTeam, setTeamBackendFactory, useTeamStore } from '../sync/teamConnection';
import DataScreen from './DataScreen';

let backend: FakeBackend;

beforeEach(() => {
  backend = new FakeBackend();
  setTeamBackendFactory(() => backend);
  leaveTeam();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  useStore.setState({
    ...initialState,
    players: [{ id: 'pos-1', name: 'Ann', position: 1, pool: [{ heroId: 2, comfort: 3 }] }],
  });
});

describe('Team sync card', () => {
  test('creating a team uploads local data, shows the link and puts it in the address bar', async () => {
    render(<DataScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Create team from my data' }));
    await waitFor(() => expect(screen.getByText('All changes saved to the team')).toBeInTheDocument());
    const code = useTeamStore.getState().teamId!;
    expect(code).toMatch(/^[A-Za-z0-9]{24}$/);
    expect((screen.getByLabelText('Team link') as HTMLInputElement).value).toContain(`?team=${code}`);
    expect(window.location.search).toBe(`?team=${code}`);
    expect(backend.docs.get(code)!.get('pos-1')).toMatchObject({ player: { name: 'Ann' } });
    expect((screen.getByRole('button', { name: 'Reset all data' }) as HTMLButtonElement).disabled).toBe(true);
  });

  test('joining replaces local data with the team; leaving keeps the local copy', async () => {
    const code = 'Abcdefghijklmnopqrstuvwx';
    await backend.write(code, 'pos-4', { player: { name: 'Bo', pool: [] }, profiles: {}, updatedAt: 1 });
    render(<DataScreen />);
    fireEvent.change(screen.getByLabelText('Team link or code'), { target: { value: `https://x.io/app/?team=${code}` } });
    fireEvent.click(screen.getByRole('button', { name: 'Join team' }));
    await waitFor(() => expect(useStore.getState().players.map((p) => p.name)).toEqual(['Bo']));

    fireEvent.click(screen.getByRole('button', { name: 'Leave team' }));
    expect(useTeamStore.getState().teamId).toBeNull();
    expect(window.location.search).toBe('');
    expect(useStore.getState().players.map((p) => p.name)).toEqual(['Bo']);
  });

  test('an invalid code is rejected before connecting', () => {
    render(<DataScreen />);
    fireEvent.change(screen.getByLabelText('Team link or code'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join team' }));
    expect(screen.getByRole('alert')).toHaveTextContent('doesn\'t look like a team link');
    expect(useTeamStore.getState().teamId).toBeNull();
  });
});
