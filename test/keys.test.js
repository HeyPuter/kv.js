const assert = require('assert').strict;
const kvjs = require('../kv.js');

describe('kvjs', () => {
    let instance;

    beforeEach(() => {
        instance = new kvjs();
    });

    describe('keys', () => {
        it('should return an empty array for an empty store', () => {
            assert.deepStrictEqual(instance.keys('*'), []);
        });

        it('should return all keys matching the specified pattern', () => {
            instance.set('key1', 'value1');
            instance.set('key2', 'value2');
            instance.set('foo', 'value3');

            assert.deepStrictEqual(instance.keys('key*'), ['key1', 'key2']);
            assert.deepStrictEqual(instance.keys('*'), ['key1', 'key2', 'foo']);
        });

        it('should not return expired keys', (done) => {
            instance.set('key1', 'value1', { EX: 1 });
            instance.set('key2', 'value2');

            setTimeout(() => {
                assert.deepStrictEqual(instance.keys('*'), ['key2']);
                done();
            }, 1100);
        });

        it('should be case-insensitive', () => {
            instance.set('Key1', 'value1');
            instance.set('key2', 'value2');
            instance.set('KEY3', 'value3');

            assert.deepStrictEqual(instance.keys('key*'), ['Key1', 'key2', 'KEY3']);
        });
    });
});
