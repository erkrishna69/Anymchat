export function validateCoordinates(body: any): { valid: boolean; error?: string } {
  if (!body) return { valid: false, error: 'Location coordinates required' };

  const lat = parseFloat(body.latitude);
  const lon = parseFloat(body.longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, error: 'Latitude and Longitude must be valid numbers' };
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }

  if (lon < -180 || lon > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }

  if (body.radiusKm !== undefined) {
    const radius = parseFloat(body.radiusKm);
    if (isNaN(radius) || radius <= 0 || radius > 50) {
      return { valid: false, error: 'Radius must be between 0.1 and 50 KM' };
    }
  }

  return { valid: true };
}
