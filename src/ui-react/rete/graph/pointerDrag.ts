export type Pointer = { x: number; y: number };

export function startPointerDrag(options: {
  pointer: () => Pointer;
  onMove: (dx: number, dy: number) => void;
}) {
  let previous = { ...options.pointer() };

  function move() {
    const current = { ...options.pointer() };
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    previous = current;
    options.onMove(dx, dy);
  }

  function up() {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
  }

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}
