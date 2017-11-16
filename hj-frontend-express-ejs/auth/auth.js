// credentials for frontend server (for public requests to backend)
var serverAuth = {
  client_id: process.env.AUTH0_SERVER_CLIENT_ID,
  client_secret: process.env.AUTH0_SERVER_CLIENT_SECRET,
  grant_type: 'client_credentials',
  audience: process.env.AUTH0_SERVER_AUDIENCE
}

module.exports = {serverAuth};
