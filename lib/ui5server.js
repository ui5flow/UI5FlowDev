const express = require('express');
const path = require('path');
const opn = require('opn');
const homeDir = require('user-home');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const jsonfile = require('jsonfile');
const config = require('./config/config.js');
const npmPath = require('get-installed-path');

const modulePath = npmPath.getInstalledPathSync('ui5flowdev');
const configFilePath = path.join(modulePath, 'conf', 'config.json');
const serverConfig = require(configFilePath);

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
            if (!serverConfig.initialized) {
                ui5server.configWizard();
            } else {
                ui5server.startConfirmed();
            }
        } catch (err) {
            console.log(cnsColors.error, 'Something bad happened ... ');
            console.log(cnsColors.emphasize, err, cnsColors.reset);
        }
    },

    configWizard: function() {
        var defaultPath = homeDir + '\\UI5FlowDev';
        console.log(cnsColors.emphasize, ' Initializing Ui5FlowDev environment before first start ...', cnsColors.reset);
        inquirer.prompt([{
            type: 'input',
            name: 'port',
            message: "What HTTP port you want to use:",
            default: function() {
                return '8001';
            }
        }]).then(answers => {
            console.log(cnsColors.emphasize, ' Selected port:', answers.port, cnsColors.reset);
            serverConfig.port = answers.port;

            console.log(cnsColors.emphasize, ' Default path for your Ui5FlowDev artifacts is ' + defaultPath, cnsColors.reset);
            inquirer.prompt([{
                type: 'confirm',
                name: 'useDefaultPath',
                message: "Do you want to change this directory?",
                default: false
            }]).then(answers => {
                if (answers.useDefaultPath) {
                    inquirer.prompt([{
                        type: 'input',
                        name: 'newPath',
                        message: "Type path to directory where you want to store UIFlowDev artifacts:"
                    }]).then(answers => {
                        console.log(cnsColors.emphasize, ' Selected path:', answers.newPath, cnsColors.reset);
                        ui5server.configInit(answers.newPath);
                    });
                } else {
                    console.log(cnsColors.emphasize, ' Selected path:', defaultPath, cnsColors.reset);
                    ui5server.configInit(defaultPath);
                }

            });

        });
    },

    configInit: function(selectedPath) {

        var dataDir = path.join(selectedPath, 'data');

        serverConfig.appsDir = path.join(selectedPath, 'apps');
        serverConfig.versionsDir = path.join(selectedPath, 'versions');
        serverConfig.appsData = path.join(selectedPath, 'data', 'apps.json');
        serverConfig.sapSystems = path.join(selectedPath, 'data', 'sapSystems.json');
        serverConfig.reverseProxies = path.join(selectedPath, 'data', 'reverseProxies.json');
        serverConfig.initialized = true;

        if (!path.isAbsolute(selectedPath)) {
            console.log(cnsColors.error, ' Wrong path. Provided path cannot be used. Please enter a valid absolute path.', cnsColors.reset);
            return false;
        }

        fs.pathExists(selectedPath, function(err, exists) {
            if (err) {
                console.log(cnsColors.emphasize, err, cnsColors.reset);
                return false;
            };

            if (exists) {
                console.log(cnsColors.error, ' Path ' + selectedPath + ' already exists.', cnsColors.reset);
            } else {
                jsonfile.writeFile(configFilePath, serverConfig, { spaces: 2, EOL: '\r\n' }, function(err) {
                    if (err) {
                        console.log(cnsColors.emphasize, err, cnsColors.reset);
                        return false;
                    }

                    fs.mkdir(selectedPath, function(err) {
                        if (err) {
                            console.log(cnsColors.error, err, cnsColors.reset);
                            return false;
                        }

                        fs.mkdir(dataDir, function(err) {
                            if (err) {
                                console.log(cnsColors.error, err, cnsColors.reset);
                                return false;
                            }

                            fs.mkdir(serverConfig.versionsDir, function(err) {
                                if (err) {
                                    console.log(cnsColors.error, err, cnsColors.reset);
                                    return false;
                                }

                                fs.mkdir(serverConfig.appsDir, function(err) {
                                    if (err) {
                                        console.log(cnsColors.error, err, cnsColors.reset);
                                        return false;
                                    }

                                    var appsDataContent = { applications: [] };
                                    jsonfile.writeFile(serverConfig.appsData, appsDataContent, { spaces: 2, EOL: '\r\n' }, function(err) {
                                        if (err) {
                                            console.log(cnsColors.error, err, cnsColors.reset);
                                            return false;
                                        }

                                        var sapSystemsContent = { systems: [] };
                                        jsonfile.writeFile(serverConfig.sapSystems, sapSystemsContent, { spaces: 2, EOL: '\r\n' }, function(err) {
                                            if (err) {
                                                console.log(cnsColors.error, err, cnsColors.reset);
                                                return false;
                                            }

                                            var reverseProxiesContent = { proxies: [] };
                                            jsonfile.writeFile(serverConfig.reverseProxies, reverseProxiesContent, { spaces: 2, EOL: '\r\n' }, function(err) {
                                                if (err) {
                                                    console.log(cnsColors.error, err, cnsColors.reset);
                                                    return false;
                                                }

                                                console.log(cnsColors.success, 'Configuration successful.', cnsColors.reset);
                                                ui5server.startConfirmed();

                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            }
        });


    },

    startConfirmed: function() {
        var app = express();
        config.set(app).then(function() {
            var port = serverConfig.port;
            app.listen(port);
            opn('http://localhost:' + port + '/');
            console.log(cnsColors.success, 'UI5FlowDev Server listening on port ' + port + ' ...', cnsColors.reset);
        });
    }
}

module.exports = ui5server;