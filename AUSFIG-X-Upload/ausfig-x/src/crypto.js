import { x25519 } from '@noble/curves/ed25519.js';
import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import { bytesToHex, hexToBytes, concatBytes } from '@noble/hashes/utils.js';
export { bytesToHex as hex, hexToBytes as unhex };
const enc = new TextEncoder();
const dec = new TextDecoder('utf-8', {fatal:true});
export const utf8 = s => enc.encode(s);
export const MAX_TEXT = 4096;
export const MAX_SKIP = 100;
const MAX_COUNTER = 0xffffffff;
export function random(n) { return crypto.getRandomValues(new Uint8Array(n)); }
export function b64(b) { return btoa(Array.from({length:Math.ceil(b.length/32768)},(_,i)=>String.fromCharCode(...b.subarray(i*32768,(i+1)*32768))).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
export function unb64(s) {
  if (!s || s.length > 2000000 || !/^[A-Za-z0-9_-]+$/.test(s) || s.length % 4 === 1) throw Error('Некорректный код.');
  const out = Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0));
  if (b64(out) !== s) throw Error('Некорректный код.');
  return out;
}
const pack = obj => 'AXP1:' + b64(utf8(JSON.stringify(obj)));
function unpack(s,kind) {
  if(typeof s !== 'string' || s.length>1000 || !s.startsWith('AXP1:')) throw Error('Нужен код обмена ключами AXP1.');
  const x=JSON.parse(dec.decode(unb64(s.slice(5))));
  if(x.v!==1 || x.kind!==kind || !/^[a-f0-9]{32}$/.test(x.id) || !/^[a-f0-9]{64}$/.test(x.pub)) throw Error('Неверный формат обмена ключами.');
  return x;
}
export function offer() {
  const priv=random(32), pub=bytesToHex(x25519.getPublicKey(priv));
  const data={v:1,kind:'offer',id:bytesToHex(random(16)),pub};
  return {priv, data, code:pack(data)};
}
function derive(priv, a, b, initiator) {
  const transcript=utf8(`AUSFIG-X/1|${a.id}|${a.pub}|${b.pub}`);
  const digest=sha256(transcript), sid=bytesToHex(digest.slice(0,16));
  const shared=x25519.getSharedSecret(priv,hexToBytes(initiator?b.pub:a.pub));
  const material=hkdf(sha256,shared,digest,utf8('AUSFIG-X/1/session'),80);
  shared.fill(0);
  const chainA=bytesToHex(material.slice(0,32)), chainB=bytesToHex(material.slice(32,64));
  const nonceA=bytesToHex(material.slice(64,72)), nonceB=bytesToHex(material.slice(72,80));
  material.fill(0);
  return {id:sid,fingerprint:bytesToHex(digest),role:initiator?'A':'B',send:{chain:initiator?chainA:chainB,nonce:initiator?nonceA:nonceB,n:0},recv:{chain:initiator?chainB:chainA,nonce:initiator?nonceB:nonceA,n:0,skipped:{}},created:new Date().toISOString()};
}
export function answer(code) {
  const a=unpack(code.trim(),'offer'), priv=random(32);
  const b={v:1,kind:'answer',id:a.id,pub:bytesToHex(x25519.getPublicKey(priv)),offer:a.pub};
  try { return {code:pack(b),contact:derive(priv,a,b,false)}; } finally {priv.fill(0);}
}
export function finish(pending,code) {
  const b=unpack(code.trim(),'answer');
  if(b.id!==pending.data.id || b.offer!==pending.data.pub) throw Error('Ответ относится к другому приглашению.');
  const contact=derive(pending.priv,pending.data,b,true);
  pending.priv.fill(0);
  return contact;
}
function step(chain) {
  const key=hexToBytes(chain);
  const message=hmac(sha256,key,utf8('AUSFIG-X/1/message'));
  const next=bytesToHex(hmac(sha256,key,utf8('AUSFIG-X/1/chain')));
  key.fill(0); return {message,next};
}
const counterBytes = n => {const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,false);return b;};
function aad(c,prefix,n,sending) {
  const dir=sending ? c.role : (c.role==='A'?'B':'A');
  return concatBytes(utf8(`AUSFIG-X/1|${c.id}|${dir}|dict1|${prefix}|`),counterBytes(n));
}
export const COMMANDS=['На месте','Всё в порядке','Перезвони мне','Сообщение принято','Нужна помощь','Встреча'];
export function compact(index,time='18:00') {
  if(!Number.isInteger(index)||index<0||index>=COMMANDS.length) throw Error('Неизвестная команда.');
  let minutes=0;
  if(index===5) {
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Error('Укажите время.');
    const [h,m]=time.split(':').map(Number);minutes=h*60+m;
  }
  const value=(index<<11)|minutes;return new Uint8Array([value>>8,value&255]);
}
function decodePayload(payload,prefix) {
  if(prefix==='T1:') { if(!payload.length||payload.length>MAX_TEXT) throw Error('Недопустимый размер.'); return dec.decode(payload); }
  if(payload.length!==2) throw Error('Неверная команда.');
  const x=(payload[0]<<8)|payload[1], i=x>>11, minutes=x&2047;
  if(i>=COMMANDS.length||(i!==5&&minutes!==0)||(i===5&&minutes>1439)) throw Error('Неверная команда.');
  return i===5 ? `Встреча в ${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}` : COMMANDS[i];
}
export function encrypt(contact,text,{command=null,time}={}) {
  const c=structuredClone(contact), s=c.send, n=s.n;
  if(!Number.isSafeInteger(n)||n<0||n>MAX_COUNTER) throw Error('Нужно создать новый сеанс.');
  const prefix=command===null?'T1:':'M1:', payload=command===null?utf8(text):compact(command,time);
  if(!payload.length||payload.length>MAX_TEXT) throw Error('Введите сообщение длиной до 4096 байт.');
  const {message,next}=step(s.chain);
  const nonce=concatBytes(hexToBytes(s.nonce),counterBytes(n));
  try {
    const cipher=chacha20poly1305(message,nonce,aad(c,prefix,n,true)).encrypt(payload);
    s.chain=next;s.n=n+1;
    return {contact:c,code:prefix+b64(concatBytes(counterBytes(n),cipher))};
  } finally {message.fill(0);payload.fill(0);}
}
export function decrypt(contact,code) {
  if(typeof code!=='string'||code.length>6000) throw Error('Код слишком длинный.');
  code=code.trim();const prefix=code.slice(0,3);
  if(!['M1:','T1:'].includes(prefix)) throw Error('Нужен код M1: или T1:.');
  const data=unb64(code.slice(3));
  if(data.length<21||data.length>MAX_TEXT+20 || (prefix==='M1:'&&data.length!==22)) throw Error('Неверная длина кода.');
  const n=new DataView(data.buffer,data.byteOffset,4).getUint32(0,false);
  const c=structuredClone(contact), r=c.recv;
  let message;
  if(n<r.n) {
    if(!Object.hasOwn(r.skipped,n)) throw Error('Код уже принят или устарел.');
    message=hexToBytes(r.skipped[n]);delete r.skipped[n];
  } else {
    if(n-r.n+Object.keys(r.skipped).length>MAX_SKIP) throw Error('Слишком много пропущенных сообщений. Создайте новый сеанс.');
    for(let i=r.n;i<=n;i++) {
      const s=step(r.chain);r.chain=s.next;
      if(i===n) message=s.message;else {r.skipped[i]=bytesToHex(s.message);s.message.fill(0);}
    }
    r.n=n+1;
  }
  const nonce=concatBytes(hexToBytes(r.nonce),counterBytes(n));
  let payload;
  try {
    payload=chacha20poly1305(message,nonce,aad(c,prefix,n,false)).decrypt(data.slice(4));
    return {contact:c,text:decodePayload(payload,prefix)};
  } catch {throw Error('Не удалось проверить код. Проверьте контакт и целостность сообщения.');}
  finally {message.fill(0);payload?.fill(0);}
}
