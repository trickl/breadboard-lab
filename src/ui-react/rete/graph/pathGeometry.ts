export function parsePathEndpoints(
  path: string
): { start: { x: number; y: number }; end: { x: number; y: number } } | null {
  // This is a pragmatic parser for typical SVG path strings Rete emits.
  // We only need the start (M x y) and the final coordinate pair.
  const startMatch = /^\s*M\s*([-0-9.]+)[,\s]+([-0-9.]+)/i.exec(path);
  if (!startMatch) return null;
  const startX = Number(startMatch[1]);
  const startY = Number(startMatch[2]);
  if (!Number.isFinite(startX) || !Number.isFinite(startY)) return null;

  // Grab the last two numbers in the string as end x/y.
  // (Works for C/Q/L style paths where the final segment ends in the endpoint.)
  const nums = path.match(/[-0-9.]+/g);
  if (!nums || nums.length < 4) return null;
  const endX = Number(nums[nums.length - 2]);
  const endY = Number(nums[nums.length - 1]);
  if (!Number.isFinite(endX) || !Number.isFinite(endY)) return null;

  return { start: { x: startX, y: startY }, end: { x: endX, y: endY } };
}
