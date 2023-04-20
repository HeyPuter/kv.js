const assert = require('assert').strict;
const kvjs = require('../kv.js');

describe('kvjs', () => {
    let instance;

    beforeEach(() => {
        instance = new kvjs();
    });

    describe('expire', () => {
        it('should return 0 for non-existent keys', () => {
            assert.strictEqual(instance.expire('non_existent_key', 10), 0);
        });

        it('should set the expiration time for an existing key and return 1', () => {
            instance.set('key', 'value');
            assert.strictEqual(instance.expire('key', 10), 1);
        });

        it('should not set the expiration time for an existing key with NX option and return 0', () => {
            instance.set('key', 'value', { EX: 10 });
            assert.strictEqual(instance.expire('key', 20, { NX: true }), 0);
        });

        it('should not set the expiration time for an existing key without expiration and XX option and return 0', () => {
            instance.set('key', 'value');
            assert.strictEqual(instance.expire('key', 20, { XX: true }), 0);
        });

        it('should not set the expiration time for an existing key with GT option and greater expiration time and return 0', () => {
            instance.set('key', 'value', { EX: 10 });
            assert.strictEqual(instance.expire('key', 50, { GT: true }), 0);
        });

        it('should set the expiration time for an existing key with LT option and smaller expiration time and return 0', () => {
            instance.set('key', 'value', { EX: 5 });
            assert.strictEqual(instance.expire('key', 10, { LT: true }), 1);
        });

        it('should not set the expiration time for an existing key with GT option and smaller expiration time and return 1', () => {
            instance.set('key', 'value', { EX: 5 });
            assert.strictEqual(instance.expire('key', 10, { GT: true }), 0);
        });

        it('should not set the expiration time for an existing key with LT option and greater expiration time and return 1', () => {
            instance.set('key', 'value', { EX: 10 });
            assert.strictEqual(instance.expire('key', 5, { LT: true }), 0);
        });
    });
});
