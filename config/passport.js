const passport = require('passport');
const passportJWT = require("passport-jwt");
const jwt = require('jsonwebtoken');
const ExtractJWT = passportJWT.ExtractJwt;

const LocalStrategy = require('passport-local').Strategy;
const JWTStrategy = passportJWT.Strategy;

const config = require('./../config');
var cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

const User = require('../models/user');

exports.initialize = (app) => {
    app.use(cookieParser(config.SESSION_SECRET));
    app.use(session({
        resave: true,
        saveUninitialized: true,
        secret: config.SESSION_SECRET,
        cookie: { maxAge: 1209600000 }, // two weeks in milliseconds
        store: new MongoStore({
            url: config.MONGODB_URI,
            autoReconnect: true,
        })
    }));
    app.use(passport.initialize());
    app.use(passport.session());
}

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});

/**
 * Sign in using Email and Password.
 */
passport.use(new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, (email, password, done) => {
    User.findOne({ email: email.toLowerCase() }, (err, user) => {
        if (err) { return done(err); }
        if (!user) {
            return done(null, false, { msg: `We are not aware of this user.` });
        }
        if (!user.password) {
            return done(null, false, { msg: 'Your account was registered using a sign-in provider. To enable password login, sign in using a provider, and then set a password under your user profile.' });
        }
        user.comparePassword(password, (err, isMatch) => {
            if (err) { return done(err); }
            if (isMatch) {
                return done(null, user);
            }
            return done(null, false, { msg: 'Invalid email or password.' });
        });
    }).select('+password');
}));

passport.use(new JWTStrategy({
    jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
    secretOrKey: 'your_jwt_secret'
},
    function (jwtPayload, cb) {

        //find the user in db if needed
        return User.findOneById(jwtPayload.id)
            .then(user => {
                return cb(null, user);
            })
            .catch(err => {
                return cb(err);
            });
    }
));

/**
 * Login Required middleware.
 */
exports.isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(403).send({ success: false, message: 'Authentication failed' });
};

/**
 * Authorization Required middleware.
 */
exports.isAuthorized = (req, res, next) => {
    const provider = req.path.split('/')[2];
    const token = req.user.tokens.find((token) => token.kind === provider);
    if (token) {
        // Is there an access token expiration and access token expired?
        // Yes: Is there a refresh token?
        //     Yes: Does it have expiration and if so is it expired?
        //       Yes, Quickbooks - We got nothing, redirect to res.redirect(`/auth/${provider}`);
        //       No, Quickbooks and Google- refresh token and save, and then go to next();
        //    No:  Treat it like we got nothing, redirect to res.redirect(`/auth/${provider}`);
        // No: we are good, go to next():
        if (token.accessTokenExpires && moment(token.accessTokenExpires).isBefore(moment().subtract(1, 'minutes'))) {
            if (token.refreshToken) {
                if (token.refreshTokenExpires && moment(token.refreshTokenExpires).isBefore(moment().subtract(1, 'minutes'))) {
                    res.redirect(`/auth/${provider}`);
                } else {
                    refresh.requestNewAccessToken(`${provider}`, token.refreshToken, (err, accessToken, refreshToken, params) => {
                        User.findById(req.user.id, (err, user) => {
                            user.tokens.some((tokenObject) => {
                                if (tokenObject.kind === provider) {
                                    tokenObject.accessToken = accessToken;
                                    if (params.expires_in) tokenObject.accessTokenExpires = moment().add(params.expires_in, 'seconds').format();
                                    return true;
                                }
                                return false;
                            });
                            req.user = user;
                            user.markModified('tokens');
                            user.save((err) => {
                                if (err) console.log(err);
                                next();
                            });
                        });
                    });
                }
            } else {
                res.redirect(`/auth/${provider}`);
            }
        } else {
            next();
        }
    } else {
        res.redirect(`/auth/${provider}`);
    }
};
