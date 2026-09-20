export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface PublicProximityInfo {
  isNearby: boolean;
  statusText: 'Nearby (< 10km)' | 'Nearby';
}
