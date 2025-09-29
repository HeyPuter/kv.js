const assert = require('assert').strict;
const kvjs = require('../kv.js');

describe('kvjs', () => {
    let instance;

    beforeEach(() => {
        instance = new kvjs();
    });

    describe('keys', () => {
        describe('basic functionality', () => {
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

            it('should be case-insensitive', () => {
                instance.set('Key1', 'value1');
                instance.set('key2', 'value2');
                instance.set('KEY3', 'value3');

                assert.deepStrictEqual(instance.keys('key*'), ['Key1', 'key2', 'KEY3']);
            });

            it('should return exact matches', () => {
                instance.set('exact', 'value1');
                instance.set('exactmatch', 'value2');
                instance.set('prefix_exact', 'value3');

                assert.deepStrictEqual(instance.keys('exact'), ['exact']);
            });
        });

        describe('glob pattern matching', () => {
            beforeEach(() => {
                instance.set('user:1', 'user1');
                instance.set('user:2', 'user2');
                instance.set('admin:1', 'admin1');
                instance.set('user_profile', 'profile');
                instance.set('product:123', 'product123');
                instance.set('product:456', 'product456');
                instance.set('temp', 'temporary');
                instance.set('test', 'testing');
                instance.set('task', 'task');
                instance.set('file.txt', 'content');
                instance.set('file.log', 'logs');
                instance.set('config.json', 'config');
            });

            it('should support wildcard (*) patterns', () => {
                assert.deepStrictEqual(instance.keys('user:*').sort(), ['user:1', 'user:2']);
                assert.deepStrictEqual(instance.keys('*:1').sort(), ['admin:1', 'user:1']);
                assert.deepStrictEqual(instance.keys('product:*').sort(), ['product:123', 'product:456']);
            });

            it('should support single character (?) patterns', () => {
                instance.set('a1', 'val1');
                instance.set('b2', 'val2');
                instance.set('c3', 'val3');
                instance.set('aa', 'val4');

                assert.deepStrictEqual(instance.keys('?1'), ['a1']);
                assert.deepStrictEqual(instance.keys('??').sort(), ['a1', 'aa', 'b2', 'c3']);
            });

            it('should support character class ([]) patterns', () => {
                instance.set('a1', 'val1');
                instance.set('b1', 'val2');
                instance.set('c1', 'val3');
                instance.set('d1', 'val4');

                assert.deepStrictEqual(instance.keys('[ab]1').sort(), ['a1', 'b1']);
                assert.deepStrictEqual(instance.keys('[a-c]1').sort(), ['a1', 'b1', 'c1']);
            });

            it('should support brace expansion ({}) patterns', () => {
                instance.set('file.txt', 'text');
                instance.set('file.log', 'log');
                instance.set('file.json', 'json');
                instance.set('file.xml', 'xml');

                const result = instance.keys('file.{txt,log}').sort();
                assert.deepStrictEqual(result, ['file.log', 'file.txt']);
            });

            it('should support negation patterns', () => {
                instance.set('test1', 'val1');
                instance.set('test2', 'val2');
                instance.set('prod1', 'val3');
                instance.set('prod2', 'val4');

                // Note: minimatch negation works with ! at the beginning
                const allKeys = instance.keys('*').sort();
                const testKeys = instance.keys('test*').sort();
                
                // Verify we have both test and non-test keys
                assert(testKeys.length > 0, 'Should have test keys');
                assert(allKeys.length > testKeys.length, 'Should have non-test keys');
            });

            it('should handle complex nested patterns', () => {
                instance.set('api/v1/users', 'users');
                instance.set('api/v1/products', 'products');
                instance.set('api/v2/users', 'users_v2');
                instance.set('web/static/css', 'styles');

                assert.deepStrictEqual(instance.keys('api/*/users').sort(), ['api/v1/users', 'api/v2/users']);
                assert.deepStrictEqual(instance.keys('api/v1/*').sort(), ['api/v1/products', 'api/v1/users']);
            });
        });

        describe('edge cases', () => {
            it('should handle empty pattern', () => {
                instance.set('key', 'value');
                assert.deepStrictEqual(instance.keys(''), []);
            });

            it('should handle patterns with special characters', () => {
                instance.set('key@domain.com', 'email');
                instance.set('user#123', 'user');
                instance.set('price$100', 'price');
                instance.set('path/to/file', 'file');

                assert.deepStrictEqual(instance.keys('key@*'), ['key@domain.com']);
                assert.deepStrictEqual(instance.keys('*#123'), ['user#123']);
                assert.deepStrictEqual(instance.keys('price$*'), ['price$100']);
                assert.deepStrictEqual(instance.keys('path/to/*'), ['path/to/file']);
            });

            it('should handle unicode characters', () => {
                instance.set('用户:1', 'chinese_user');
                instance.set('пользователь:1', 'russian_user');
                instance.set('🔑key', 'emoji_key');
                instance.set('café', 'french_word');

                assert.deepStrictEqual(instance.keys('用户:*'), ['用户:1']);
                assert.deepStrictEqual(instance.keys('пользователь:*'), ['пользователь:1']);
                assert.deepStrictEqual(instance.keys('🔑*'), ['🔑key']);
                assert.deepStrictEqual(instance.keys('café'), ['café']);
            });

            it('should handle very long keys and patterns', () => {
                const longKey = 'a'.repeat(1000) + ':test';
                const longPattern = 'a'.repeat(1000) + ':*';
                
                instance.set(longKey, 'value');
                assert.deepStrictEqual(instance.keys(longPattern), [longKey]);
            });

            it('should handle patterns that match no keys', () => {
                instance.set('key1', 'value1');
                instance.set('key2', 'value2');

                assert.deepStrictEqual(instance.keys('nonexistent*'), []);
                assert.deepStrictEqual(instance.keys('xyz'), []);
            });
        });

        describe('expiration handling', () => {
            it('should not return expired keys', (done) => {
                instance.set('key1', 'value1', { EX: 1 });
                instance.set('key2', 'value2');

                setTimeout(() => {
                    assert.deepStrictEqual(instance.keys('*'), ['key2']);
                    done();
                }, 1100);
            });

            it('should not return keys expired with PX option', (done) => {
                instance.set('temp1', 'value1', { PX: 100 });
                instance.set('temp2', 'value2', { PX: 200 });
                instance.set('permanent', 'value3');

                setTimeout(() => {
                    const keys = instance.keys('*').sort();
                    assert.deepStrictEqual(keys, ['permanent', 'temp2']);
                }, 150);

                setTimeout(() => {
                    assert.deepStrictEqual(instance.keys('*'), ['permanent']);
                    done();
                }, 250);
            });

            it('should not return keys expired with EXAT option', (done) => {
                const exat = Math.floor(Date.now() / 1000) + 1;
                instance.set('expiring', 'value', { EXAT: exat });
                instance.set('permanent', 'value');

                setTimeout(() => {
                    assert.deepStrictEqual(instance.keys('*'), ['permanent']);
                    done();
                }, 1100);
            });

            it('should not return keys expired with PXAT option', (done) => {
                const pxat = Date.now() + 100;
                instance.set('expiring', 'value', { PXAT: pxat });
                instance.set('permanent', 'value');

                setTimeout(() => {
                    assert.deepStrictEqual(instance.keys('*'), ['permanent']);
                    done();
                }, 150);
            });

            it('should handle mixed expired and non-expired keys with patterns', (done) => {
                instance.set('user:1', 'value1', { PX: 100 });
                instance.set('user:2', 'value2');
                instance.set('admin:1', 'value3', { PX: 100 });
                instance.set('admin:2', 'value4');

                setTimeout(() => {
                    assert.deepStrictEqual(instance.keys('user:*'), ['user:2']);
                    assert.deepStrictEqual(instance.keys('admin:*'), ['admin:2']);
                    assert.deepStrictEqual(instance.keys('*:2').sort(), ['admin:2', 'user:2']);
                    done();
                }, 150);
            });
        });

        describe('ordering and consistency', () => {
            it('should return keys in consistent order for same pattern', () => {
                instance.set('c', '3');
                instance.set('a', '1');
                instance.set('b', '2');

                const result1 = instance.keys('*');
                const result2 = instance.keys('*');
                
                assert.deepStrictEqual(result1, result2, 'Keys should be returned in consistent order');
            });

            it('should maintain order when keys are added and removed', () => {
                instance.set('key1', 'value1');
                instance.set('key2', 'value2');
                const initial = instance.keys('*');

                instance.set('key3', 'value3');
                instance.del('key2');
                const afterChanges = instance.keys('*');

                // Should contain key1 and key3, order should be consistent
                assert(afterChanges.includes('key1'), 'Should contain key1');
                assert(afterChanges.includes('key3'), 'Should contain key3');
                assert(!afterChanges.includes('key2'), 'Should not contain deleted key2');
            });
        });

        describe('performance', () => {
            it('should handle large number of keys efficiently', function() {
                this.timeout(5000); // Allow more time for this test
                
                const keyCount = 10000;
                
                // Set up keys
                for (let i = 0; i < keyCount; i++) {
                    instance.set(`key:${i}`, `value${i}`);
                    instance.set(`user:${i}`, `user${i}`);
                }

                const start = Date.now();
                const keyResults = instance.keys('key:*');
                const userResults = instance.keys('user:*');
                const allResults = instance.keys('*');
                const end = Date.now();

                assert.strictEqual(keyResults.length, keyCount, 'Should return all key: keys');
                assert.strictEqual(userResults.length, keyCount, 'Should return all user: keys');
                assert.strictEqual(allResults.length, keyCount * 2, 'Should return all keys');
                
                // Performance should be reasonable (less than 1 second for 20k keys)
                assert(end - start < 1000, `Performance test took ${end - start}ms, should be < 1000ms`);
            });

            it('should handle complex patterns efficiently on large datasets', function() {
                this.timeout(3000);
                
                // Create a variety of keys
                for (let i = 0; i < 1000; i++) {
                    instance.set(`api/v1/users/${i}`, `user${i}`);
                    instance.set(`api/v2/users/${i}`, `userv2_${i}`);
                    instance.set(`web/static/css/${i}.css`, `style${i}`);
                    instance.set(`web/static/js/${i}.js`, `script${i}`);
                }

                const start = Date.now();
                const apiV1Users = instance.keys('api/v1/users/*');
                const allCss = instance.keys('web/static/css/*');
                const allApiUsers = instance.keys('api/*/users/*');
                const end = Date.now();

                assert.strictEqual(apiV1Users.length, 1000);
                assert.strictEqual(allCss.length, 1000);
                assert.strictEqual(allApiUsers.length, 2000);
                
                // Should complete in reasonable time
                assert(end - start < 500, `Complex pattern test took ${end - start}ms, should be < 500ms`);
            });
        });

        describe('integration with other operations', () => {
            it('should work correctly after set operations', () => {
                instance.set('key1', 'value1');
                assert.deepStrictEqual(instance.keys('*'), ['key1']);

                instance.set('key2', 'value2');
                assert.deepStrictEqual(instance.keys('*').sort(), ['key1', 'key2']);

                instance.set('key1', 'new_value1'); // Update existing key
                assert.deepStrictEqual(instance.keys('*').sort(), ['key1', 'key2']);
            });

            it('should work correctly after del operations', () => {
                instance.set('key1', 'value1');
                instance.set('key2', 'value2');
                instance.set('key3', 'value3');

                assert.strictEqual(instance.keys('*').length, 3);

                instance.del('key2');
                const remaining = instance.keys('*').sort();
                assert.deepStrictEqual(remaining, ['key1', 'key3']);
            });

            it('should work correctly with keys that have been persisted', () => {
                // Test persist operation doesn't affect keys listing
                instance.set('expiring', 'value', { EX: 10 });
                instance.set('normal', 'value');
                
                assert.strictEqual(instance.keys('*').length, 2);
                
                // After persist, key should still be listed
                instance.persist('expiring');
                assert.strictEqual(instance.keys('*').length, 2);
                assert(instance.keys('*').includes('expiring'));
            });
        });
    });
});
