const cacheOkAndNotFound = statusCode => statusCode >= 200 && statusCode < 300 || statusCode === 404;

module.exports = ({ host, port, logger = require("./defaultLogger"), shouldCache = cacheOkAndNotFound, expiresAfterSeconds } = {}) => {
  
  let redisClient;
  let cache;

  try {

    if (!redisClient) {
      redisClient = require("./redis")({ port, host, logger });
      cache = require("./httpCache")({ redisClient });
    }

  } catch (error) {
    logger.warn(`Express-Redis-Cache: Cache unavailable: Make sure redis is accessible at ${host}:${port}`);
  }
  
  return async (req, res, next) => {

    if (!cache || !redisClient || !redisClient.connected) {
      logger.error(`Express-Redis-Cache: Cache unavailable: Not connected GET ${req.originalUrl}`);
      res.header("Cache-Status", "unavailable");
      return next();
    }

    if (req.method === "OPTIONS") {
      logger.debug(`Express-Redis-Cache: OPTIONS: ${req.originalUrl}`);
      return next();
    }

    if (req.header("no-cache") === "yes") {
      logger.debug(`Express-Redis-Cache: No-cache GET: ${req.originalUrl} Client requested to not get cached data`);
      res.header("Cache-Status", "bypassed");
      return next();
    }

    const url = req.originalUrl;

    try {

      const cachedData = await cache.get(url);

      if (cachedData) {

        try {
          
          logger.debug(`Express-Redis-Cache: GET from cache: ${req.originalUrl}`);
          
          const headers = cachedData.headers;
          
          res.header(headers);
          res.header("Cache-Status", "hit");
          
          res.status(cachedData.status).end(cachedData.body);

        } catch (error) {
          logger.error(`Express-Redis-Cache: Unable to retrieve element from cache: ${error}`);
          res.header(headers);
          res.header("Cache-Status", "error");
          res.status(500).end();
        }

        return;

      }

      logger.debug(`Express-Redis-Cache: GET to cache: ${req.originalUrl}`);

      res.header("Cache-Status", "missed");

      res.originalEnd = res.end;
    
      res.end = function(data, encoding, callback) {

        if (shouldCache(res.statusCode)) {

          try {
            cache.add({ url, "headers": res._headers, "status": res.statusCode, "body": data, expiresAfterSeconds });
          } catch (error) {
            logger.error(`Express-Redis-Cache: Add to cache error: ${error}`);
          }
           
        }
    
        res.originalEnd(data, encoding, callback);

      };
      
      return next();

    } catch(error) {
      logger.error(`Express-Redis-Cache: Unexpeted Error: ${error.message}`);
      //continue to next middleware to not break due to an error on the cache
      res.header("Cache-Status", "unavailable");
      next();
    }

  };

};