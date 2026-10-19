/** Human-readable age, e.g. 3725n -> "1 h 2 min". */
export function formatAge(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s < 0) return "unknown";
  if (s < 60) return `${s} s`;
  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} days`;
}
/** Whether a reference price is fresh enough to use, mirroring ShieldChronicleOracle. */
export function isFresh(age, maxAge) {
  return age !== null && maxAge !== null && age >= 0n && age <= maxAge;
}
