import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { encryptQuick, decryptQuick, normalizeQuickCode } from '../quick-crypto.js';

if (!globalThis.crypto?.subtle) globalThis.crypto = webcrypto;
const strong = 'correct-horse-rocket-forest-2026';

test('quick encryption round trip with Unicode text', async () => {
  const text = 'Привет, AUSFIG X! 🔒';
  const code = await encryptQuick(text, strong);
  assert.match(code, /^Q1:[A-Za-z0-9_-]+$/);
  assert.equal(await decryptQuick(code, strong), text);
});

test('quick encryption allows any nonempty password without a mandatory length', async () => {
  for (const password of ['a', 'a'.repeat(32), '12345678901234567890']) {
    const code = await encryptQuick('test', password);
    assert.equal(await decryptQuick(code, password), 'test');
  }
  await assert.rejects(encryptQuick('test', ''), /Введите пароль/);
});

test('legacy Q1 codes with short passwords remain decryptable', async () => {
  const salt = new Uint8Array(16).fill(7);
  const iv = new Uint8Array(12).fill(9);
  const source = new TextEncoder();
  const pass = 'old';
  const raw = await crypto.subtle.importKey('raw', source.encode(pass), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 310000 },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const cipher = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: source.encode('AUSFIG-X/quick/password-v1') },
    key,
    source.encode('Старый код')
  ));
  const payload = new Uint8Array(28 + cipher.length);
  payload.set(salt);
  payload.set(iv, 16);
  payload.set(cipher, 28);
  assert.equal(await decryptQuick('Q1:' + Buffer.from(payload).toString('base64url'), pass), 'Старый код');
});

test('tampered ciphertext and incorrect password do not decrypt', async () => {
  const code = await encryptQuick('секрет', strong);
  await assert.rejects(decryptQuick(code, 'another-correct-password-2026'), /Неверный пароль/);
  const payload = Buffer.from(code.slice(3), 'base64url');
  payload[payload.length - 1] ^= 1;
  await assert.rejects(decryptQuick('Q1:' + payload.toString('base64url'), strong), /Неверный пароль/);
});

test('encrypted messages use fresh random salts and nonces', async () => {
  const a = await encryptQuick('same', strong);
  const b = await encryptQuick('same', strong);
  assert.notEqual(a, b);
  assert.notDeepEqual(Buffer.from(a.slice(3), 'base64url').subarray(0, 28),
    Buffer.from(b.slice(3), 'base64url').subarray(0, 28));
});

test('rejects plaintext larger than 4096 UTF-8 bytes', async () => {
  await assert.rejects(encryptQuick('я'.repeat(2049), strong), /4096 байт/);
});

test('normalizes Q1 formatting copied from messages', async () => {
  const code = await encryptQuick('проба', strong);
  assert.equal(normalizeQuickCode('Код: **' + code.slice(0, 3) + ' ' + code.slice(3) + '**'), code);
});
