import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import App from '../App';

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('renders the app title', () => {
    renderApp();
    expect(screen.getByText('PV Layout Planer')).toBeInTheDocument();
  });

  it('renders panel count and power stats', () => {
    renderApp();
    expect(screen.getByTestId('total-panels')).toBeInTheDocument();
    expect(screen.getByTestId('total-power')).toBeInTheDocument();
  });

  it('renders canvas area', () => {
    renderApp();
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('updates panel orientation when button is clicked', async () => {
    const user = userEvent.setup();
    renderApp();
    const orientationButton = screen.getByRole('button', { name: /switch to landscape/i });
    await user.click(orientationButton);
    expect(screen.getByRole('button', { name: /switch to portrait/i })).toBeInTheDocument();
  });

  it('renders preset dropdown with options', () => {
    renderApp();
    const select = screen.getByRole('combobox', { name: /panel preset/i });
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Standard Modul (ca. 400W)')).toBeInTheDocument();
  });

  it('updates roof width input', async () => {
    const user = userEvent.setup();
    renderApp();
    const widthInput = screen.getByRole('spinbutton', { name: /roof width/i });
    await user.clear(widthInput);
    await user.type(widthInput, '600');
    expect(widthInput).toHaveValue(600);
  });

  it('renders About link in header', () => {
    renderApp();
    expect(screen.getByRole('link', { name: /about this app/i })).toBeInTheDocument();
  });

  it('renders GitHub repo link in header', () => {
    renderApp();
    expect(screen.getByRole('link', { name: /open github repository/i })).toBeInTheDocument();
  });
});
