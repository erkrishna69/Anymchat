export interface ModerationResult {
  isAllowed: boolean;
  hasPii: boolean;
  piiType?: string;
  reason?: string;
  matchedPattern?: string;
}

export interface PiiDetectionResult {
  hasPii: boolean;
  type?: string;
  matched?: string;
  reason?: string;
}


export interface HandleGenOptions {
  seed?: string;
  avatarId?: number;
}
