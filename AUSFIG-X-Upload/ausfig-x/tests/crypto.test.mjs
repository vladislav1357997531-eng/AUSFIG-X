import test from 'node:test';
import assert from 'node:assert/strict';
import {createCipheriv} from 'node:crypto';
import {offer,answer,finish,encrypt,decrypt,compact,MAX_SKIP,b64,unb64,hex,unhex} from '../src/crypto.js';
import {x25519} from '@noble/curves/ed25519.js';
import {chacha20poly1305} from '@noble/ciphers/chacha.js';
import {hkdf} from '@noble/hashes/hkdf.js';
import {sha256} from '@noble/hashes/sha2.js';
function pair(){const a=offer(),b=answer(a.code);return [finish(a,b.code),b.contact];}
test('RFC 7748 X25519 published shared-secret vector',()=>{
 const a=unhex('77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a');
 const b=unhex('de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f');
 assert.equal(hex(x25519.getSharedSecret(a,b)),'4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742');
});
test('RFC 5869 HKDF SHA256 case 1',()=>{
 const out=hkdf(sha256,new Uint8Array(22).fill(0x0b),unhex('000102030405060708090a0b0c'),unhex('f0f1f2f3f4f5f6f7f8f9'),42);
 assert.equal(hex(out),'3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865');
});
test('ChaCha20-Poly1305 agrees with independent OpenSSL implementation',()=>{
 const key=new Uint8Array(32).map((_,i)=>i),nonce=new Uint8Array(12).fill(8),aad=new TextEncoder().encode('AUSFIG-X/test');const text=new TextEncoder().encode('Тест шифрования 🔐');
 const cipher=createCipheriv('chacha20-poly1305',key,nonce,{authTagLength:16});cipher.setAAD(aad,{plaintextLength:text.length});const expected=Buffer.concat([cipher.update(text),cipher.final(),cipher.getAuthTag()]);
 assert.deepEqual(Buffer.from(chacha20poly1305(key,nonce,aad).encrypt(text)),expected);
});
test('two-device handshake agrees on fingerprint and directional keys',()=>{const [a,b]=pair();assert.equal(a.id,b.id);assert.equal(a.fingerprint,b.fingerprint);assert.equal(a.send.chain,b.recv.chain);assert.equal(a.recv.chain,b.send.chain);assert.notEqual(a.send.chain,a.recv.chain);});
test('wrong answer and low order public keys rejected',()=>{
 const a=offer(),b=answer(offer().code);assert.throws(()=>finish(a,b.code));
 const bad={...a.data,pub:'0'.repeat(64)};assert.throws(()=>answer('AXP1:'+b64(new TextEncoder().encode(JSON.stringify(bad)))));
});
test('UTF8 round trip in both directions and unique ciphertexts',()=>{
 let [a,b]=pair();const first=encrypt(a,'Привет 🌍\nТест');a=first.contact;const result=decrypt(b,first.code);b=result.contact;assert.equal(result.text,'Привет 🌍\nТест');
 const again=encrypt(a,'Привет 🌍\nТест');assert.notEqual(first.code,again.code);
 const back=encrypt(b,'Ответ');assert.equal(decrypt(a,back.code).text,'Ответ');
});
test('compact dictionary uses exactly 33 symbols including meeting time',()=>{
 const [a,b]=pair();for(let i=0;i<6;i++){const result=encrypt(a,'',{command:i,time:'23:59'});assert.equal(result.code.length,33);assert.ok(decrypt(b,result.code).text);}
 assert.equal(decrypt(b,encrypt(a,'',{command:5,time:'18:00'}).code).text,'Встреча в 18:00');assert.throws(()=>compact(5,'24:00'));assert.throws(()=>compact(9));
});
test('reject tampering, prefix changes, wrong contact, reflected own ciphertext; state unchanged',()=>{
 const [a,b]=pair(),[c]=pair(),result=encrypt(a,'Текст'),before=JSON.stringify(b);const bytes=unb64(result.code.slice(3));bytes[9]^=1;
 assert.throws(()=>decrypt(b,'T1:'+b64(bytes)));assert.throws(()=>decrypt(b,result.code.replace('T1:','M1:')));assert.throws(()=>decrypt(c,result.code));assert.throws(()=>decrypt(a,result.code));assert.equal(JSON.stringify(b),before);
});
test('replay rejection and out of order messages within skip bound',()=>{
 let [a,b]=pair();const codes=[];for(let i=0;i<5;i++){const r=encrypt(a,'msg'+i);a=r.contact;codes.push(r.code);}
 for(const i of [3,0,2,1,4]){const r=decrypt(b,codes[i]);b=r.contact;assert.equal(r.text,'msg'+i);assert.throws(()=>decrypt(b,codes[i]));}assert.equal(Object.keys(b.recv.skipped).length,0);
});
test('skip limit, counter exhaustion and malformed input',()=>{
 let [a,b]=pair();a.send.n=MAX_SKIP+1;assert.throws(()=>decrypt(b,encrypt(a,'x').code));a.send.n=2**32;assert.throws(()=>encrypt(a,'x'));a.send.n=0;assert.throws(()=>encrypt(a,'a'.repeat(4097)));assert.throws(()=>encrypt(a,''));
 for(const x of ['','M1:','T1:%%%%','T1:AAAA=','AXP1:x','T1:'+'a'.repeat(6000)])assert.throws(()=>decrypt(b,x));
});
