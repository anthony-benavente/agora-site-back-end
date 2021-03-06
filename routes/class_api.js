var express = require('express');
var password = require('password-hash-and-salt');
var jwt = require('jsonwebtoken');
var base64url = require('base64-url');
var jwt_secret = ';IHRLAEJ23!o!:@e|oids/';

module.exports = function(connection) {
    var router = express.Router();

    function writeErr(res, err) {
        res.json({ type: false, data: 'Error occurred: ' + err });
    }

    function ensureAuthorized(req, res, next) {
        var bearerToken;
        var bearerHeader = req.headers.authorization;
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
        return req.headers.authorization.split(' ')[1];
    }

    function getUserId(token) {
        var output = token.split('.')[1].replace('-', '+').replace('_', '/');
        switch (output.length % 4) {
            case 0:
                break;
            case 2:
                output += '==';
                break;
            case 3:
                output += '=';
                break;
            default:
                throw 'Illegal base64url string';
        }
        console.log(base64url.decode(output));
        return JSON.parse(base64url.decode(output));
    }

    router.get('/', function(req, res) {
        var userId = getUserId(getToken(req)).userId;
        console.log(userId);
        connection.query('SELECT * FROM class WHERE professorId = ?', [userId], function(err, rows, fields) {
            if (!err) {
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
        var sql = ' INSERT INTO class (className, programId, courseCode, semester, year, professorId)'  +
                  ' VALUES (?, ?, ?, ?, ?, ?)';
        var postVars = [
            req.body.className,
            req.body.programId,
            req.body.courseCode,
            req.body.semester,
            req.body.year,
            req.body.professorId
        ];

        connection.query(sql, postVars, function(err, rows, fields) {
            if (err) {
                res.json({ type: false, data: 'Error occured: ' + err });
            } else {
                res.json({ type: true, msg: 'Inserted records successfully', data: postVars });
            }
        });
    });

    router.get('/:classId', function(req, res, next) {
        var sql = 'SELECT * FROM class WHERE classId = ?';
        connection.query(sql, [req.params.classId], function(err, rows, fields) {
            if (err) {
                writeErr(res, err);
            } else {
                res.json({ type: true, data: rows[0] });
            }
        });
    });

    router.put('/:classId', ensureAuthorized, function(req, res, next) {
        connection.query('SELECT className, programId, courseCode, semester, year, professorId FROM class WHERE classId = ?', [req.params.classId], function(err, rows, fields) {
            if (err) {
                writeErr(res, err);
            } else {
                connection.query('SELECT userId FROM User WHERE userId = ?', [getToken(req)], function(err, rows2, fields) {
                    if (err || getToken(req) != rows[0][5]) {
                        writeErr(res, 'Cannot access resource');
                    } else {
                        var sql = 'UPDATE class SET className=?,programId=?,courseCode=?,semester=?,year=? WHERE classId = ?';
                        var defaultVars = {
                            className: rows[0][0],
                            programId: rows[0][1],
                            semester: rows[0][2],
                            year: rows[0][3],
                            courseCode: rows[0][4]
                        }.extend(req.body);
                        var postVars = [
                            defaultVars.className,
                            defaultVars.programId,
                            defaultVars.courseCode,
                            defaultVars.semester,
                            defaultVars.year,
                            req.params.classId
                        ];

                        connection.query(sql, postVars, function(err, rows, fields) {
                            if (err) {
                                writeErr(res, err);
                            } else {
                                res.json({ type: true, msg: 'Updated row successfully', data: defaultVars });
                            }
                        });
                    }
                });
            }
        });
    });

    return router;
};
