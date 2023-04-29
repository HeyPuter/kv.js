<h3 align="center"><img width="300" alt="KV.JS logo" src="https://raw.githubusercontent.com/HeyPuter/kv.js/main/logo.png"></h3>
<h3 align="center">Advanced in-memory caching module for JavaScript.</h3>
<h4 align="center">For when you need caching but running Redis would be an overkill.</h4>
<hr>

KV.JS is a fast, in-memory data store written in pure JavaScript, heavily inspired by Redis and Memcached. It is capable of handling multiple data types, including strings, lists, sets, sorted sets, hashes, and geospatial indexes. Additionally, **with more than 140 functions**, KV.JS supports a vast variety of operations, ranging from `SET`, `GET`, `EXPIRE`, `DEL` to `INCR`, `DECR`, `LPUSH`, `RPUSH`, `SADD`, `SREM`, `HSET`, `HGET`, and many many more.

## Installation
```bash
npm install @heyputer/kv.js
```

## Usage
```javascript
const kvjs = require('@heyputer/kv.js');

// Create a new kv.js instance
const kv = new kvjs();

// Set a key
kv.set('foo', 'bar');

// Get the key's value
kv.get('foo'); // "bar"

// Delete the key
kv.del('foo');

// Set another key
kv.set('username', 'heyputer');

// Automatically delete the key after 60 seconds
kv.expire('username', 60);
```
## More usage examples

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
  <summary><strong><code>del</code></strong></summary>

  Delete specified key(s). If a key does not exist, it is ignored.

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

  Check if one or more keys exist.
  
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
  <summary><strong><code>expire</code></strong></summary>

  ```javascript
  // Set a key's time to live in seconds without any option
  kv.expire('username', 60);

  // Set a key's time to live in seconds only if the key does not have an expiry time
  kv.expire('username', 120, {NX: true});

  // Set a key's time to live in seconds only if the key already has an expiry time
  kv.expire('username', 180, {XX: true});

  // Set a key's time to live in seconds only if the key's expiry time is greater than the specified time
  kv.expire('username', 240, {GT: true});

  // Set a key's time to live in seconds only if the key's expiry time is less than the specified time
  kv.expire('username', 300, {LT: true});
  ```
</details>

<details>
  <summary><strong><code>expireat</code></strong></summary>

  ```javascript
  // Set the TTL for key "user1" to expire in 30 seconds.
  kv.expireat("user1", Math.floor(Date.now() / 1000) + 30);

  // Set the TTL for key "user2" to expire at a specific UNIX timestamp (e.g. 1700000000), only if the key does not already have an expiry time.
  kv.expireat("user2", 1700000000, {NX: true});

  // Set the TTL for key "user3" to expire in 45 seconds, only if the key already has an expiry time.
  kv.expireat("user3", Math.floor(Date.now() / 1000) + 45, {XX: true});

  // Set the TTL for key "user4" to expire in 60 seconds, only if the new TTL is greater than the current TTL.
  kv.expireat("user4", Math.floor(Date.now() / 1000) + 60, {GT: true});

  // Set the TTL for key "user5" to expire in 15 seconds, only if the new TTL is less than the current TTL.
  kv.expireat("user5", Math.floor(Date.now() / 1000) + 15, {LT: true});

  // Set the TTL for key "user6" to expire at a specific UNIX timestamp (e.g. 1705000000), only if the key already have an expiry time.
  kv.expireat("user6", 1705000000, {XX: true});

  // Set the TTL for key "user7" to expire in 90 seconds, only if the key does not already have an expiry time.
  kv.expireat("user7", Math.floor(Date.now() / 1000) + 90, {NX: true});

  // Set the TTL for key "user8" to expire at a specific UNIX timestamp (e.g. 1710000000), only if the new TTL is greater than the current TTL.
  kv.expireat("user8", 1710000000, {GT: true});

  // Set the TTL for key "user9" to expire in 120 seconds, only if the new TTL is less than the current TTL.
  kv.expireat("user9", Math.floor(Date.now() / 1000) + 120, {LT: true});

  // Set the TTL for key "user10" to expire in 5 seconds.
  kv.expireat("user10", Math.floor(Date.now() / 1000) + 5);
  ```
