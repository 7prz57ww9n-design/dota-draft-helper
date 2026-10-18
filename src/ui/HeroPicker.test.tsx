import { fireEvent, render, screen } from '@testing-library/react';
import { HEROES } from '../data/heroes';
import HeroPicker from './HeroPicker';

const pudge = HEROES.find((h) => h.localizedName === 'Pudge')!;

describe('HeroPicker', () => {
  test('typing "pud" then Enter selects Pudge and clears input', () => {
    const onSelect = vi.fn();
    render(<HeroPicker onSelect={onSelect} />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'pud' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(pudge.id);
    expect(input.value).toBe('');
  });

  test('arrow keys move highlight; Escape clears', () => {
    const onSelect = vi.fn();
    render(<HeroPicker onSelect={onSelect} />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'pu' } });
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(1);
    expect(options[0].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getAllByRole('option')[0].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(Number(options[1].getAttribute('data-hero-id')));
    fireEvent.change(input, { target: { value: 'pud' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  test('excluded heroes are not offered', () => {
    render(<HeroPicker onSelect={() => {}} exclude={[pudge.id]} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pudge' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});
