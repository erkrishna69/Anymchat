export function validatePostMessage(body: any): { valid: boolean; error?: string } {
  if (!body) return { valid: false, error: 'Request body required' };

  if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
    return { valid: false, error: 'Message content cannot be empty' };
  }

  if (body.content.trim().length > 500) {
    return { valid: false, error: 'Message content cannot exceed 500 characters' };
  }

  const lat = parseFloat(body.latitude);
  const lon = parseFloat(body.longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, error: 'Valid latitude and longitude are required to post to local feed' };
  }

  return { valid: true };
}
