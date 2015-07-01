var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var jwt = require('jsonwebtoken');
var password = require('password-hash-and-salt');
var fs = require('fs');
var connectionInfo = JSON.parse(fs.readFileSync('connection.json'));
var connection = mysql.createConnection(connectionInfo);
var app = express();

connection.connect(function(err) {
    if (!err) {
        console.log('Database connected...\n');
    } else {
        console.log('Failed to connect to database...\n');
    }
});

var userApi = require('./routes/user_api')(connection);
var classApi = require('./routes/class_api')(connection);

Object.prototype.extend = function(other) {
    for (var i in other) {
        if (typeof other[i] != 'function'){
            this[i] = other[i];
        }
    }
    return this;
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
    next();
});
app.use('/api/users', userApi);
app.use('/api/classes', classApi);

var server = app.listen(3000, function() {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Example app listening at http://%s:%s', host, port);
});
