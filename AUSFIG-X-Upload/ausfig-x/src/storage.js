import {random,b64,unb64,utf8} from './crypto.js';
const DB_NAME='ausfig-x-v1';
export async function database() {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>req.result.createObjectStore('vault');
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(Error('Хранилище браузера недоступно.'));
  });
}
export async function readRecord(db) {
  return new Promise((resolve,reject)=>{const r=db.transaction('vault').objectStore('vault').get('main');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
export async function passwordKey(password,salt) {
  const material=await crypto.subtle.importKey('raw',utf8(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:600000},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function seal(key,state,salt,revision) {
  const iv=random(12), text=utf8(JSON.stringify(state));
  try {
    const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:utf8(`AUSFIG-X/vault/1/${revision}`)},key,text);
    return {version:1,revision,salt:b64(salt),iv:b64(iv),ct:b64(new Uint8Array(ct))};
  } finally{text.fill(0);}
}
export async function unseal(record,key) {
  const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(record.iv),additionalData:utf8(`AUSFIG-X/vault/1/${record.revision}`)},key,unb64(record.ct));
  const plain=new Uint8Array(bytes);
  try{return JSON.parse(new TextDecoder().decode(plain));}finally{plain.fill(0);}
}
export async function compareAndSwap(db,record,expected) {
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('vault','readwrite',{durability:'strict'}),store=tx.objectStore('vault');let conflict=false;
    const req=store.get('main');req.onsuccess=()=>{
      if((req.result?.revision??0)!==expected){conflict=true;tx.abort();return;}
      store.put(record,'main');
    };
    tx.oncomplete=()=>resolve();
    tx.onabort=()=>reject(Error(conflict?'Данные изменены в другой вкладке. Разблокируйте приложение заново.':'Изменения не сохранены. Освободите место и попробуйте снова.'));
    tx.onerror=()=>{};
  });
}
