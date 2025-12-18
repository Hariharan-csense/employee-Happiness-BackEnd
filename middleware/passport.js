const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
//require('dotenv').config();

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'secret'
};

passport.use(
  new JwtStrategy(opts, (jwt_payload, done) => {
    if (jwt_payload.role === 'admin') {
      return done(null, { id: jwt_payload.id, role: 'admin' });
    } else if (jwt_payload.role === 'employee') {
      return done(null, { id: jwt_payload.id, role: 'employee' });
    } else {
      return done(null, false);
    }
  })
);

module.exports = passport;
