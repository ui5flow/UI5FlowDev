const routes = require('express').Router();
const httpProxy = require('http-proxy');
const logger = require('../utils/logger.js');
const serverConfig = require("../../conf/config.json");
const application = require('../controllers/application.js');
const jsonfile = require('jsonfile');
const fs = require('fs');
const url = require("url");

const cnsColors = {
  reset: '\x1b[0m',
  success: '\x1b[32m',
  error: '\x1b[31m',
  warning: '\x1b[33m',
  default: '\x1b[37m',
  emphasize: '\x1b[1m'
};

routes.use(function (req, res, next) {
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
const proxy = httpProxy.createProxyServer({});
let target = '';

proxy.on('proxyReq', function (proxyReq, req) {
  proxyReq.path = target;

  if (req.is('application/json')) {
    if (req.body) {
      const bodyData = JSON.stringify(req.body);

      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));

      proxyReq.write(bodyData);
    }
  }
});

proxy.on('error', function (err,) {
  console.log(cnsColors.error, 'Proxy error occurred.');
  console.log(cnsColors.emphasize, err, cnsColors.reset);
});

routes.all(/^\/(.+)/, function (req, res, next) {
  try {
    let file = serverConfig.reverseProxies;

    // Ensure always up-to-date set of proxies
    jsonfile.readFile(file, function (err, data) {

      if (err) {
        logger.error('Error', err);
        return res.status(500).json({status: 'Error', message: err});
      }

      const proxyTarget = data.proxies.find(function (service) {
        return req.url.includes(service.path);
      });

      if (proxyTarget) {

        if (proxyTarget.path) {
          let targetPath = req.url;
          if (proxyTarget.pathRewrite) {
            for (let rewriteKey in proxyTarget.pathRewrite) {
              if (proxyTarget.pathRewrite.hasOwnProperty(rewriteKey)) {
                try {
                  new RegExp(rewriteKey);
                } catch (e) {
                  console.log(cnsColors.error, 'Configuration error occurred.');
                  console.log(cnsColors.emphasize, 'Invalid regular expression in "' + rewriteKey + '". Please review your configuration.', cnsColors.reset);
                  return res.status(500).json('Invalid regular expression in ' + rewriteKey + '. Please review your configuration.');
                }
                targetPath = req.url.replace(new RegExp(rewriteKey), proxyTarget.pathRewrite[rewriteKey]);
              }
            }
          }

          const proxyHost = proxyTarget.targetHost;
          target = proxyHost + targetPath;

          if (!proxyTarget.targetHeaders) {
            proxyTarget.targetHeaders = {};
          }

          // check if it's a valid url
          const result = url.parse(target);
          if (result.hostname) {
            console.log(cnsColors.warning, 'Proxy path: ', req.url, cnsColors.reset);
            console.log(cnsColors.emphasize, 'Requesting: ', target, cnsColors.reset);
            proxy.web(req, res, {
              target: target,
              changeOrigin: true,
              secure: false,
              headers: proxyTarget.targetHeaders
            });
          } else {
            // check if local path exist
            fs.access(target, fs.F_OK, (err) => {
              if (err) {
                return res.status(404).json(`File ${target} doesn't exist!`);
              }
              console.log(cnsColors.emphasize, 'Requesting local: ', target, cnsColors.reset);
              res.sendFile(target);
            })
          }
        } else {
          return next();
        }
      } else {
        return next();
      }
    });
  } catch (ex) {
    logger.error('Exception', ex);
    return res.status(500).json({status: 'Error', message: ex.toString()});
  }
});

module.exports = routes;
