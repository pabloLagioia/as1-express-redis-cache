module.exports = ({ redisClient }) =>  {

  const add = ({ url, headers, status, body = "", expiresAfterSeconds }) => {

    let stringifiedBody = body;

    if (typeof body !== "string") {
      stringifiedBody = body.toString();
    }

    let transaction = redisClient
      .multi()
      .hset(url, "headers", JSON.stringify(headers))
      .hset(url, "status", status)
      .hset(url, "body", stringifiedBody);

    if (expiresAfterSeconds) {
      transaction = transaction.expire(url, expiresAfterSeconds);
    }

    transaction.exec();

  };

  const get = async (url) => {

    if (await redisClient.hlen(url) === 0) {
      return;
    }

    const { headers, status, body } = await redisClient.hgetall(url);

    return {
      "headers": JSON.parse(headers),
      "status": parseInt(status),
      body //return it as string for convenience as the http response body is going to be a string 
    };

  };

  return {
    get,
    add
  };

};