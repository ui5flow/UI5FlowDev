const express = require('express');
const path = require('path');
const opn = require('opn');
const config = require('./config/config.js');     
const serverConfig = require("../conf/config.json");

var cnsColors = {
    reset: '\x1b[0m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    default: '\x1b[37m',
    emphasize: '\x1b[1m'
}


var ui5server = {
    start: function() {

        try {
            var app = express();
            config.set(app).then(function() {
                var port = serverConfig.port;
                app.listen(port);              
                opn('http://localhost:' + port + '/');
                console.log(cnsColors.success, 'UI5FlowDev server listening on port ' + port + ' ...', cnsColors.reset);                
            });

        } catch (err) {
            console.log(cnsColors.error, 'Somehing bad happened ... ');
            console.log(cnsColors.emphasize, err, cnsColors.reset);
        }
    }
}

module.exports = ui5server;