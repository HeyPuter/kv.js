const kvjs = require('../kv.js');
const assert = require('assert');

describe('set-get', () => {
    it('retrieves a value', () => {
        const store = new kvjs();
        store.set('key', 'value');
        assert.equal(store.get('key'), 'value');
    })
    it('accepts options', () => {
        const store = new kvjs();
        store.set('key', 'value', ['EXAT', Date.now() / 1000 + 5])
        assert.equal(store.get('key'), 'value');
    })
})
