var envs = {
  dev: {
    baseUrl: ''
  },
  prod: {
    baseUrl: 'http://coloredsyntax.com'
  }
}

module.exports = function(args) {
  if (args[1] && envs[args[1]]) {
    return envs[args[1]];
  }
  return envs.dev;
};