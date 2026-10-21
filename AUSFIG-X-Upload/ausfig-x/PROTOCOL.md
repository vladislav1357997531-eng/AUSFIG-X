# AUSFIG X Web Protocol 1

This document fixes the wire format of the initial web implementation. It is not an audited standard. All protocol strings are exact ASCII; numeric binary fields are unsigned big-endian. Cryptographic primitives come from pinned @noble packages. Random bytes come from `crypto.getRandomValues`.

## Pairing

A generates a fresh 32-byte X25519 private input and 16 random bytes as operation ID. It sends `AXP1:` followed by unpadded canonical Base64url of UTF-8 JSON:

```json
{"v":1,"kind":"offer","id":"32 lowercase hex chars","pub":"64 lowercase hex chars"}
```

B creates a fresh X25519 key and returns:

```json
{"v":1,"kind":"answer","id":"same operation ID","pub":"B public key hex","offer":"A public key hex"}
```

Both public keys are the raw 32-byte X25519 outputs. A must check the ID and echoed public key. Parsing is bounded to 1,000 characters; low-order/zero shared secrets are rejected by the X25519 library. This is an unauthenticated key exchange until the users compare the **entire** session fingerprint over an independent authenticated channel.

Canonical transcript bytes are UTF-8 of `AUSFIG-X/1|<id>|<A pub hex>|<B pub hex>`. `H = SHA256(transcript)`. The fingerprint is all 32 bytes of H in lowercase hex. Session ID is the first 16 bytes of H, lowercase hex.

Compute `shared = X25519(own private, other public)` and `material = HKDF-SHA256(ikm=shared, salt=H, info=UTF8("AUSFIG-X/1/session"), length=80)`.

| Bytes | Purpose |
| --- | --- |
| 0–31 | A → B initial chain secret |
| 32–63 | B → A initial chain secret |
| 64–71 | A → B nonce prefix |
| 72–79 | B → A nonce prefix |

Counters start at zero in each direction. No long-lived identity key is used: each new contact entry is an independently verified ephemeral session. Each side saves it only after a local fingerprint confirmation. There is no automatic remote key-confirmation message; the users must confirm on both devices. Pending private key material is discarded when the page locks.

## Chain step

For the current 32-byte chain secret `C`:

- `messageKey = HMAC-SHA256(C, UTF8("AUSFIG-X/1/message"))`
- `nextChain = HMAC-SHA256(C, UTF8("AUSFIG-X/1/chain"))`

The raw 32-byte message key encrypts exactly one message. State stores nextChain and increments the counter. Typed byte arrays are wiped where practical; JavaScript strings, copies, garbage collection and device storage prevent guaranteed secure erasure. This is a symmetric ratchet, not Signal Double Ratchet. Future secrecy after current-state compromise requires a fresh authenticated pairing.

## Message format

`prefix + BASE64URL(COUNTER32 || CIPHERTEXT || TAG128)`

Prefixes:

- `M1:` — exactly two compact plaintext bytes.
- `T1:` — 1–4096 bytes of valid UTF-8 plaintext.

Nonce is `direction nonce prefix (8 bytes) || COUNTER32 (4 bytes)`.

AAD is the concatenation of UTF-8 `AUSFIG-X/1|<session ID>|<sender role>|dict1|<prefix>|` with the raw 4-byte counter. Sender role is exactly `A` or `B`; prefix includes its colon. ChaCha20-Poly1305 uses a 32-byte key, 12-byte nonce and 16-byte tag. Contact/session selection is out of band.

No Base64 padding is accepted. Noncanonical Base64url, unknown prefixes, bad lengths, counters outside bounds and invalid UTF-8 are rejected. No Caesar substitution or compression is used. `M1:` length is exactly 33 characters. `T1:` length is `3 + ceil(4*(20+UTF8 length)/3)`.

## Compact dictionary dict1

Two bytes represent `value = (command ID << 11) | minutes` in big-endian order.

| ID | Russian command | Minutes |
| --- | --- | --- |
| 0 | На месте | 0 |
| 1 | Всё в порядке | 0 |
| 2 | Перезвони мне | 0 |
| 3 | Сообщение принято | 0 |
| 4 | Нужна помощь | 0 |
| 5 | Встреча в HH:MM | 0–1439 |

Other IDs and invalid minute values are rejected. A meeting has no date or timezone; users must agree on context.

## Receive state and crash handling

Receive state is evaluated on a temporary copy. Used or expired counters are rejected. At most 100 skipped message keys are retained per contact. A jump plus existing skipped keys cannot exceed 100. Authentication and payload decoding must succeed before saving the new state. On failure, no state is changed.

The app seals the entire new vault and commits it to IndexedDB before displaying either ciphertext or plaintext. A read-write transaction compares the expected revision with the current stored revision. A stale tab aborts and locks; it cannot overwrite the latest counter state. Transactions request strict durability. This reduces but does not eliminate platform/OS storage rollback risks.

A crash after commit may lose a displayed message; it must not reuse the prior state. Maximum counter is `2^32−1`. After using it, sending stops and a new session is required. No session backup or restore is exposed. OS/browser-level backup rollback remains outside the app's guarantees.

## Vault

Version 1 stores an IndexedDB record with version, revision, 16-byte salt, random 12-byte IV, ciphertext and 16-byte AES-GCM tag (all binary values in Base64url). PBKDF2-HMAC-SHA256 derives a non-extractable AES-256-GCM CryptoKey with 600,000 iterations. AAD is UTF-8 `AUSFIG-X/vault/1/<revision>`. Record salt/IV and revision are not confidential. Contact names and all session states are encrypted. The password and CryptoKey are not stored in IndexedDB. PBKDF2 has no browser-independent memory-hardness guarantee.

## References

- RFC 7748: https://www.rfc-editor.org/rfc/rfc7748
- RFC 5869: https://www.rfc-editor.org/rfc/rfc5869
- RFC 8439: https://www.rfc-editor.org/rfc/rfc8439
- Noble ciphers: https://github.com/paulmillr/noble-ciphers
- Noble curves: https://github.com/paulmillr/noble-curves
