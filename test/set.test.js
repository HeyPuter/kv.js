const assert = require('assert');
const kvjs = require('../kv.js');

describe('kvjs', () => {
    let instance;

    beforeEach(() => {
        instance = new kvjs();
    });

    describe('set', () => {
        it('should set a new key-value pair', () => {
            assert.strictEqual(instance.set('key', 'value'), true);
            assert.equal(instance.get('key'), 'value');
        });

        it('should overwrite an existing key-value pair', () => {
            instance.set('key', 'value');
            assert.strictEqual(instance.set('key', 'new_value'), true);
            assert.equal(instance.get('key'), 'new_value');
        });

        it('should set a key-value pair with NX option', () => {
            assert.strictEqual(instance.set('key', 'value', { NX: true }), true);
            assert.equal(instance.get('key'), 'value');
        });

        it('should not set a key-value pair with NX option if key exists', () => {
            instance.set('key', 'value');
            assert.strictEqual(instance.set('key', 'new_value', { NX: true }), undefined);
            assert.equal(instance.get('key'), 'value');
        });

        it('should not set a key-value pair with XX option if key does not exist', () => {
            assert.strictEqual(instance.set('key', 'value', { XX: true }), undefined);
            assert.strictEqual(instance.get('key'), undefined);
        });

        it('should set a key-value pair with XX option if key exists', () => {
            instance.set('key', 'value');
            assert.strictEqual(instance.set('key', 'new_value', { XX: true }), true);
            assert.equal(instance.get('key'), 'new_value');
        });

        it('should return the old value if GET option is specified and key exists', () => {
            instance.set('key', 'value');
            assert.equal(instance.set('key', 'new_value', { GET: true }), 'value');
            assert.equal(instance.get('key'), 'new_value');
        });

        it('should handle expiration options correctly', (done) => {
            instance.set('key', 'value', { PX: 50 });
            setTimeout(() => {
                assert.strictEqual(instance.get('key'), undefined);
                done();
            }, 60);
        });

        it('should handle expiration options correctly', (done) => {
            instance.set('key', 'value', { PX: 50 });
            setTimeout(() => {
                assert.strictEqual(instance.get('key'), 'value');
                done();
            }, 10);
        });


        it('should handle EX option correctly', (done) => {
            instance.set('key', 'value', { EX: 1 });
            setTimeout(() => {
                assert.strictEqual(instance.get('key'), undefined);
                done();
            }, 1100);
        });

        it('should handle EXAT option correctly', (done) => {
            const exat = Math.floor(Date.now() / 1000) + 1;
            instance.set('key', 'value', { EXAT: exat });
            setTimeout(() => {
                assert.strictEqual(instance.get('key'), undefined);
                done();
            }, 1100);
        });

        it('should handle PXAT option correctly', (done) => {
            const pxat = Date.now() + 1000;
            instance.set('key', 'value', { PXAT: pxat });
            setTimeout(() => {
                assert.strictEqual(instance.get('key'), undefined);
                done();
            }, 1100);
        });

        it('should handle KEEPTTL option correctly when key exists and has expiration', (done) => {
            instance.set('key', 'value', { PX: 2000 });
            setTimeout(() => {
                instance.set('key', 'new_value', { KEEPTTL: true });
                assert.equal(instance.get('key'), 'new_value');
                setTimeout(() => {
                    assert.strictEqual(instance.get('key'), undefined);
                    done();
                }, 1100);
            }, 1000);
        });        

        it('should handle KEEPTTL option correctly when key exists and has no expiration', () => {
            instance.set('key', 'value');
            instance.set('key', 'new_value', { KEEPTTL: true });
            assert.equal(instance.get('key'), 'new_value');
            // The key should not expire since there was no initial expiration set
        });

        describe('scalability', function(){
            this.timeout(0); // Disable Mocha timeout
            it('should handle more than 16,777,215 keys', (done) => {
    
                const totalKeys = 16777300; // 16,777,300 keys
                let setCount = 0;
                for (let i = 0; i < totalKeys; i++) {
                    const key = `key${i}`;
                    const value = `value${i}`;
                    instance.set(key, value);
                    if (instance.get(key) === value) {
                        setCount++;
                    }
                }
    
                assert.strictEqual(setCount, totalKeys, `Should have set and retrieved ${totalKeys} keys correctly`);
                done();
            });
        });
    });
});
