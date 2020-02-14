const Redis = require("async-redis");
const defaultLogger = require("./defaultLogger");

module.exports = ({ port = 6379, host = "127.0.0.1", logger = defaultLogger }) => {
  
  const redisClient = Redis.createClient(port, host, {
    "retry_strategy": ({ attempt, error }) => {

      logger.debug(`Express-Redis-Cache: Reconnecting: ${error && error.code}`);

      return Math.min(attempt * 100, 3000);

    }
  });

  redisClient.on("error", function(error) {
    logger.warn(`Express-Redis-Cache: Unavailable: ${error.message}`);
  });

  redisClient.on("ready", function() {
    logger.info(`Express-Redis-Cache: Ready: ${host}:${port}`);
  });

  redisClient.on("reconnecting", () => {
    logger.warn("Express-Redis-Cache: Reconnecting");
  });

  return redisClient;

};