var dotenv = require('dotenv').config();

const config = {
    PORT: process.env.PORT,
    MONGODB_URI: process.env.MONGODB_URI,
    SESSION_SECRET: process.env.SESSION_SECRET,
    SENDGRID_USER: process.env.SENDGRID_USER,
    SENDGRID_PASSWORD: process.env.SENDGRID_PASSWORD,
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_PASSWORD: process.env.GMAIL_PASSWORD,
    SES_USER: process.env.SES_USER,
    SES_PASSWORD: process.env.SES_PASSWORD
}

module.exports = config;
