import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PropertyImageGallery from './PropertyImageGallery';

const THREE_PHOTOS = JSON.stringify([
  'https://cdn.test/1.jpg',
  'https://cdn.test/2.jpg',
  'https://cdn.test/3.jpg',
]);

const mainImage = () => screen.getByRole('button', { name: /open photo in full screen/i })
  .querySelector('img');

describe('PropertyImageGallery', () => {
  it('renders the main image with a thumbnail per photo', () => {
    render(<PropertyImageGallery rawPhotos={THREE_PHOTOS} alt="123 Main St" />);

    expect(mainImage()).toHaveAttribute('src', 'https://cdn.test/1.jpg');
    expect(screen.getAllByRole('button', { name: /show photo/i })).toHaveLength(3);
  });

  it('updates the main image when a thumbnail is clicked', async () => {
    const user = userEvent.setup();
    render(<PropertyImageGallery rawPhotos={THREE_PHOTOS} />);

    await user.click(screen.getByRole('button', { name: /show photo 3/i }));

    expect(mainImage()).toHaveAttribute('src', 'https://cdn.test/3.jpg');
  });

  it('opens a lightbox when the main image is clicked', async () => {
    const user = userEvent.setup();
    render(<PropertyImageGallery rawPhotos={THREE_PHOTOS} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /open photo in full screen/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the lightbox on Escape', async () => {
    const user = userEvent.setup();
    render(<PropertyImageGallery rawPhotos={THREE_PHOTOS} />);

    await user.click(screen.getByRole('button', { name: /open photo in full screen/i }));
    const dialog = screen.getByRole('dialog');

    // The overlay must be focused for the keydown handler to fire at all —
    // that's what tabIndex + the focus effect buy us.
    expect(dialog).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('navigates photos with the left and right arrow keys', async () => {
    const user = userEvent.setup();
    render(<PropertyImageGallery rawPhotos={THREE_PHOTOS} />);

    await user.click(screen.getByRole('button', { name: /open photo in full screen/i }));
    // The main view has its own counter, so scope assertions to the lightbox.
    const lightbox = () => within(screen.getByRole('dialog'));

    await user.keyboard('{ArrowRight}');
    expect(lightbox().getByText('2 / 3')).toBeInTheDocument();

    await user.keyboard('{ArrowLeft}');
    await user.keyboard('{ArrowLeft}');
    expect(lightbox().getByText('3 / 3')).toBeInTheDocument();
  });

  it('navigates photos with the lightbox arrow buttons', async () => {
    const user = userEvent.setup();
    render(<PropertyImageGallery rawPhotos={THREE_PHOTOS} />);

    await user.click(screen.getByRole('button', { name: /open photo in full screen/i }));
    await user.click(screen.getByRole('button', { name: /next photo/i }));

    expect(within(screen.getByRole('dialog')).getByText('2 / 3')).toBeInTheDocument();
  });

  it('closes when the backdrop is clicked but not when the image is', async () => {
    const user = userEvent.setup();
    render(<PropertyImageGallery rawPhotos={THREE_PHOTOS} />);

    await user.click(screen.getByRole('button', { name: /open photo in full screen/i }));
    const dialog = screen.getByRole('dialog');

    // Clicking the photo itself should keep the lightbox open.
    await user.click(dialog.querySelector('.lightbox__image'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Clicking the backdrop closes it.
    await user.click(dialog);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes via the close button', async () => {
    const user = userEvent.setup();
    render(<PropertyImageGallery rawPhotos={THREE_PHOTOS} />);

    await user.click(screen.getByRole('button', { name: /open photo in full screen/i }));
    await user.click(screen.getByRole('button', { name: /close full screen view/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hides the thumbnail strip for a single photo', () => {
    render(<PropertyImageGallery rawPhotos={JSON.stringify(['https://cdn.test/only.jpg'])} />);

    expect(screen.queryByRole('button', { name: /show photo/i })).not.toBeInTheDocument();
    expect(mainImage()).toHaveAttribute('src', 'https://cdn.test/only.jpg');
  });

  it('shows a placeholder when the property has no photos', () => {
    render(<PropertyImageGallery rawPhotos="[]" />);

    expect(screen.getByText(/no photos available/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /open photo in full screen/i })
    ).not.toBeInTheDocument();
  });
});
