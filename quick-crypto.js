// AUSFIG X password-only encryption, independent of the trusted-contact vault.
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
const AAD=enc.encode('AUSFIG-X/quick/password-v1'),ITERATIONS=310000;
function encode(bytes){let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function decode(str){if(!/^[A-Za-z0-9_-]+$/.test(str)||str.length%4===1)throw Error('Неверный формат кода.');const bin=atob(str.replace(/-/g,'+').replace(/_/g,'/'));const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));if(encode(bytes)!==str)throw Error('Неверный формат кода.');return bytes;}
function checkPassword(pass,forEncryption=false){
 if(typeof pass!=='string'||pass.length===0)throw Error('Введите пароль.');
 // Existing Q1 codes with short passwords remain decryptable for backwards compatibility.
 if(forEncryption&&(Array.from(pass).length<16||new Set(pass).size<4||/^[0-9]+$/.test(pass)))
  throw Error('Новый пароль должен содержать не менее 16 символов. Используйте случайную парольную фразу или генератор.');
}
async function keyFor(pass,salt){const raw=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},raw,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function encryptQuick(text,pass){
 checkPassword(pass,true);
 if(!globalThis.crypto?.subtle)throw Error('Шифрование доступно только по HTTPS.');
 const data=enc.encode(text);
 if(data.length<1||data.length>4096)throw Error('Введите текст длиной до 4096 байт.');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 try{const key=await keyFor(pass,salt);const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:AAD},key,data));const result=new Uint8Array(28+ciphertext.length);result.set(salt);result.set(iv,16);result.set(ciphertext,28);return 'Q1:'+encode(result);}
 finally{data.fill(0);}
}
export function normalizeQuickCode(input){
 if(typeof input!=='string')throw Error('Вставьте код Q1:.');
 let value=input.normalize('NFKC').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF\u00AD]/g,'');
 const start=value.search(/Q1\s*:/i);
 if(start<0)throw Error('Не найден код Q1:. Вставьте зашифрованный текст.');
 value=value.slice(start).replace(/^Q1\s*:/i,'');
 value=value.replace(/(?:```|`|\*\*|\u00A0)/g,'');
 value=value.replace(/\s+/g,'');
 if(!/^[A-Za-z0-9_-]+$/.test(value))throw Error('В коде есть посторонние символы. Скопируйте только код Q1:.');
 if(value.length>5640)throw Error('Код слишком длинный.');
 return 'Q1:'+value;
}
export async function decryptQuick(code,pass){
 if(!globalThis.crypto?.subtle)throw Error('Расшифровка доступна только по HTTPS.');
 code=normalizeQuickCode(code);
 checkPassword(pass);
 const bytes=decode(code.slice(3));
 if(bytes.length<45||bytes.length>4140)throw Error('Неверная длина кода.');
 const key=await keyFor(pass,bytes.subarray(0,16));
 try{const raw=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.subarray(16,28),additionalData:AAD},key,bytes.subarray(28)));try{return dec.decode(raw);}finally{raw.fill(0);}}
 catch{throw Error('Неверный пароль или повреждённый код.');}
}