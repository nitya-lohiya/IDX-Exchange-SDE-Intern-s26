import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary';

function Boom({ shouldThrow }) {
  if (shouldThrow) throw new Error('kaboom');
  return <p>Recovered content</p>;
}

beforeEach(() => {
  // React logs caught errors to console.error; silence it for clean output.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('shows the recovery UI when a child throws during render', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to listings/i })).toBeInTheDocument();
  });

  it('does not take down the whole tree', () => {
    render(
      <div>
        <p>Sibling survives</p>
        <ErrorBoundary>
          <Boom shouldThrow />
        </ErrorBoundary>
      </div>
    );

    expect(screen.getByText('Sibling survives')).toBeInTheDocument();
  });

  it('retries rendering when Try again is clicked', async () => {
    const user = userEvent.setup();

    // React re-renders a failing subtree an extra time to collect the error
    // stack, so the throw must be driven by a prop rather than by a flag the
    // component mutates itself — otherwise the second pass silently succeeds.
    const { rerender } = render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Whatever made it fail is now fixed; the boundary still shows the error
    // until the user asks to retry.
    rerender(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('Recovered content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
