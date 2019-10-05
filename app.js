var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');

var apiRoutes = require('./routes');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// database connection
var mongoConnection = require('./config/database');

// passport config
var passportInit = require('./config/passport').initialize(app);
var passportConfig = require('./config/passport');

// Routes 
app.use('/api', apiRoutes);
app.use('/', (req, res, next) => {
  res.render('index', { title: 'Starter NodeJS + Express' });
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
