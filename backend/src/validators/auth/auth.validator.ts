export function validateAliasUpdate(body: any): { valid: boolean; error?: string } {
  if (!body) return { valid: false, error: 'Request body is required' };
  if (body.alias !== undefined) {
    if (typeof body.alias !== 'string') return { valid: false, error: 'Alias must be a string' };
    if (body.alias.trim().length > 25) return { valid: false, error: 'Alias cannot exceed 25 characters' };
  }
  return { valid: true };
}

export function validateSignup(body: any): { valid: boolean; error?: string } {
  if (!body) return { valid: false, error: 'Request body is required' };
  const { email, password } = body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { valid: false, error: 'A valid email address is required' };
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long' };
  }

  return { valid: true };
}

export function validateLogin(body: any): { valid: boolean; error?: string } {
  if (!body) return { valid: false, error: 'Request body is required' };
  const { email, password } = body;

  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  return { valid: true };
}
