import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('Free placement mode', () => {
  it('renders mode toggle button', () => {
    renderApp();
    expect(screen.getByTestId('mode-toggle')).toBeInTheDocument();
  });

  it('switches to free mode when Frei button is clicked', async () => {
    const user = userEvent.setup();
    renderApp();
    const freeBtn = screen.getByRole('button', { name: /switch to free placement mode/i });
    await user.click(freeBtn);
    expect(screen.getByTestId('tool-draw-zone')).toBeInTheDocument();
  });

  it('places a free panel on canvas click in free mode', async () => {
    const user = userEvent.setup();
    renderApp();
    const freeBtn = screen.getByRole('button', { name: /switch to free placement mode/i });
    await user.click(freeBtn);

    const canvas = screen.getByTestId('canvas');
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 });

    expect(screen.getAllByTestId('free-panel').length).toBeGreaterThan(0);
  });

  it('deletes selected panel via delete button', async () => {
    const user = userEvent.setup();
    renderApp();
    const freeBtn = screen.getByRole('button', { name: /switch to free placement mode/i });
    await user.click(freeBtn);

    const canvas = screen.getByTestId('canvas');
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 });
    expect(screen.getAllByTestId('free-panel').length).toBe(1);

    const deleteBtn = screen.getByTestId('selected-panel-delete');
    await user.click(deleteBtn);
    expect(screen.queryAllByTestId('free-panel').length).toBe(0);
  });

  it('shows draw zone tool button in free mode', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /switch to free placement mode/i }));
    expect(screen.getByTestId('tool-draw-zone')).toBeInTheDocument();
  });

  it('stats bar shows free panel count in free mode', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /switch to free placement mode/i }));

    const canvas = screen.getByTestId('canvas');
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerDown(canvas, { clientX: 200, clientY: 200, pointerId: 2 });

    const totalPanels = screen.getByTestId('total-panels');
    expect(Number(totalPanels.textContent)).toBe(2);
  });

  it('pointercancel during zone draw discards zone and resets activeTool to select', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /switch to free placement mode/i }));

    // Activate draw-zone tool via FAB
    await user.click(screen.getByTestId('tool-draw-zone'));

    const canvas = screen.getByTestId('canvas');
    // Start drawing a zone
    fireEvent.pointerDown(canvas, { clientX: 50, clientY: 50, pointerId: 1 });
    // Browser takes over (e.g. scroll gesture) — cancel the pointer
    fireEvent.pointerCancel(canvas, { pointerId: 1 });

    // In-progress zone must be discarded
    expect(screen.queryAllByTestId('exclusion-zone').length).toBe(0);
    // activeTool resets to select: next canvas tap places a panel (not a zone)
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 2 });
    expect(screen.getAllByTestId('free-panel').length).toBeGreaterThan(0);
  });

  it('ignores a second pointer while dragging a panel', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /switch to free placement mode/i }));

    const canvas = screen.getByTestId('canvas');
    // Place one panel
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 });
    expect(screen.getAllByTestId('free-panel').length).toBe(1);

    // Start dragging that panel (sets dragRef.current)
    const panel = screen.getAllByTestId('free-panel')[0];
    fireEvent.pointerDown(panel, { clientX: 100, clientY: 100, pointerId: 1 });

    // Second pointer while dragging — should be ignored (no new panel added)
    fireEvent.pointerDown(panel, { clientX: 150, clientY: 150, pointerId: 2 });
    expect(screen.getAllByTestId('free-panel').length).toBe(1);
  });

  it('shows selection HUD with X/Y/W/H inputs when a panel is selected', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /switch to free placement mode/i }));

    const canvas = screen.getByTestId('canvas');
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 });

    expect(screen.getByTestId('selection-hud')).toBeInTheDocument();
    expect(screen.getByTestId('hud-x')).toBeInTheDocument();
    expect(screen.getByTestId('hud-y')).toBeInTheDocument();
    expect(screen.getByTestId('hud-width')).toBeInTheDocument();
    expect(screen.getByTestId('hud-height')).toBeInTheDocument();
  });

  it('HUD hides when no item is selected', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /switch to free placement mode/i }));

    expect(screen.queryByTestId('selection-hud')).not.toBeInTheDocument();
  });

  it('sidebar shows X/Y inputs for selected panel', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /switch to free placement mode/i }));

    const canvas = screen.getByTestId('canvas');
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 });

    expect(screen.getByTestId('selected-panel-x')).toBeInTheDocument();
    expect(screen.getByTestId('selected-panel-y')).toBeInTheDocument();
  });

  it('sidebar shows X/Y/W/H inputs for selected exclusion zone', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /switch to free placement mode/i }));

    // Draw a zone
    await user.click(screen.getByTestId('tool-draw-zone'));
    const canvas = screen.getByTestId('canvas');

    // Mock getBoundingClientRect so coordinates are not clamped to zero in JSDOM
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      top: 0, left: 0, width: 800, height: 600, right: 800, bottom: 600,
      x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);

    fireEvent.pointerDown(canvas, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    // Zone should be created and auto-selected
    expect(screen.getAllByTestId('exclusion-zone').length).toBeGreaterThan(0);
    expect(screen.getByTestId('selected-zone-x')).toBeInTheDocument();
    expect(screen.getByTestId('selected-zone-y')).toBeInTheDocument();
    expect(screen.getByTestId('selected-zone-width')).toBeInTheDocument();
    expect(screen.getByTestId('selected-zone-height')).toBeInTheDocument();
  });

  it('exclusion zone can be moved by dragging (zone-move)', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /switch to free placement mode/i }));

    // Draw a zone
    await user.click(screen.getByTestId('tool-draw-zone'));
    const canvas = screen.getByTestId('canvas');

    // Mock getBoundingClientRect so coordinates are not clamped to zero in JSDOM
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      top: 0, left: 0, width: 800, height: 600, right: 800, bottom: 600,
      x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);

    fireEvent.pointerDown(canvas, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    expect(screen.getAllByTestId('exclusion-zone').length).toBe(1);

    // Get initial X position from HUD
    const hudX = screen.getByTestId('hud-x') as HTMLInputElement;
    const initialX = Number(hudX.value);

    // Drag the zone to a new position
    const zone = screen.getByTestId('exclusion-zone');
    fireEvent.pointerDown(zone, { clientX: 125, clientY: 125, pointerId: 2 });
    fireEvent.pointerMove(canvas, { clientX: 175, clientY: 125, pointerId: 2 });
    fireEvent.pointerUp(canvas, { pointerId: 2 });

    // Zone X should have changed (moved right)
    expect(Number((screen.getByTestId('hud-x') as HTMLInputElement).value)).toBeGreaterThan(initialX);
  });
});
