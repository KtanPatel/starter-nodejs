
const User = require('../models/user');
const { promisify } = require('util');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const config = require('./../config')
const randomBytesAsync = promisify(crypto.randomBytes);

/* Get Account. */
exports.getAccount = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.session.passport.user._id }).lean();
        res.status(200).json({
            success: true, message: 'Account Details Fetched succssfully', data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false, message: error.message
        });
    }
}


/* POST Account. */
exports.postUpdateAccount = async (req, res, next) => {
    try {
        console.log('\n >>>>> : req.user', ' ===>', req.user);
        User.findById(req.user._id, (err, user) => {
            if (err) { return next(err); }
            if (user.email !== req.body.email) user.emailVerified = false;
            user.email = req.body.email || '';
            user.profile.name = req.body.name || '';
            user.profile.gender = req.body.gender || '';
            user.profile.location = req.body.location || '';
            user.profile.website = req.body.website || '';
            user.save((err) => {
                if (err) {
                    if (err.code === 11000) {
                        res.status(500).json({
                            success: false, message: 'The email address you have entered is already associated with an account.'
                        });
                    }
                    return next(err);
                }
                res.status(200).json({
                    success: true, message: 'Profile information has been updated.'
                });
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false, message: error.message
        });
    }
}

/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = (req, res, next) => {
    try {
        if (req.body.password.length < 8) {
            return res.status(500).json({ success: false, message: 'Password must be at least 8 characters long' });
        }
        User.findById(req.user._id, (err, user) => {
            if (err) { return next(err); }
            user.password = req.body.password;
            user.save((err) => {
                if (err) { return next(err); }
                return res.status(200).json({ success: true, message: 'Password has been changed.' });
            });
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = (req, res, next) => {
    try {
        User.deleteOne({ _id: req.user._id }, (err) => {
            if (err) { return next(err); }
            req.logout();
            return res.status(200).json({ success: true, message: 'Your account has been deleted.' });
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


/**
 * GET /account/verify
 * Verify email address
 */
exports.getVerifyEmail = (req, res, next) => {
    try {
        const createRandomToken = randomBytesAsync(16)
            .then((buf) => buf.toString('hex'));

        const setRandomToken = (token) => {
            User
                .findOne({ email: req.user.email })
                .then((user) => {
                    user.emailVerificationToken = token;
                    user = user.save();
                });
            return token;
        };

        const sendVerifyEmail = (token) => {
            // GMail 
            let transporter = nodemailer.createTransport({
                service: "gmail",
                auth: { user: config.GMAIL_USER, pass: config.GMAIL_PASSWORD }
            });
            const mailOptions = {
                to: req.user.email,
                from: 'info@starter.com',
                subject: 'Please verify your email address on Starter NodeJS',
                text: `Thank you for registering with starter-nodejs.\n\n
        This verify your email address please click on the following link, or paste this into your browser:\n\n
        http://${req.headers.host}/account/verify/${token}\n\n
        \n\n
        Thank you!`
            };
            return transporter.sendMail(mailOptions)
                .then(() => {
                    res.status(200).json({ success: true, message: `An e-mail has been sent to ${req.user.email} with further instructions.` });
                })
                .catch((err) => {
                    if (err.message === 'self signed certificate in certificate chain') {
                        console.log('WARNING: Self signed certificate in certificate chain. Retrying with the self signed certificate. Use a valid certificate if in production.');
                        transporter = nodemailer.createTransport({
                            service: "gmail",
                            auth: { user: config.GMAIL_USER, pass: config.GMAIL_PASSWORD },
                            tls: {
                                rejectUnauthorized: false
                            }
                        });
                        return transporter.sendMail(mailOptions)
                            .then(() => {
                                res.status(200).json({ success: true, message: `An e-mail has been sent to ${req.user.email} with further instructions.` });
                            });
                    }
                    console.log('ERROR: Could not send verifyEmail email after security downgrade.\n', err);
                    res.status(500).send({ success: false, message: 'Error sending the password reset message.Please try again shortly.' });
                    return err;
                });
        };

        createRandomToken
            .then(setRandomToken)
            .then(sendVerifyEmail)
            .catch(next);
    } catch (error) {

    }
}

/**
 * GET /account/verify/:token
 * Verify email address
 */
exports.getVerifyEmailToken = (req, res, next) => {
    try {
        console.log('\n >>>>> : ', 'req.params.token ===>', req.params.token);
        console.log('\n >>>>> : ', 'req.user.emailVerificationToken ===>', req.user);
        if (req.params.token === req.user.emailVerificationToken) {
            User
                .findOne({ email: req.user.email })
                .then((user) => {
                    if (!user) {
                        return res.status(500).send({ success: false, message: 'There was an error in loading your profile.' });
                    }
                    user.emailVerificationToken = '';
                    user.emailVerified = true;
                    user = user.save();
                    return res.status(200).json({ success: true, message: 'Thank you for verifying your email address.' });
                })
                .catch((error) => {
                    console.log('Error saving the user profile to the database after email verification', error);
                    return res.status(500).send({ success: false, message: 'There was an error when updating your profile.  Please try again later.' })
                });
        } else {
            return res.status(500).send({ success: false, message: 'Invalid token. Please try again.' });
        }
    } catch (error) {
        return res.status(500).send({ success: false, message: error.message });
    }

}

/**
 * POST /account/forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = (req, res, next) => {
    try {

        const createRandomToken = randomBytesAsync(16)
            .then((buf) => buf.toString('hex'));

        const setRandomToken = (token) =>
            User
                .findOne({ email: req.body.email })
                .then((user) => {
                    if (!user) {
                        res.status(500).send({ success: false, message: 'Account with that email address does not exist.' });
                    } else {
                        user.passwordResetToken = token;
                        user.passwordResetExpires = Date.now() + 3600000; // 1 hour
                        user = user.save();
                    }
                    return user;
                });

        const sendForgotPasswordEmail = (user) => {
            if (!user) { return; }
            const token = user.passwordResetToken;

            // // SendGrid
            // let transporter = nodemailer.createTransport({
            //     service: 'SendGrid',
            //     auth: {
            //         user: process.env.SENDGRID_USER,
            //         pass: process.env.SENDGRID_PASSWORD
            //     }
            // });

            // GMail 
            let transporter = nodemailer.createTransport({
                service: "gmail",
                auth: { user: config.GMAIL_USER, pass: config.GMAIL_PASSWORD }
            });

            // // Amazon SES
            // nodemailer.createTransport(
            //     smtpTransport({
            //         port: 465,
            //         host: "email-smtp.us-east-1.amazonaws.com",
            //         secure: true,
            //         auth: { user: config.SES_USER, pass: config.SES_PASSWORD },
            //         tls: { rejectUnauthorized: false },
            //         debug: true
            //     })
            // );

            const mailOptions = {
                to: user.email,
                from: 'info@starter.com',
                subject: 'Reset your password on Starter NodeJS',
                text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
        Please click on the following link, or paste this into your browser to complete the process:\n\n
        http://${req.headers.host}/reset/${token}\n\n
        If you did not request this, please ignore this email and your password will remain unchanged.\n`
            };
            return transporter.sendMail(mailOptions)
                .then(() => {
                    res.status(200).json({ success: true, message: `An e-mail has been sent to ${user.email} with further instructions.` });
                })
                .catch((err) => {
                    if (err.message === 'self signed certificate in certificate chain') {
                        console.log('WARNING: Self signed certificate in certificate chain. Retrying with the self signed certificate. Use a valid certificate if in production.');
                        transporter = nodemailer.createTransport(
                            smtpTransport({
                                service: "gmail",
                                auth: { user: config.MAIL_USER, pass: config.MAIL_PASS },
                                tls: { rejectUnauthorized: false }
                            })
                        );
                        return transporter.sendMail(mailOptions)
                            .then(() => {
                                res.status(200).json({ success: true, message: `An e-mail has been sent to ${user.email} with further instructions.` });
                            });
                    }
                    console.log('ERROR: Could not send forgot password email after security downgrade.\n', err);
                    res.status(500).send({ success: false, message: 'Error sending the password reset message.Please try again shortly.' });
                    return err;
                });
        };

        createRandomToken
            .then(setRandomToken)
            .then(sendForgotPasswordEmail)
            .catch(next);

    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
}

/**
 * POST /reset/:token
 * Process the reset password request.
 */
exports.postReset = (req, res, next) => {
    try {
        const resetPassword = () =>
            User
                .findOne({ passwordResetToken: req.params.token })
                .where('passwordResetExpires').gt(Date.now())
                .then((user) => {
                    if (!user) {
                        res.status(500).send({ success: false, message: 'Password reset token is invalid or has expired.' });
                    }
                    user.password = req.body.password;
                    user.passwordResetToken = undefined;
                    user.passwordResetExpires = undefined;
                    return user.save().then(() => new Promise((resolve, reject) => {
                        req.logIn(user, (err) => {
                            if (err) { return reject(err); }
                            resolve(user);
                        });
                    }));
                });

        const sendResetPasswordEmail = (user) => {
            if (!user) { return; }
            // GMail 
            let transporter = nodemailer.createTransport({
                service: "gmail",
                auth: { user: config.GMAIL_USER, pass: config.GMAIL_PASSWORD }
            });
            const mailOptions = {
                to: user.email,
                from: 'info@starter.com',
                subject: 'Your Starter NodeJS password has been changed',
                text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
            };
            return transporter.sendMail(mailOptions)
                .then(() => {
                    res.status(200).json({ success: true, message: 'Success! Your password has been changed.' })
                })
                .catch((err) => {
                    if (err.message === 'self signed certificate in certificate chain') {
                        console.log('WARNING: Self signed certificate in certificate chain. Retrying with the self signed certificate. Use a valid certificate if in production.');
                        transporter = nodemailer.createTransport({
                            service: "gmail",
                            auth: { user: config.GMAIL_USER, pass: config.GMAIL_PASSWORD },
                            tls: {
                                rejectUnauthorized: false
                            }
                        });
                        return transporter.sendMail(mailOptions)
                            .then(() => {
                                res.status(200).json({ success: true, message: 'Success! Your password has been changed.' })
                            });
                    }
                    console.log('ERROR: Could not send password reset confirmation email after security downgrade.\n', err);
                    res.status(500).send({ success: false, message: 'Your password has been changed, however we were unable to send you a confirmation email. We will be looking into it shortly.' })
                    return err;
                });
        };

        resetPassword()
            .then(sendResetPasswordEmail)
            // .then(() => { if (!res.finished) res.redirect('/'); })
            .catch((err) => next(err));

    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
}
