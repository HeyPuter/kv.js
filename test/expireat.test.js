const assert = require('assert');
const kvjs = require('../kv.js'); // Replace './kvjs' with the correct path to your kvjs class

describe('kvjs', function () {
    describe('expireat()', function () {
        const instance = new kvjs();

        beforeEach(function () {
            instance.set('key1', 'value1');
            instance.set('key2', 'value2');
        });

        afterEach(function () {
            instance.del('key1', 'key2');
        });

        it('should set a key\'s expiration time using a UNIX timestamp (in seconds)', function () {
            const timestampSeconds = Math.floor(Date.now() / 1000) + 5;
            const result = instance.expireat('key1', timestampSeconds);

            assert.strictEqual(result, 1);
            assert.strictEqual(instance.ttl('key1') <= 5, true);
        });

        it('should remove the key if the expiration time is in the past', function () {
            const timestampSeconds = Math.floor(Date.now() / 1000) - 5;
            const result = instance.expireat('key1', timestampSeconds);

            assert.strictEqual(result, 0);
            assert.strictEqual(instance.get('key1'), undefined);
        });

        it('should throw an error if the timestampSeconds parameter is not a valid number', function () {
            assert.throws(() => {
                instance.expireat('key1', 'invalid', {});
            }, Error, 'ERR invalid expire time in SETEX');
        });

        it('should set the TTL only if the key does not have an expiration time (NX option)', function () {
            const timestampSeconds = Math.floor(Date.now() / 1000) + 5000;
            instance.expire('key1', 2000);
            const result1 = instance.expireat('key1', timestampSeconds, { NX: true });
            const result2 = instance.expireat('key2', timestampSeconds, { NX: true });

            assert.strictEqual(result1, 0);
            assert.strictEqual(result2, 1);
        });

        it('should set the TTL only if the key already has an expiration time (XX option)', function () {
            const timestampSeconds = Math.floor(Date.now() / 1000) + 5;
            instance.expire('key1', 2);
            const result1 = instance.expireat('key1', timestampSeconds, { XX: true });
            const result2 = instance.expireat('key2', timestampSeconds, { XX: true });

            assert.strictEqual(result1, 1);
            assert.strictEqual(result2, 0);
        });

        it('should set the TTL only if the new TTL is greater than the current TTL (GT option)', function () {
            instance.expire('key1', 2);
            const result1 = instance.expireat('key1', Math.floor(Date.now() / 1000) + 5, { GT: true });
            const result2 = instance.expireat('key1', Math.floor(Date.now() / 1000) + 1, { GT: true });
        
            assert.strictEqual(result1, 1);
            assert.strictEqual(result2, 0);
        });
        
        it('should set the TTL only if the new TTL is less than the current TTL (LT option)', function () {
            const timestampSeconds = Math.floor(Date.now() / 1000) + 5;
            instance.expire('key1', 10);
            const result1 = instance.expireat('key1', timestampSeconds, {
                LT
                    : true
            });
            const result2 = instance.expireat('key1', Math.floor(Date.now() / 1000) + 12, { LT: true });

            assert.strictEqual(result1, 1);
            assert.strictEqual(result2, 0);
        });

        it('should return 0 if the key does not exist', function () {
            const timestampSeconds = Math.floor(Date.now() / 1000) + 5;
            const result = instance.expireat('nonexistent', timestampSeconds);

            assert.strictEqual(result, 0);
        });
    });
});
