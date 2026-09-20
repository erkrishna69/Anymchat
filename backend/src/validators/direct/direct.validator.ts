export function validateDirectMessage(body: any): { valid: boolean; error?: string } {
  if (!body) return { valid: false, error: 'Request body required' };

  if (!body.recipientAnonymousId || typeof body.recipientAnonymousId !== 'string') {
    return { valid: false, error: 'Recipient anonymous ID is required' };
  }

  if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
    return { valid: false, error: 'Message content cannot be empty' };
  }

  if (body.content.trim().length > 1000) {
    return { valid: false, error: 'Message content cannot exceed 1000 characters' };
  }

  return { valid: true };
}
