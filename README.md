<h3 align="center">KV.JS</h3>
<p align="center">Fast, in-memory caching module for JavaScript. Inspired by Redis.</p>
<hr>

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
