import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {database,readRecord,passwordKey,seal,unseal,compareAndSwap} from '../src/storage.js';
import {random,offer,answer,finish,encrypt,decrypt} from '../src/crypto.js';
test('vault is encrypted, rejects wrong password and modified authenticated revision',async()=>{
 const salt=random(16),key=await passwordKey('test-only password 123',salt),state={contacts:[{name:'secret contact'}]};const record=await seal(key,state,salt,1);assert.ok(!JSON.stringify(record).includes('secret contact'));assert.deepEqual(await unseal(record,key),state);const wrong=await passwordKey('wrong password 456',salt);await assert.rejects(unseal(record,wrong));await assert.rejects(unseal({...record,revision:2},key));
});
test('optimistic transaction prevents stale tab commits; crashed pre-commit encryption consumes no state',async()=>{
 const db=await database(),salt=random(16),key=await passwordKey('test-only password 123',salt);const o=offer(),b=answer(o.code),a=finish(o,b.code);const state={contacts:[a]};const initial=await seal(key,state,salt,1);await compareAndSwap(db,initial,0);
 const abandoned=encrypt(a,'not exposed');assert.equal((await unseal(await readRecord(db),key)).contacts[0].send.n,0);
 const next=await seal(key,{contacts:[abandoned.contact]},salt,2);await compareAndSwap(db,next,1);
 await assert.rejects(compareAndSwap(db,next,1),/другой вкладке/);const saved=await unseal(await readRecord(db),key);assert.equal(saved.contacts[0].send.n,1);const actual=encrypt(saved.contacts[0],'visible');assert.notEqual(actual.code,abandoned.code);assert.equal(decrypt(b.contact,actual.code).text,'visible');db.close();
});
