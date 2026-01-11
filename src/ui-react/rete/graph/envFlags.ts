// Debug/diagnostics switch:
// When enabled, we stop enforcing the single-wire-per-hole constraint and allow multiple
// connections on rail ports. This is useful for isolating whether conflict-deletion is the
// cause of a wiring issue.
export const ALLOW_MULTI_CONNECTIONS_PER_PORT = ['1', 'true', 'yes', 'on'].includes(
  String(import.meta.env.VITE_ALLOW_MULTI_CONNECTIONS_PER_PORT ?? '').toLowerCase()
);

// Render debugging: force very obvious wires + endpoint markers.
export const DEBUG_RENDER_CONNECTIONS = ['1', 'true', 'yes', 'on'].includes(
  String(import.meta.env.VITE_CONNECTION_DEBUG_RENDER ?? '').toLowerCase()
);
