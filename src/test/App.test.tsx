import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText('PV Layout Planer')).toBeInTheDocument();
  });

  it('renders panel count and power stats', () => {
    render(<App />);
    expect(screen.getByTestId('total-panels')).toBeInTheDocument();
    expect(screen.getByTestId('total-power')).toBeInTheDocument();
  });

  it('renders canvas area', () => {
    render(<App />);
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('updates panel orientation when button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    const orientationButton = screen.getByRole('button', { name: /switch to landscape/i });
    await user.click(orientationButton);
    expect(screen.getByRole('button', { name: /switch to portrait/i })).toBeInTheDocument();
  });

  it('renders preset dropdown with options', () => {
    render(<App />);
    const select = screen.getByRole('combobox', { name: /panel preset/i });
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Standard Modul (ca. 400W)')).toBeInTheDocument();
  });

  it('updates roof width input', async () => {
    const user = userEvent.setup();
    render(<App />);
    const widthInput = screen.getByRole('spinbutton', { name: /roof width/i });
    await user.clear(widthInput);
    await user.type(widthInput, '600');
    expect(widthInput).toHaveValue(600);
  });
});
