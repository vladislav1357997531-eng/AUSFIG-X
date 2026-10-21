# Verification record

Date: 21 October 2026. Initial web implementation 0.1.

`npm test`: **13 tests passed**.

- RFC 7748 published X25519 shared-secret vector.
- RFC 5869 HKDF-SHA256 published case 1.
- ChaCha20-Poly1305 output compared against independent Node/OpenSSL implementation.
- Two-party handshake, matching fingerprints, independent directional keys.
- Wrong pairing answer and low-order public key rejection.
- Unicode plaintext round trip, reverse direction, different ciphertexts.
- Compact command length, dictionary decoding and meeting time validation.
- Tampering, wrong contact, prefix change and reflection rejection; state preserved.
- Out-of-order receipt and replay rejection.
- Skip bound, counter exhaustion, malformed/oversized input.
- Generated pairing QR decoded through independent QR reader.
- Encrypted vault, wrong-password and authenticated-revision rejection.
- IndexedDB compare-and-swap with fake-indexeddb: stale write abort and persisted send-counter advance. This is not a real-browser crash simulation.

`npm run build`: successful; ready-to-publish output generated in docs/ and dist/.

Static validation: 100 unique HTML element IDs, referenced controls and files present, manifest icons present, no remote script or style dependencies.

**Not verified in this environment:** visual/browser execution, actual phone/PC cross-device use, camera permissions and scanning on real cameras, PWA installation, service worker offline reload, real IndexedDB crash durability and browser-specific behavior. Managed preview infrastructure was unavailable (`sites-previewd` mailbox missing); no substitute browser runtime was used. These limitations are not evidence that the checks passed.

Publication and real-browser QA must be verified separately after the GitHub repository and Pages hosting are available. This verification record is not an independent security audit.
