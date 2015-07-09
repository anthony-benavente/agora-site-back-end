var express = require('express');
var password = require('password-hash-and-salt');
var jwt = require('jsonwebtoken');
var jwt_secret = ';IHRLAEJ23!o!:@e|oids/';

module.exports = function(connection) {
    var router = express.Router();

    function ensureAuthorized(req, res, next) {
        var bearerToken;
        var bearerHeader = req.headers["authorization"];
        if (typeof bearerHeader !== 'undefined') {
            var bearer = bearerHeader.split(" ");
            bearerToken = bearer[1];
            req.token = bearerToken;
            next();
        } else {
            res.send(403);
        }
    }

    router.post('/signin', function(req, res, next) {
        var authHandler = function(err, rows, fields) {
            if (err) {
                res.json({
                    type: false,
                    data: 'Error occurred: ' + err
                });
            } else {
                if (rows.length > 0) {
                    password(req.body.password).verifyAgainst(rows[0].password,
                        function(err, verified) {
                            if (verified) {
                                res.json({
                                    type: true,
                                    data: rows[0],
                                    token: rows[0].token
                                });
                            } else {
                                res.json({
                                    type: false,
                                    data: 'Incorrect email/password'
                                });
                            }
                        });
                } else {
                    res.json({
                        type: false,
                        data: 'Incorrect email/password'
                    });
                }
            }
        };

        connection.query('SELECT * FROM User WHERE username = ?', [req.body.username], authHandler);
    });

    router.post('/register', function(req, res) {
        password(req.body.password).hash(function(err, hash) {
            var newUser = {
                name: req.body.name,
                username: req.body.username,
                password: hash,
                email: req.body.email
            };
            newUser.token = jwt.sign(newUser, jwt_secret);
            var sql = 'INSERT INTO User (name, email, username, password) VALUES (?,?,?,?)';
            var postVars = [
                newUser.name, newUser.email, newUser.username, newUser.password
            ];
            connection.query(sql, postVars, function(err, result) {
                if (!err) {
                    var updateSql = 'UPDATE User SET token=? WHERE userId=?';
                    newUser.userId = result.insertId;
                    var newToken = jwt.sign(newUser, jwt_secret);
                    newUser.token = newToken;
                    connection.query(updateSql, [newToken, result.insertId], function(err) {
                        if (!err) {
                            res.json({
                                type: true,
                                data: newUser,
                                token: newUser.token
                            });
                        } else {
                            console.log(err);
                            res.json({ type: false, data: 'Failed to create user' });
                        }
                    })
                } else {
                    console.log(err);
                    res.json({
                        type: false,
                        data: 'Failed to insert user'
                    });
                }
            });
        });
    });

    router.get('/me', ensureAuthorized, function(req, res) {
        connection.query('SELECT * FROM User WHERE token=?', req.token, function(err, rows, fields) {
            if (!err && rows.length > 0) {
                res.json({
                    type: true,
                    data: rows[0]
                });
            } else {
                res.json({
                    type: false,
                    data: 'Error accessing this resource'
                });
            }
        });
    });

    return router;
};
