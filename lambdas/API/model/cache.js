const DEFAULTS = {
  /**
   * Max time in milliseconds the cache is valid. After that the first call will reload the cache.
   * Example: cache for 1 minute:
   * cachePromise(target, { maxTtlMs: 60000 })
   */
  maxTtlMs: Number.POSITIVE_INFINITY,
};
/**
 * Returns a new promise (actually a proxy acting just like the target promise) that will create and use a local cache.
 * Usage:
 *  Replace something like
 *      myPromise(args).then(....)
 *  with:
 *      //init globally
 *      const myCachedPromise = cachePromise(myPromise);
 *      ...
 *      myCachedPromise(args).then(....)
 *
 * Note: cachePromise(myPromise)(args) is pointless, because it will create a new empty cache every time.
 *
 * @param {Promise} target a promise to wrap and cache the results
 * @param {Object} options caching options
 * @returns {Promise} a new promise that will check the cache first
 */
const cachePromise = (target, options) => {
  const settings = {
    ...DEFAULTS,
    ...options,
  };
  const cache = {};
  return new Proxy(target, {
    apply: (callback, thisArg, argumentsList) => {
      const key = JSON.stringify(argumentsList.filter(a => !a['connectionParameters']).concat(target['name'] ? target['name'] : ''));
      console.log("Return from cache");
      const cachedEntry = cache[key];
      if (cachedEntry && !cachedEntry.isExpired()) {
        console.log("key: ", key);
        return Promise.resolve(cachedEntry.getData());
      }
      return callback(...argumentsList)
      .then(value => {
        console.log("Return new value");
        cache[key] = new CacheEntry(value, settings.maxTtlMs);
        return value;
      });
    },
  });
};

class CacheEntry {
  constructor(data, ttl) {
    this.creationTimestamp = Date.now();
    this.ttl = ttl;
    this.data = data;
  }

  isExpired() {
    return Date.now() - this.creationTimestamp > this.ttl;
  }

  getData() {
    return this.data;
  }
}

module.exports = {
  cachePromise,
};