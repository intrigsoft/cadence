import { describe, expect, it } from 'vitest';
import { mintArtifact, verifyArtifact } from '../api/artifact';

// Phase 2 / BYOA — the artifact binds an identity to a device sandbox and is
// the only thing that authenticates a machine (agent-as-user) request.

describe('auth artifact (BYOA token)', () => {
  it('round-trips the device + user claims', () => {
    const { artifact } = mintArtifact({ deviceId: 'dev-1', userId: 'u_sarah' });
    expect(verifyArtifact(artifact)).toEqual({ deviceId: 'dev-1', userId: 'u_sarah' });
  });

  it('rejects a tampered payload (signature mismatch)', () => {
    const { artifact } = mintArtifact({ deviceId: 'dev-1', userId: 'u_sarah' });
    const [payload, sig] = artifact.split('.');
    // flip the last char of the payload, keep the old signature
    const flipped = payload.slice(0, -1) + (payload.at(-1) === 'A' ? 'B' : 'A');
    expect(verifyArtifact(`${flipped}.${sig}`)).toBeNull();
  });

  it('rejects an expired artifact', () => {
    const { artifact } = mintArtifact({ deviceId: 'dev-1', userId: 'u_sarah' }, -1000);
    expect(verifyArtifact(artifact)).toBeNull();
  });

  it('rejects junk and empty input', () => {
    expect(verifyArtifact('')).toBeNull();
    expect(verifyArtifact('not-a-token')).toBeNull();
    expect(verifyArtifact(null)).toBeNull();
  });
});
