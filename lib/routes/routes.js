const express = require('express');
const routes = require('express').Router();
const path = require('path');
const httpProxy = require('http-proxy');
const serverConfig = require("../../conf/config.json");
const reverseProxy = require(path.join('..', serverConfig.reverseProxies));
const application = require('../controllers/application.js');

var config = serverConfig;
var cnsColors = {
    reset: '\x1b[0m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    default: '\x1b[37m',
    emphasize: '\x1b[1m'
}

routes.use(function(req, res, next) {
    res.setHeader('Cache-control', 'no-cache');
    res.setHeader('Cache-control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', 0);
    next();
});

routes.get('/api/applications', application.applicationsList);
routes.post('/api/application', application.applicationNew);
routes.put('/api/application', application.applicationEdit);
routes.delete('/api/application', application.deleteApplication);
routes.get('/api/config', application.serverConfig);
routes.get('/api/application/fstruct/:dirname', application.applicationFolderStructure);
routes.post('/api/application/component', application.getComponentPath); 
routes.post('/api/application/version', application.createApplicationVersion); 
routes.put('/api/application/version', application.updateApplicationVersion); 
routes.delete('/api/application/version', application.deleteApplicationVersion); 
routes.post('/api/application/deploychange', application.deployBspApplicationChange);
routes.post('/api/application/deploynew', application.deployBspApplicationNew);
routes.post('/api/application/deploysubmit', application.deployBspApplicationSubmit);
routes.post('/api/application/bspapps', application.bspApplicationsList);
routes.post('/api/application/transports', application.getSapTransportsList);
routes.get('/api/sapsystems', application.sapSystemsList);
routes.post('/api/sapsystem', application.sapSystemNew);
routes.put('/api/sapsystem', application.sapSystemEdit);
routes.delete('/api/sapsystem', application.sapSystemDelete);
routes.get('/api/proxies', application.proxyList);
routes.post('/api/proxy', application.proxyNew);
routes.put('/api/proxy', application.proxyEdit);
routes.delete('/api/proxy', application.proxyDelete);

// Proxy handling
var proxy = httpProxy.createProxyServer({});
var target = '';

proxy.on('proxyReq', function(proxyReq, req, res, options) {
    proxyReq.path = target;

    if (req.is('application/json')) {
        if (req.body) {
            var bodyData = JSON.stringify(req.body);

            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));

            proxyReq.write(bodyData);
        }
    }
});


proxy.on('error', function(err, preq, pres) {
    console.log(cnsColors.error, 'Proxy error occured.');
    console.log(cnsColors.emphasize, err, cnsColors.reset);
});

var proxyHost = '';
var proxyTarget = false;

routes.all(/^\/(.+)/, function(req, res, next) {


    proxyTarget = reverseProxy.proxies.find(function(service) {    
        return req.url.includes(service.path);
    });

    if (proxyTarget) {

        if (proxyTarget.path) {
            var targetPath = req.url;
            if (proxyTarget.pathRewrite) {
                for (var rewriteKey in proxyTarget.pathRewrite) {
                    if (proxyTarget.pathRewrite.hasOwnProperty(rewriteKey)) {
                        try {
                            new RegExp(rewriteKey);
                        } catch (e) {
                            console.log(cnsColors.error, 'Configuration error occured.');
                            console.log(cnsColors.emphasize, 'Invalid regular expression in "' + rewriteKey + '". Please review your configuration.', cnsColors.reset);
                            return res.status(500).json('Invalid regular expression in ' + rewriteKey + '. Please review your configuration.');
                        }
                        targetPath = req.url.replace(new RegExp(rewriteKey), proxyTarget.pathRewrite[rewriteKey]);
                    }
                }
            }

            var proxyHost = proxyTarget.targetHost;
            target = proxyHost + targetPath;

            console.log(cnsColors.warning, 'Proxy path: ', req.url, cnsColors.reset);
            console.log(cnsColors.emphasize, 'Requesting: ', target, cnsColors.reset);

            if (!proxyTarget.targetHeaders) {
                proxyTarget.targetHeaders = {};
            }

            proxy.web(req, res, {
                target: target,
                changeOrigin: true,
                secure: false,
                headers: proxyTarget.targetHeaders
            });

        } else {

            return next();
        }
    } else {
        return next();
    }
});

module.exports = routes;