module.exports = {
  warn: text => {
    console.warn(text);
  },
  info: text => {
    console.log(text);
  },
  debug: text => {
    console.log(text);
  },
  error: text => {
    console.error(text);
  }
};