var express = require('express');
var password = require('password-hash-and-salt');
var jwt = require('jsonwebtoken');
var jwt_secret = ';IHRLAEJ23!o!:@e|oids/';

module.exports = function(connection) {
    var router = express.Router();

    function writeErr(res, err) {
        res.json({ type: false, data: 'Error occurred: ' + err });
    }

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

    function getToken(req) {
        return req.headers['authorization'].split(' ')[1];
    }

    router.get('/', function(req, res) {
        connection.query('SELECT * FROM Program', function(err, rows, fields) {
            if (!err && rows.length > 0) {
                res.json({
                    type: true,
                    data: rows
                });
            } else {
                res.json({
                    type: false,
                    data: 'Error accessing this resource'
                });
            }
        });
    });

    router.post('/', ensureAuthorized, function(req, res, next) {
        var sql = ' INSERT INTO Program (shortCode, programName)'  +
                  ' VALUES (?, ?)';
        var postVars = [
            req.body.shortCode,
            req.body.programName
        ];

        connection.query(sql, postVars, function(err, rows, fields) {
            if (err) {
                res.json({ type: false, data: 'Error occured: ' + err });
            } else {
                res.json({ type: true, msg: 'Inserted records successfully', data: postVars })
            }
        })
    });

    router.get('/:programId', function(req, res, next) {
        var sql = 'SELECT * FROM Program WHERE programId = ?';
        connection.query(sql, [req.params.programId], function(err, rows, fields) {
            if (err) {
                writeErr(res, err);
            } else {
                res.json({ type: true, data: rows[0] })
            }
        });
    });

    router.put('/:programId', ensureAuthorized, function(req, res, next) {
        connection.query('SELECT shortCode, programName FROM Program WHERE programId = ?', [req.params.classId], function(err, rows, fields) {
            if (err) {
                writeErr(res, err);
            } else {
                var sql = 'UPDATE Program SET shortCode=?, programName=? WHERE programId = ?';
                var defaultVars = {
                    shortCode: rows[0][0],
                    programName: rows[0][1]
                }.extend(req.body);
                var postVars = [
                    defaultVars.shortCode,
                    defaultVars.programName,
                    req.params.programId
                ];

                connection.query(sql, postVars, function(err, rows, fields) {
                    if (err) {
                        writeErr(res, err);
                    } else {
                        res.json({ type: true, msg: 'Updated row successfully', data: defaultVars });
                    }
                });
            }
        })
    });

    return router;
};
