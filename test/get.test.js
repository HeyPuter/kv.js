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
    });
});
