const EARTH_RADIUS_METERS = 6_371_000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusMeters: number,
): boolean {
  return haversineDistance(lat1, lng1, lat2, lng2) <= radiusMeters;
}

export interface HubLocation {
  id: number;
  name: string;
  cityId: number;
  latitude: string | number;
  longitude: string | number;
  serviceRadiusMeters: number;
}

export function pickServiceableHub(latitude: number, longitude: number, hubs: HubLocation[]) {
  return hubs
    .map((hub) => ({
      ...hub,
      distance: haversineDistance(latitude, longitude, Number(hub.latitude), Number(hub.longitude)),
    }))
    .filter((hub) => Number.isFinite(hub.distance) && hub.distance <= hub.serviceRadiusMeters)
    .sort((a, b) => a.distance - b.distance || a.id - b.id)[0] ?? null;
}

export function missingServiceIdsAtLocation(
  latitude: number,
  longitude: number,
  hubs: Array<HubLocation & { offeredServiceIds: number[] }>,
  serviceIds: number[],
): number[] {
  return serviceIds.filter((serviceId) => {
    const offering = hubs.filter((hub) => hub.offeredServiceIds.includes(serviceId));
    return !pickServiceableHub(latitude, longitude, offering);
  });
}
