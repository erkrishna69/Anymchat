import { DISTANCE_CONSTANTS } from '../../constants/distance/distance.constants';

/**
 * Calculates Great-Circle distance between two coordinates in Kilometers using Haversine formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = DISTANCE_CONSTANTS.EARTH_RADIUS_KM;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Checks if distance is within maximum allowed radius (default: 10 km)
 */
export function isWithinRadius(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radiusKm: number = DISTANCE_CONSTANTS.DEFAULT_RADIUS_KM
): boolean {
  const distance = calculateDistanceKm(lat1, lon1, lat2, lon2);
  return distance <= radiusKm;
}
