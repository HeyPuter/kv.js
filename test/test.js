const kvjs = require('../kv.js');
const assert = require('assert');

describe('set-get', () => {
    it('retrieves a value', () => {
        const store = new kvjs();
        store.set('key', 'value');
        assert.equal(store.get('key'), 'value');
    })
    it('respects NX', () => {
        const store = new kvjs();
        store.set('key', 'value', ['NX'])
        assert.equal(store.get('key'), 'value');
        store.set('key', 'changed', ['NX'])
        assert.equal(store.get('key'), 'value');
    })
    it('respects XX', () => {
        const store = new kvjs();
        store.set('key', 'value', ['XX'])
        assert.equal(store.get('key'), null);
    })
    it('respects EXAT', async () => {
        const store = new kvjs();
        store.set('key', 'value', ['EXAT', Date.now() / 1000 + 1])
        assert.equal(store.get('key'), 'value');
        await new Promise(rslv => setTimeout(rslv, 1100));
        assert.equal(store.get('key'), null);
    })
    it('accepts options', () => {
        const store = new kvjs();
        store.set('key', 'value', ['EXAT', Date.now() / 1000 + 5])
        assert.equal(store.get('key'), 'value');
    })
})
