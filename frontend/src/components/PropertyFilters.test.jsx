import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PropertyFilters from './PropertyFilters';

describe('PropertyFilters', () => {
  it('renders all six filter inputs plus Search and Clear buttons', () => {
    render(<PropertyFilters onSearch={vi.fn()} onClear={vi.fn()} />);

    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/min price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/beds/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/baths/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('calls onSearch with the current filter values when the form is submitted', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<PropertyFilters onSearch={onSearch} onClear={vi.fn()} />);

    await user.type(screen.getByLabelText(/city/i), 'Portland');
    await user.type(screen.getByLabelText(/min price/i), '300000');
    await user.selectOptions(screen.getByLabelText(/beds/i), '3');
    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        city: 'Portland',
        minPrice: '300000',
        beds: '3',
      })
    );
  });

  it('clears all inputs and calls onClear when Clear is clicked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<PropertyFilters onSearch={vi.fn()} onClear={onClear} />);

    const cityInput = screen.getByLabelText(/city/i);
    const minPriceInput = screen.getByLabelText(/min price/i);

    await user.type(cityInput, 'Portland');
    await user.type(minPriceInput, '500000');
    expect(cityInput).toHaveValue('Portland');
    expect(minPriceInput).toHaveValue(500000);

    await user.click(screen.getByRole('button', { name: /clear/i }));

    expect(cityInput).toHaveValue('');
    expect(minPriceInput).toHaveValue(null);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
