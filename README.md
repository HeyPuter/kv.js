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
  <summary><strong><code>set</code></strong></summary>

  ```javascript
  // Set a basic key-value pair
  kv.set('username', 'john_doe'); // Output: 'OK'

  // Set a key-value pair only if the key does not already exist (NX option)
  kv.set('username', 'jane_doe', ['NX']);

  // Set a key-value pair only if the key already exists (XX option)
  kv.set('email', 'jane@example.com', ['XX']);

  // Set a key-value pair with an expiration time in seconds (EX option)
  kv.set('session_token', 'abc123', ['EX', 3600]);

  // Get the existing value and set a new value for a key (GET option)
  kv.set('username', 'mary_smith', ['GET']);

  // Set a key-value pair with an expiration time in milliseconds (PX option)
  kv.set('temp_data', '42', ['PX', 1000]);

  // Set a key-value pair with an expiration time at a specific Unix timestamp in seconds (EXAT option)
  kv.set('event_data', 'event1', ['EXAT', 1677649420]);

  // Set a key-value pair with an expiration time at a specific Unix timestamp in milliseconds (PXAT option)
  kv.set('event_data2', 'event2', ['PXAT', 1677649420000]);

  // Set a key-value pair and keep the original TTL if the key already exists (KEEPTTL option)
  kv.set('username', 'alice_wonder', ['KEEPTTL']);

  // Set a key-value pair with multiple options (NX, EX, and GET options)
  kv.set('new_user', 'carol_baker', ['NX', 'EX', 7200, 'GET']);
  ```
</details>

<details>
  <summary><strong><code>get</code></strong></summary>
  
  ```javascript
  // Example 1: Get the value of an existing key
  kv.get('username'); // Returns the value associated with the key 'username'

  // Example 2: Get the value of a non-existent key
  kv.get('nonexistent'); // Returns null

  // Example 3: Get the value of an expired key (assuming 'expiredKey' was set with an expiration)
  kv.get('expiredKey'); // Returns null

  // Example 4: Get the value of a key after updating its value
  kv.set('color', 'red'); // Sets the key 'color' to the value 'red'
  kv.get('color'); // Returns 'red'

  // Example 5: Get the value of a key after deleting it (assuming 'deletedKey' was previously set)
  kv.delete('deletedKey'); // Deletes the key 'deletedKey'
  kv.get('deletedKey'); // Returns null
  ```
</details>

<details>
  <summary><strong><code>expire</code></strong></summary>

  ```javascript
  // Set a key's time to live in seconds without any option
  kv.expire('username', 60);

  // Set a key's time to live in seconds only if the key does not exist
  kv.expire('username', 120, 'NX');

  // Set a key's time to live in seconds only if the key exists
  kv.expire('username', 180, 'XX');

  // Set a key's time to live in seconds only if the key's expiry time is greater than the specified time
  kv.expire('username', 240, 'GT');

  // Set a key's time to live in seconds only if the key's expiry time is less than the specified time
  kv.expire('username', 300, 'LT');
  ```
</details>


<details>
  <summary><strong><code>del</code></strong></summary>

  ```javascript
  // Delete a single key ("key1"), returns 1 if the key was deleted, 0 if it did not exist or has expired.
  kv.del("key1");

  // Delete multiple keys ("key2" and "key3"), returns the number of keys deleted (0, 1, or 2) depending on which keys existed and were not expired.
  kv.del("key2", "key3");

  // Attempt to delete a non-existent key ("nonExistentKey"), returns 0 since the key does not exist.
  kv.del("nonExistentKey");

  // Attempt to delete an expired key ("expiredKey"), returns 0 if the key has expired.
  kv.del("expiredKey");

  // Delete multiple keys ("key4", "key5", "key6"), returns the number of keys deleted (0 to 3) depending on which keys existed and were not expired.
  kv.del("key4", "key5", "key6");
  ```
</details>

