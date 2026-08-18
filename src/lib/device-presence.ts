export const DEVICE_HEARTBEAT_INTERVAL_SECONDS = 30;
export const DEVICE_ONLINE_WINDOW_SECONDS = 120;

export function isDeviceOnline(lastSeenAt: string | null | undefined, now = Date.now()) {
  if (!lastSeenAt) return false;
  const lastSeen = Date.parse(lastSeenAt);
  return Number.isFinite(lastSeen) && now - lastSeen <= DEVICE_ONLINE_WINDOW_SECONDS * 1000;
}
