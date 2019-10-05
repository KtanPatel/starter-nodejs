const jwt = require('jsonwebtoken');
const passport = require("passport");
const User = require('../models/user');

/* POST login. */
exports.login = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        try {
            if (err) { return next(err); }
            if (!user) {
                throw new Error(info.msg);
            }
            req.logIn(user, (err) => {
                if (err) { return next(err); }
                const userData = { ...user.toObject() };
                delete userData.password;
                // const token = jwt.sign({ _id: userData._id, profile: userData.profile, email: userData.email }, 'your_jwt_secret');
                return res.status(200).json({
                    success: true, message: 'Success! You are logged in.'
                    // , data: { token }
                });
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

    })(req, res, next);
};

/**
 * GET /logout
 */
exports.logout = (req, res) => {
    try {
        req.logout();
        req.session.destroy((err) => {
            if (err) console.log('Error : Failed to destroy the session during logout.', err);
            req.user = null;
        });
        return res.status(200).json({ success: true, message: 'logged out successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /signup
 * Create a new local account.
 */
exports.signup = (req, res, next) => {
    try {
        const user = new User({
            email: req.body.email,
            password: req.body.password
        });
        User.findOne({ email: req.body.email }, (err, existingUser) => {
            if (err) { return next(err); }
            if (existingUser) {
                return res.status(500).json({ success: false, message: 'Account with that email address already exists.' });
            }
            user.save((err) => {
                if (err) { return next(err); }
                req.logIn(user, (err) => {
                    if (err) {
                        return next(err);
                    }
                    return res.status(200).json({ success: true, message: 'user register successfully' });
                });
            });
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


