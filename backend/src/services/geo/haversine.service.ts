import { calculateDistanceKm, isWithinRadius } from '../../utils/geo/geoMath.util';
import { DISTANCE_CONSTANTS } from '../../constants/distance/distance.constants';

export class HaversineService {
  public static getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return calculateDistanceKm(lat1, lon1, lat2, lon2);
  }

  public static isNearby(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    radiusKm: number = DISTANCE_CONSTANTS.DEFAULT_RADIUS_KM
  ): boolean {
    return isWithinRadius(lat1, lon1, lat2, lon2, radiusKm);
  }
}
