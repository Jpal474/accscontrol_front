// The browser uses the Angular origin; only this local server contacts Nest.
const target = process.env.BACKEND_URL || 'http://127.0.0.1:3000';

module.exports = {
  '^/api(?:/|$)': {
    target,
    changeOrigin: true,
    pathRewrite: { '^/api(?=/|$)': '' },
  },
  '^/uploads(?:/|$)': {
    target,
    changeOrigin: true,
  },
};