<details>
  <summary><strong><code>exists</code></strong></summary>

  ```javascript
  // Check if a single key ("key1") exists, returns 1 if the key exists and is not expired, 0 otherwise.
  kv.exists("key1");

  // Check if multiple keys ("key2" and "key3") exist, returns the number of existing keys (0, 1, or 2) that are not expired.
  kv.exists("key2", "key3");

  // Check if a non-existent key ("nonExistentKey") exists, returns 0 since the key does not exist.
  kv.exists("nonExistentKey");

  // Check if an expired key ("expiredKey") exists, returns 0 if the key has expired.
  kv.exists("expiredKey");

  // Check if multiple keys ("key4", "key5", "key6") exist, returns the number of existing keys (0 to 3) that are not expired.
  kv.exists("key4", "key5", "key6");
  ```
</details>

<details>
  <summary><strong><code>incr</code></strong></summary>

  ```javascript
  // Increment the value of an existing key ("key1") by 1, returns the new value of the key.
  kv.incr("key1");

  // Increment the value of a non-existing key ("nonExistentKey"), returns 1 as the new value of the key (since it's initialized as 0 and incremented by 1).
  kv.incr("nonExistentKey");

  // Increment the value of an expired key ("expiredKey"), if the key has expired, it will be treated as a new key, returns 1 as the new value of the key.
  kv.incr("expiredKey");

  // Increment the value of an existing key ("key2") with a non-numeric value, throws an error.
  kv.incr("key2"); // Assuming "key2" has a non-numeric value

  // Increment the value of an existing key ("key3") with a numeric value, returns the incremented value of the key.
  kv.incr("key3"); // Assuming "key3" has a numeric value
  ```
</details>

<details>
  <summary><strong><code>incrby</code></strong></summary>

  ```javascript
  // Increment the value of a key by 5 (assuming the key does not exist or its value is an integer)
  kv.incrby('counter', 5);

  // Increment the value of a key by -3 (assuming the key does not exist or its value is an integer)
  kv.incrby('counter', -3);

  // Increment the value of a key by 10 (assuming the key does not exist or its value is an integer)
  kv.incrby('counter', 10);

  // Increment the value of a key by 0 (assuming the key does not exist or its value is an integer)
  kv.incrby('counter', 0);

  // Increment the value of a key by -7 (assuming the key does not exist or its value is an integer)
  kv.incrby('counter', -7);
  ```
</details>

<details>
  <summary><strong><code>decr</code></strong></summary>

  ```javascript
  // Assuming the key 'counter' has been set, decrement the value of the key by 1
  kv.decr('counter');
  ```
</details>

<details>
  <summary><strong><code>decrby</code></strong></summary>

  ```javascript
  // Assuming the key 'counter' has been set, decrement the value of the key by 5 (output: -5)
  kv.decrby('counter', 5);

  // Assuming the key 'counter' has been set, decrement the value of the key by -3 (output: 3)
  kv.decrby('counter', -3);

  // Assuming the key 'counter' has been set, decrement the value of the key by 10 (output: -7)
  kv.decrby('counter', 10);

  // Assuming the key 'counter' has been set, decrement the value of the key by 0 (output: 0)
  kv.decrby('counter', 0);

  // Assuming the key 'counter' has been set, decrement the value of the key by -7 (output: 4)
  kv.decrby('counter', -7);
  ```
</details>

<details>
  <summary><strong><code>mget</code></strong></summary>

  ```javascript
  // Retrieve the values of key 'username'
  kv.mget('username');

  // Retrieve the values of keys 'username' and 'email' (assuming they exist)
  kv.mget('username', 'email');
  ```
</details>

<details>
  <summary><strong><code>mset</code></strong></summary>

  ```javascript
  // Set the values of keys 'username' and 'email' to 'johndoe' and 'johndoe@example.com', respectively
  kv.mset('username', 'johndoe', 'email', 'johndoe@example.com');

  // Set the values of keys 'counter' and 'score' to 0 and 100, respectively
  kv.mset('counter', 0, 'score', 100);
  ```
</details>

<details>
  <summary><strong><code>keys</code></strong></summary>

  ```javascript
  // Find all keys matching the pattern 'user:*' (assuming some keys matching the pattern exist)
  kv.keys('user:*');

  // Find all keys matching the pattern 'product:*' (assuming some keys matching the pattern exist)
  kv.keys('product:*');

  // Find all keys matching the pattern '*:email' (assuming some keys matching the pattern exist)
  kv.keys('*:email');

  // Find all keys matching the pattern 'username' (assuming some keys matching the pattern exist)
  kv.keys('username');
  ```
</details>