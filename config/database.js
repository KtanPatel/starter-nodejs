
const mongoose = require('mongoose');
const config = require('./../config')
/**
 * Connect to MongoDB.
 */

const dbOptions = {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
    reconnectInterval: 500, // Reconnect every 500ms
    poolSize: 10, // Maintain up to 10 socket connections
    // If not connected, return errors immediately rather than waiting for reconnect
    bufferMaxEntries: 0,
    connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    socketTimeoutMS: 45000 // Close sockets after 45 seconds of inactivity
};

mongoose.connect(
    `${config.MONGODB_URI}`,
    dbOptions
);

const db = mongoose.connection;

db.on("connected", () => {
    console.log("Database Connected");
});
db.on("disconnected", () => {
    console.log("Database Disconnected");
});
db.on("error", err => {
    console.error(err);
    console.log('%s MongoDB connection error. Please make sure MongoDB is running.', '✗');
    process.exit();
});

process.on("SIGINT", () => {
    db.close(() => {
        console.log(
            "Mongoose default connection is disconnected due to application termination"
        );
        process.exit(0);
    });
});
