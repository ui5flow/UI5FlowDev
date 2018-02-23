const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const routes = require('../routes/routes.js');
const path = require('path');
const logger = require('../utils/logger.js');
const serverConfig = require("../../conf/config.json");
const os = require('os');

module.exports.set = function(app) {

    return new Promise(function(resolve, reject) {

        try {

            process.env.PROTOCOL = 'http';
            process.env.HOST = 'localhost';            
            process.env.PORT = serverConfig.port;   
            process.env.APPS_DIR = serverConfig.appsDir;
            process.env.VERSIONS_DIR = serverConfig.versionsDir;
            //process.env.DEFAULT_APP_DIR = path.join(__dirname, '..', '..', serverConfig.appsDir);
            process.env.DEFAULT_APP_DIR = serverConfig.appsDir;
            //process.env.DEFAULT_VERSION_DIR = path.join(__dirname, '..', '..', serverConfig.versionsDir);
            process.env.DEFAULT_VERSION_DIR = serverConfig.versionsDir;
            process.env.DEFAULT_WEBAPP_DIR = 'webapp';
            process.env.DIST_VERSION_DIR = 'dist';
            process.env.ROOT_DIR_REL = '..';
            process.env.DEFAULT_WEBAPP_PATH = process.env.PROTOCOL + '://' + process.env.HOST + ':' + process.env.PORT + '/';
            process.env.PATH_DELIMITER = /^win/.test(os.platform()) ? '\\' : '/';  
                         
            process.env.ICF_ADT_PATH = '/sap/bc/adt';
            process.env.FILESTORE_OBJECTS_PATH = process.env.ICF_ADT_PATH + '/filestore/ui5-bsp/objects';             
            process.env.FILESTORE_APPINDEX_PATH = process.env.ICF_ADT_PATH + '/filestore/ui5-bsp/appindex'; 
            process.env.PACKAGES_PATH = process.env.ICF_ADT_PATH + '/repository/informationsystem/search?operation=quickSearch&query=%2A&maxResults=10000&objectType=DEVC'; 
            process.env.TRANSPORT_PATH = process.env.ICF_ADT_PATH + '/cts/transportchecks'; 

            app.use(compression());
            app.use(bodyParser.json());
            app.use(bodyParser.urlencoded({ extended: true }));

            app.use(express.static(path.join(__dirname, '..', '..', process.env.DEFAULT_WEBAPP_DIR)));

            //app.use(express.static(path.join(__dirname, '..', '..', serverConfig.appsDir)));
            app.use(express.static(path.join(serverConfig.appsDir)));
            //app.use(express.static(path.join(__dirname, '..', '..', serverConfig.versionsDir)));
            app.use(express.static(path.join(serverConfig.versionsDir)));

            app.use('/', routes);

            app.use(function(err, req, res, next) {
                if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
                    logger.error('Error', err);
                    res.status(500).json({ status: 'Error', message: ex.toString() });
                }
            });

            resolve(true);

        } catch (ex) {
            logger.debug('Error', ex);
            res.status(500).json({ status: 'Error', message: ex.toString() });

            reject(true);
        }

    });
};