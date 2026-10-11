// @ts-nocheck
// R157B. Deterministic full-map label placement. Markers never move; only text pills may
// be displaced or skipped when the screen cannot fit them without covering other markers.
export function layoutMapLabels(labels, width, height, scale, measureText, obstacles = []) {
  const s = Math.max(0.5, scale || 1);
  const edge = 8 * s, gap = 4 * s, occupied = obstacles.map(r => ({ ...r }));
  const hits = (a, b) => a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
  const placed = [];
  const queue = labels.map((label, index) => ({ ...label, index }))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.index - b.index);
  for (const item of queue) {
    if (!item.text || !Number.isFinite(item.x) || !Number.isFinite(item.y)) continue;
    const w = Math.max(20 * s, measureText(item.text) + 14 * s), h = 22 * s;
    const above = item.preferred === 'above', vertical = above ? -19 * s : 23 * s;
    const opposite = above ? 23 * s : -19 * s, side = w / 2 + 16 * s;
    const proposals = [
      [0, vertical], [0, opposite],
      [side, 0], [-side, 0],
      [side, vertical], [-side, vertical],
      [side, opposite], [-side, opposite],
      [0, vertical + (above ? -h - 7 * s : h + 7 * s)],
      [0, opposite + (above ? h + 7 * s : -h - 7 * s)]
    ];
    for (const [dx, dy] of proposals) {
      const x = item.x + dx, y = item.y + dy;
      const rect = { left: x - w / 2, right: x + w / 2, top: y - h / 2, bottom: y + h / 2 };
      if (rect.left < edge || rect.right > width - edge || rect.top < edge || rect.bottom > height - edge) continue;
      if (occupied.some(other => hits(rect, other))) continue;
      occupied.push(rect); placed.push({ ...item, x, y, bounds: rect }); break;
    }
    // Full map can get crowded at minimum zoom; icons stay visible if text cannot fit.
  }
  return placed;
}
