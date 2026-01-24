const { auth } = require('express-oauth2-jwt-bearer');

const checkJwt = auth({
  audience: 'account',
  issuerBaseURL: 'http://keycloak.local/realms/MES-Realm', // Minikube address
  tokenSigningAlg: 'RS256'
});

module.exports = checkJwt;