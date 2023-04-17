<h3 align="center">KV.JS</h3>
<p align="center">Advanced in-memory caching module for JavaScript. Inspired by Redis.</p>
<hr>

KV.JS is a fast, in-memory data store written in pure JavaScript, heavily inpired by Redis. It is capable of handling multiple data types, including strings, lists, sets, sorted sets, hashes, and geospatial indexes. Additionally, with more than 140 functions, KV.JS provides a vast variety of operations, ranging from `SET`, `GET`, `EXPIRE`, `DEL` to `INCR`, `DECR`, `LPUSH`, `RPUSH`, `SADD`, `SREM`, `HSET`, `HGET`, and many many more.

## Installation
```bash
npm install @heyputer/kv.js
```

## Usage
```javascript
const kvjs = require('@heyputer/kv.js');

// Create a new kv.js instance
const kv = new kvjs();

// Set a value
kv.set('foo', 'bar');

// Get a value
const value = kv.get('foo');

console.log(value); // "bar"

// Delete a value
kv.del('foo');
```
