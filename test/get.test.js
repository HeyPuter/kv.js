const assert = require('assert').strict;
const kvjs = require('../kv.js');

describe('kvjs', () => {
    let instance;

    beforeEach(() => {
        instance = new kvjs();
    });

    describe('get', () => {
        it('should return undefined for non-existent keys', () => {
            assert.strictEqual(instance.get('non_existent_key'), undefined);
        });

        it('should return the value of an existing key', () => {
            instance.set('key', 'value');
            assert.strictEqual(instance.get('key'), 'value');
        });

        it('should return undefined for expired keys', (done) => {
            instance.set('key', 'value', { PX: 50 });
            setTimeout(() => {
                assert.strictEqual(instance.get('key'), undefined);
                done();
            }, 60);
        });

        it('should return the value of a non-expired key', (done) => {
            instance.set('key', 'value', { PX: 200 });
            setTimeout(() => {
                assert.strictEqual(instance.get('key'), 'value');
                done();
            }, 100);
        });

        it('should return undefined for keys that just expired', (done) => {
            instance.set('key', 'value', { PX: 100 });
            setTimeout(() => {
                assert.strictEqual(instance.get('key'), undefined);
                done();
            }, 110);
        });

        it('should return the value for keys that are about to expire', (done) => {
            instance.set('key', 'value', { PX: 100 });
            setTimeout(() => {
                assert.strictEqual(instance.get('key'), 'value');
                done();
            }, 90);
        });

        it('should handle expiration when reset with a new value', (done) => {
            instance.set('key', 'value', { PX: 100 });
            setTimeout(() => {
                instance.set('key', 'new_value');
                assert.strictEqual(instance.get('key'), 'new_value');
                done();
            }, 50);
        });

        it('should handle expiration when reset with a new value and new expiration', (done) => {
            instance.set('key', 'value', { PX: 100 });
            setTimeout(() => {
                instance.set('key', 'new_value', { PX: 100 });
                setTimeout(() => {
                    assert.strictEqual(instance.get('key'), 'new_value');
                    done();
                }, 50);
            }, 50);
        });
    });
});
