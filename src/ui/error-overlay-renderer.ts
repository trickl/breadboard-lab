import type { CircuitError } from '@/core/types';
import { ErrorType } from '@/core/types';

/**
 * Renders error icons on the breadboard SVG overlay
 */
export class ErrorOverlayRenderer {
  private static readonly HOLE_SPACING = 26; // Same as ComponentRenderer

  /**
   * Render error icons for all detected errors
   */
  renderErrors(errors: CircuitError[], svg: SVGElement): void {
    // Remove existing error overlay if present
    const existingOverlay = svg.querySelector('.error-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    if (errors.length === 0) {
      return;
    }

    // Create error overlay group
    const errorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    errorGroup.classList.add('error-overlay');

    for (const error of errors) {
      if (error.positions.length === 0) continue;

      // Calculate center position from all error positions
      const centerPos = this.calculateCenterPosition(error.positions);
      const x = centerPos.col * ErrorOverlayRenderer.HOLE_SPACING + ErrorOverlayRenderer.HOLE_SPACING / 2;
      const y = centerPos.row * ErrorOverlayRenderer.HOLE_SPACING + ErrorOverlayRenderer.HOLE_SPACING / 2;

      // Create error icon based on type
      const icon = this.createErrorIcon(error, x, y);
      errorGroup.appendChild(icon);
    }

    svg.appendChild(errorGroup);
  }

  /**
   * Calculate center position from a list of positions
   */
  private calculateCenterPosition(positions: { row: number; col: number }[]): { row: number; col: number } {
    const avgRow = positions.reduce((sum, pos) => sum + pos.row, 0) / positions.length;
    const avgCol = positions.reduce((sum, pos) => sum + pos.col, 0) / positions.length;
    return { row: avgRow, col: avgCol };
  }

  /**
   * Create an error icon SVG element
   */
  private createErrorIcon(error: CircuitError, x: number, y: number): SVGGElement {
    const iconGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    iconGroup.classList.add('error-icon');
    iconGroup.dataset.errorType = error.type;
    iconGroup.dataset.severity = error.severity;

    // Store error data for click handler
    iconGroup.setAttribute('data-error-message', error.message);
    iconGroup.setAttribute('data-error-explanation', error.explanation);
    iconGroup.setAttribute('data-error-suggestions', JSON.stringify(error.suggestions));

    // Choose icon based on error type
    let iconColor: string;
    let iconSymbol: string;

    switch (error.type) {
      case ErrorType.SHORT_CIRCUIT:
        iconColor = '#ff3333'; // Red
        iconSymbol = '✕';
        break;
      case ErrorType.FLOATING_NODE:
        iconColor = '#ff9933'; // Orange
        iconSymbol = '?';
        break;
      case ErrorType.REVERSED_LED:
        iconColor = '#ffcc00'; // Yellow
        iconSymbol = '!';
        break;
      case ErrorType.OPEN_CIRCUIT:
        iconColor = '#ffcc00'; // Yellow
        iconSymbol = '⚠';
        break;
      case ErrorType.OVERCURRENT:
        iconColor = '#ff9933'; // Orange
        iconSymbol = '!';
        break;
      default:
        iconColor = '#999999'; // Gray
        iconSymbol = '?';
    }

    // Create background circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x.toString());
    circle.setAttribute('cy', y.toString());
    circle.setAttribute('r', '8');
    circle.setAttribute('fill', iconColor);
    circle.setAttribute('stroke', '#ffffff');
    circle.setAttribute('stroke-width', '2');
    circle.classList.add('error-icon-bg');

    // Create text symbol
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x.toString());
    text.setAttribute('y', y.toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('font-size', '12');
    text.setAttribute('font-weight', 'bold');
    text.classList.add('error-icon-text');
    text.textContent = iconSymbol;

    iconGroup.appendChild(circle);
    iconGroup.appendChild(text);

    // Add hover effect
    iconGroup.style.cursor = 'pointer';
    iconGroup.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';

    // Add hover animation
    iconGroup.addEventListener('mouseenter', () => {
      circle.setAttribute('r', '10');
      iconGroup.style.filter = 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))';
    });

    iconGroup.addEventListener('mouseleave', () => {
      circle.setAttribute('r', '8');
      iconGroup.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
    });

    return iconGroup;
  }
}