</details>

<details>
  <summary><strong><code>get</code></strong></summary>
  
  Get the value of a key.
  
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
  <summary><strong><code>getset</code></strong></summary>

  ```javascript
  // Set initial values for key.
  kv.set("username", "John");

  // Replace the value of "username" with "Alice" and return the old value ("John").
  kv.getset("username", "Alice"); // Returns "John"

  // Replace the value of "nonExistentKey" with "Bob" and return the old value (null).
  kv.getset("nonExistentKey", "Bob"); // Returns null

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
  <summary><strong><code>persist</code></strong></summary>

  ```javascript
  // Remove the expiration from the key "key1".
  kv.persist("key1");
  ```
</details>

<details>
  <summary><strong><code>rename</code></strong></summary>

  ```javascript
  // Rename the key 'username' to 'email' (assuming 'username' exists)
  kv.rename('username', 'email');
  ```
</details>

<details>
  <summary><strong><code>sadd</code></strong></summary>

  Add one or more members to a set stored at key.

  ```javascript
  // add a member to a set
  kv.sadd('set1', 'member1'); // Output: true

  // add multiple members to a set
  kv.sadd('set1', 'member2', 'member3'); // Output: true

  // print the members of a set
  kv.smembers('set1'); // Output: ['member1', 'member2', 'member3']

  // add a member to a set that already contains the member
  kv.sadd('set1', 'member1'); // Output: false

  // add a member to a non-existent set
  kv.sadd('set2', 'member1'); // Output: true
  ```
</details>

<details>
  <summary><strong><code>scard</code></strong></summary>

  Returns the number of members of the set stored at key.

  ```javascript
  // add a few members to a set
  kv.sadd('set1', 'member1', 'member2', 'member3'); // Output: true
  // print the number of members in a set
  kv.scard('set1'); // Output: 3
  ```
</details>

<details>
  <summary><strong><code>sdiff</code></strong></summary>

  This method retrieves the members of a set that are present in the first set but not in any of the subsequent sets, and returns them as a new set.

  ```javascript
  // add a few members to a set
  kv.sadd('set1', 'member1', 'member2', 'member3'); // Output: true
  // add a few members to a second set
  kv.sadd('set2', 'member2', 'member3', 'member4'); // Output: true
  // print the members of the first set that are not in the second set
  kv.sdiff('set1', 'set2'); // Output: ['member1']
  ```
</details>

<details>
  <summary><strong><code>set</code></strong></summary>

  Set the string value of a key with optional NX/XX/GET/EX/PX/EXAT/PXAT/KEEPTTL, GET, and expiration options.

  ```javascript
  // Set a basic key-value pair
  kv.set('username', 'john_doe'); // Output: true

  // Set a key-value pair only if the key does not already exist (NX option)
  kv.set('username', 'jane_doe', {NX: true});

  // Set a key-value pair only if the key already exists (XX option)
  kv.set('email', 'jane@example.com', {XX: true});

  // Set a key-value pair with an expiration time in seconds (EX option)
  kv.set('session_token', 'abc123', {EX: 3600});

  // Get the existing value and set a new value for a key (GET option)
  kv.set('username', 'mary_smith', {GET: true});

  // Set a key-value pair with an expiration time in milliseconds (PX option)
  kv.set('temp_data', '42', {PX: 1000});

  // Set a key-value pair with an expiration time at a specific Unix timestamp in seconds (EXAT option)
  kv.set('event_data', 'event1', {EXAT: 1677649420});

  // Set a key-value pair with an expiration time at a specific Unix timestamp in milliseconds (PXAT option)
  kv.set('event_data2', 'event2', {PXAT: 1677649420000});

  // Set a key-value pair and keep the original TTL if the key already exists (KEEPTTL option)
  kv.set('username', 'alice_wonder', {KEEPTTL: true});

  // Set a key-value pair with multiple options (NX, EX, and GET options)
  kv.set('new_user', 'carol_baker', {NX: true, EX: 7200, GET: true});
  ```
</details>

<details>
  <summary><strong><code>sinter</code></strong></summary>

  This method retrieves the members that are present in all the sets provided as arguments, and returns them as a new set representing the intersection of those sets.

  ```javascript
  // add a few members to a set
  kv.sadd('set1', 'member1', 'member2', 'member3'); // Output: true
  // add a few members to a second set
  kv.sadd('set2', 'member2', 'member3', 'member4'); // Output: true
  // print the members that are present in both sets
  kv.sinter('set1', 'set2'); // Output: ['member2', 'member3']
  ```
</details>

<details>
  <summary><strong><code>sismember</code></strong></summary>

  This method determines if a given value is a member of a set.

  ```javascript
  // add a few members to a set
  kv.sadd('set1', 'member1', 'member2', 'member3'); // Output: true
  // check if a member is present in a set
  kv.sismember('set1', 'member1'); // Output: true
  // check if a member is not present in a set
  kv.sismember('set1', 'member4'); // Output: false
  ```
</details>

<details>
  <summary><strong><code>smove</code></strong></summary>

  This method moves a member from one set to another.

  ```javascript
  // add a few members to a set
  kv.sadd('set1', 'member1', 'member2', 'member3'); // Output: true
  // add a few members to a second set
  kv.sadd('set2', 'member4', 'member5', 'member6'); // Output: true
  // move a member from one set to another
  kv.smove('set1', 'set2', 'member1'); // Output: true
  // print the members of the first set
  kv.smembers('set1'); // Output: ['member2', 'member3']
  // print the members of the second set
  kv.smembers('set2'); // Output: ['member1', 'member4', 'member5', 'member6']
  ```
</details>

<details>
  <summary><strong><code>sort</code></strong></summary>

  Sort the elements in a list, set or sorted set.

  ```javascript
  // add a few members to a set
  kv.sadd('set1', 'member1', 'member2', 'member3'); // Output: true
  // sort the members of a set
  kv.sort('set1'); // Output: ['member1', 'member2', 'member3']

  // add a few members to a sorted set
  kv.zadd('zset1', 1, 'member1', 2, 'member2', 3, 'member3'); // Output: true
  // sort the members of a sorted set
  kv.sort('zset1'); // Output: ['member1', 'member2', 'member3']

  // add a few members to a list
  kv.rpush('list1', 'member1', 'member2', 'member3'); // Output: true
  // sort the members of a list
  kv.sort('list1'); // Output: ['member1', 'member2', 'member3']
  ```
</details>

<details>
  <summary><strong><code>smembers</code></strong></summary>

  This method retrieves all the members of the set value stored at key.

  ```javascript
  // add a few members to a set
  kv.sadd('set1', 'member1', 'member2', 'member3'); // Output: true
  // print the members of a set
  kv.smembers('set1'); // Output: ['member1', 'member2', 'member3']
  ```
</details>

<details>
  <summary><strong><code>spop</code></strong></summary>

  Removes and returns one or multiple random members from a set.

  ```javascript
  // add a few members to a set
  kv.sadd('set1', 'member1', 'member2', 'member3', ',member4', 'member5'); // Output: true
  // remove and return a random member from a set
  kv.spop('set1'); // Output: one of the members
  // remove and return a random member from a set
  kv.spop('set1', 2); // Output: two of the remaining members
  ```
</details>


<details>
  <summary><strong><code>ttl</code></strong></summary>

  ```javascript
  // Set key 'username' to 'heyputer' and set its expiration to 60 seconds
  kv.set('username', 'heyputer');
  kv.expire('username', 60);

  // Check the time-to-live of key 'username'
  kv.ttl('username'); // Returns 60
  ```
</details>

<details>
  <summary><strong><code>zadd</code></strong></summary>

  ```javascript
  // Add a new member 'Alice' with a score of 10 to the sorted set 'students'.
  kv.zadd('students', 10, 'Alice');

  // Add a new member 'Bob' with a score of 25 to the sorted set 'students'.
  kv.zadd('students', 25, 'Bob');

  // Since 'Bob' already exists in the sorted set 'students', his score is updated to 26.
  kv.zadd('students', 26, 'Bob');
  ```
</details>

<details>
  <summary><strong><code>zcard</code></strong></summary>

  ```javascript
  // Add two members to the sorted set 'students'.
  kv.zadd('students', 10, 'Alice');
  kv.zadd('students', 25, 'Bob');

  // Get the number of members in the sorted set 'students'.
  kv.zcard('students'); // Output: 2
  ```
</details>

<details>
  <summary><strong><code>zcount</code></strong></summary>

  ```javascript
  // Add three members to the sorted set 'students'.
  kv.zadd('students', 10, 'Alice');
  kv.zadd('students', 25, 'Bob');
  kv.zadd('students', 30, 'Carol');

  // Get the number of members in the sorted set 'students' with a score between 10 and 25.
  kv.zcount('students', 10, 25); // Output: 2
  ```
</details>

<details>
  <summary><strong><code>zincrby</code></strong></summary>

  ```javascript
  // Add two members to the sorted set 'students'.
  kv.zadd('students', 10, 'Alice');
  kv.zadd('students', 25, 'Bob');

  // Increment the score of member 'Alice' by 5.
  kv.zincrby('students', 5, 'Alice');

  // Get the score of member 'Alice'.
  kv.zscore('students', 'Alice'); // Output: 15
  ```
</details>

<details>
  <summary><strong><code>zrange</code></strong></summary>

  ```javascript
  // Add three members to the sorted set 'students'.
  kv.zadd('students', 10, 'Alice');
  kv.zadd('students', 25, 'Bob');
  kv.zadd('students', 30, 'Carol');

  // Get the members of the sorted set 'students' with a score between 10 and 25.
  kv.zrange('students', 10, 25); // Output: ['Alice', 'Bob']
  ```
</details>

<details>
  <summary><strong><code>zrangebyscore</code></strong></summary>

  ```javascript
  // Add three members to the sorted set 'students'.
  kv.zadd('students', 10, 'Alice');
  kv.zadd('students', 25, 'Bob');
  kv.zadd('students', 30, 'Carol');

  // Get the members of the sorted set 'students' with a score between 10 and 25.
  kv.zrangebyscore('students', 10, 25); // Output: ['Alice', 'Bob']
  ```
</details>

<details>
  <summary><strong><code>zrank</code></strong></summary>

  ```javascript
  // Add three members to the sorted set 'students'.
  kv.zadd('students', 10, 'Alice');
  kv.zadd('students', 25, 'Bob');
  kv.zadd('students', 30, 'Carol');

  // Get the rank of member 'Bob' in the sorted set 'students'.
  kv.zrank('students', 'Bob'); // Output: 1
  ```
</details>

<details>
  <summary><strong><code>zrem</code></strong></summary>

  ```javascript
  // Add three members to the sorted set 'students'.
  kv.zadd('students', 10, 'Alice');
  kv.zadd('students', 25, 'Bob');
  kv.zadd('students', 30, 'Carol');

  // Remove member 'Bob' from the sorted set 'students'.
  kv.zrem('students', 'Bob');

  // Get the members of the sorted set 'students'.
  kv.zrange('students', 0, -1); // Output: [ [ 'Alice', 10 ], [ 'Carol', 30 ] ]
  ```
</details>

## License
Distributed under the MIT License. See `LICENSE.txt` for more information.

