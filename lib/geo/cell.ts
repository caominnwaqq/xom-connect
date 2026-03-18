export type CellIdOptions = {
  /**
   * Degrees per cell. Recommended defaults:
   * - 0.01  ~ 1.1km (latitude)
   * - 0.02  ~ 2.2km (latitude)
   */
  cellSizeDeg?: number;
};

function normalizeLng(lng: number) {
  // Normalize longitude to [-180, 180)
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

export function getCellId(lat: number, lng: number, options: CellIdOptions = {}) {
  const cellSizeDeg = options.cellSizeDeg ?? 0.01;

  const normLng = normalizeLng(lng);
  const latIndex = Math.floor((lat + 90) / cellSizeDeg);
  const lngIndex = Math.floor((normLng + 180) / cellSizeDeg);

  return `g:${cellSizeDeg}:${latIndex}:${lngIndex}`;
}

export function parseCellId(cellId: string) {
  const parts = cellId.split(":");
  if (parts.length !== 4 || parts[0] !== "g") return null;

  const cellSizeDeg = Number(parts[1]);
  const latIndex = Number(parts[2]);
  const lngIndex = Number(parts[3]);

  if (!Number.isFinite(cellSizeDeg) || cellSizeDeg <= 0) return null;
  if (!Number.isFinite(latIndex) || !Number.isInteger(latIndex)) return null;
  if (!Number.isFinite(lngIndex) || !Number.isInteger(lngIndex)) return null;

  return { cellSizeDeg, latIndex, lngIndex };
}

export function getCellCenterFromId(cellId: string) {
  const parsed = parseCellId(cellId);
  if (!parsed) return null;

  const { cellSizeDeg, latIndex, lngIndex } = parsed;
  const lat = latIndex * cellSizeDeg - 90 + cellSizeDeg / 2;
  const lng = lngIndex * cellSizeDeg - 180 + cellSizeDeg / 2;

  return { lat, lng, cellSizeDeg };
}

