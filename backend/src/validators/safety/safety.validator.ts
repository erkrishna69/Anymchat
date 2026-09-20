export function validateReport(body: any): { valid: boolean; error?: string } {
  if (!body) return { valid: false, error: 'Request body required' };

  if (!body.reportedAnonymousId || typeof body.reportedAnonymousId !== 'string') {
    return { valid: false, error: 'Reported user ID is required' };
  }

  const validReasons = ['spam', 'harassment', 'hate_speech', 'inappropriate', 'other'];
  if (!body.reason || !validReasons.includes(body.reason)) {
    return { valid: false, error: `Reason must be one of: ${validReasons.join(', ')}` };
  }

  return { valid: true };
}

export function validateBlock(body: any): { valid: boolean; error?: string } {
  if (!body) return { valid: false, error: 'Request body required' };

  if (!body.targetAnonymousId || typeof body.targetAnonymousId !== 'string') {
    return { valid: false, error: 'Target user ID to block is required' };
  }

  return { valid: true };
}
