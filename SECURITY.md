# Security status

AUSFIG X Web 0.1 is a preliminary implementation of a supplied concept. No independent protocol review, penetration test, MASVS assessment or real-device certification has been performed. Do not interpret passing unit tests as a security audit.

## Covered properties

- No common embedded master key, no third-party runtime CDN, no analytics.
- X25519 sessions are trusted only after manual full fingerprint comparison.
- ChaCha20-Poly1305 binds message prefix, direction, session, dictionary and counter.
- Separate chains per direction, replay rejection, bounded skipped-key cache.
- Authenticated encrypted local state, compare-and-swap transaction before exposing results.
- No saved plaintext history; background and inactivity locking.
- Strict text insertion for contact names and messages; restrictive CSP; QR results are treated as text rather than URLs or commands.

## Out of scope and limitations

- Device/OS/browser compromise, malicious extensions, screenshots and clipboard readers.
- A malicious hosting update, compromised GitHub account or dependency supply chain. The hosting origin serves executable code and must be trusted. Public source alone does not prove deployed integrity.
- Guaranteed deletion from RAM, disk, swap, backups or browser caches.
- Hardware-protected keys, biometric authentication, signed native binaries.
- Post-compromise recovery without a new verified pairing.
- Browser/OS backup rollback, storage eviction and loss of passwords. Never clone or restore active browser storage.
- Metadata hiding, traffic analysis, automatic delivery, global revocation and remote wipe.
- Password strength beyond a minimum length. Use a strong unique passphrase.

Browser persistence and service-worker lifecycle differ by platform. Offline resources require a successful initial HTTPS load and remain available only while the browser retains the cache. The initial load and updates may be logged by the host. Local session data is isolated by browser profile and origin; it is not synchronized between devices.

## Verification before production use

Review protocol and state transition code independently, test full two-device flows on Android Chrome, iOS Safari, desktop browsers, storage quota and crash recovery, rapid multi-tab operations, counter exhaustion, malformed/oversized QR inputs, device restore, offline reload and application updates. Review every dependency/license and generated bundle before publishing. Native hardware protection and screenshot control require a separate native application.

## Reporting

Report suspected vulnerabilities privately to the repository owner using a contact channel they explicitly provide. Do not put real keys, messages, passwords or browser vaults in public issues. A private reporting channel has not been configured by this project.
