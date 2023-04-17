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
## API

<details>
  <summary>

  ### `set`

  </summary>

  ```javascript
  // Set a basic key-value pair
  kvjs.set('username', 'john_doe'); // Output: 'OK'

  // Set a key-value pair only if the key does not already exist (NX option)
  kvjs.set('username', 'jane_doe', ['NX']);

  // Set a key-value pair only if the key already exists (XX option)
  kvjs.set('email', 'jane@example.com', ['XX']);

  // Set a key-value pair with an expiration time in seconds (EX option)
  kvjs.set('session_token', 'abc123', ['EX', 3600]);

  // Get the existing value and set a new value for a key (GET option)
  kvjs.set('username', 'mary_smith', ['GET']);

  // Set a key-value pair with an expiration time in milliseconds (PX option)
  kvjs.set('temp_data', '42', ['PX', 1000]);

  // Set a key-value pair with an expiration time at a specific Unix timestamp in seconds (EXAT option)
  kvjs.set('event_data', 'event1', ['EXAT', 1677649420]);

  // Set a key-value pair with an expiration time at a specific Unix timestamp in milliseconds (PXAT option)
  kvjs.set('event_data2', 'event2', ['PXAT', 1677649420000]);

  // Set a key-value pair and keep the original TTL if the key already exists (KEEPTTL option)
  kvjs.set('username', 'alice_wonder', ['KEEPTTL']);

  // Set a key-value pair with multiple options (NX, EX, and GET options)
  kvjs.set('new_user', 'carol_baker', ['NX', 'EX', 7200, 'GET']);
  ```
</details>

<details>
  <summary><strong><code>get</code></strong></summary>
  
```javascript
// Example 1: Get the value of an existing key
kvjs.get('username'); // Returns the value associated with the key 'username'

// Example 2: Get the value of a non-existent key
kvjs.get('nonexistent'); // Returns null

// Example 3: Get the value of an expired key (assuming 'expiredKey' was set with an expiration)
kvjs.get('expiredKey'); // Returns null

// Example 4: Get the value of a key after updating its value
kvjs.set('color', 'red'); // Sets the key 'color' to the value 'red'
kvjs.get('color'); // Returns 'red'

// Example 5: Get the value of a key after deleting it (assuming 'deletedKey' was previously set)
kvjs.delete('deletedKey'); // Deletes the key 'deletedKey'
kvjs.get('deletedKey'); // Returns null
```
</details>
