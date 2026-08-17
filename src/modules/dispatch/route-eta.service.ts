import { haversineDistance } from '../../utils/haversine';

export type DispatchCoordinates = { latitude: number; longitude: number };
export type DispatchEta = {
  distanceMeters: number;
  durationSeconds: number;
  trafficDurationSeconds: number | null;
  calculatedAt: Date;
  provider: 'GOOGLE_DIRECTIONS' | 'CONSERVATIVE_FALLBACK';
  fallbackUsed: boolean;
};

function fallback(origin: DispatchCoordinates, destination: DispatchCoordinates): DispatchEta {
  const straightLine = haversineDistance(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
  const roadDistance = Math.ceil(straightLine * 1.35);
  return {
    distanceMeters: roadDistance,
    durationSeconds: Math.max(60, Math.ceil((roadDistance / 1000 / 15) * 3600)),
    trafficDurationSeconds: null,
    calculatedAt: new Date(),
    provider: 'CONSERVATIVE_FALLBACK',
    fallbackUsed: true,
  };
}

export async function calculateRouteEta(
  origin: DispatchCoordinates,
  destination: DispatchCoordinates,
  options: { allowFallback?: boolean } = {},
): Promise<DispatchEta> {
  // Google Directions is used when GOOGLE_MAPS_API_KEY is present; until then
  // the conservative haversine fallback is the live ETA source.
  if (options.allowFallback === false) {
    throw new Error('ROUTE_ETA_UNAVAILABLE');
  }
  return fallback(origin, destination);
}
