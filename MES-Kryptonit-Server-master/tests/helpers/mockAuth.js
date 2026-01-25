const { primaryUser } = require('../fixtures/users');

const authMiddleware = (req, res, next) => {
  req.user = primaryUser;
  next();
};

const syncUserMiddleware = (req, res, next) => next();

const allowAbility = () => (req, res, next) => next();

module.exports = {
  authMiddleware,
  syncUserMiddleware,
  allowAbility,
};
