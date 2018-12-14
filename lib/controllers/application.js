const logger = require('../utils/logger.js');
const utils = require('../utils/utils.js');
const serverConfig = require("../../conf/config.json");
const jsonfile = require('jsonfile');
const path = require('path');
const slash = require('slash');
const uuid = require('node-uuid');
const fs = require('fs-extra');


var Application = {

    applicationsList: function(req, res) {

        try {

            var file = serverConfig.appsData;
            jsonfile.readFile(file, function(err, data) {

                if (err) {
                    logger.error('Error', err);
                    return res.status(500).json({ status: 'Error', message: err });
                }
                return res.status(200).json(data);

            });
        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }

    },

    deleteApplication: function(req, res) {
        try {
            var appName = req.body.appName;
            logger.debug('Deleting application:', appName);

            var file = serverConfig.appsData;
            jsonfile.readFile(file, function(err, data) {

                if (err) {
                    logger.error('Error', err);
                    return res.status(500).json({ status: 'Error', message: err });
                }

                var editData = {};
                if (!data.applications) {
                    return res.status(500).json({ status: 'Error', message: 'No applications found.' });
                }

                var isDelete = false;
                for (var i = 0, iLength = data.applications.length; i < iLength; i++) {
                    if (data.applications[i].name == appName) {
                        editData = data.applications[i];
                        var deleteIndex = i;
                        isDelete = true;
                        break;
                    }
                }

                if (isDelete) {
                    //var appDir = path.join(process.env.ROOT_DIR_REL, process.env.APPS_DIR, editData.app_directory);
                    var appDir = path.join(process.env.APPS_DIR, editData.app_directory);
                    logger.debug('Deleting application directory:', appDir);
                    fs.remove(appDir, function(err) {
                        if (err) {
                            logger.error('Error', err);
                            return res.status(500).json({ status: 'Error', message: err.toString() });
                        } 

                        
                        logger.debug('Deleting application versions ... ');
                        if (editData.versions) {
                            var versionDir = "";
                            for (var j = 0, jLength = editData.versions.length; j < jLength; j++) {

                                //versionDir = path.join(process.env.ROOT_DIR_REL, process.env.VERSIONS_DIR, editData.versions[j].version_directory);
                                versionDir = path.join(process.env.VERSIONS_DIR, editData.versions[j].version_directory);
                                logger.debug('Deleting application directory:', versionDir);
                                fs.removeSync(versionDir);
                            }
                        }
                        
                        data.applications.splice(deleteIndex, 1);

                        jsonfile.writeFile(file, data, { spaces: 2, EOL: '\r\n' }, function(err) {
                            if (err) {
                                logger.error('Error', err);
                                return res.status(500).json({ status: 'Error', message: err });
                            }

                            return res.status(200).json({ status: 'Success', message: 'Application deleted.' });
                        });

                    });
                }

            });

        } catch (ex) {
            logger.debug('Exception', ex);
            res.status(500).json(userMessages.msgJson('E0009', req.id));
        }
    },

    applicationNew: function(req, res) {

        try {
            var appName = req.body.name + '-' + uuid.v1().replace(/-/g, '');

            var file = serverConfig.appsData;
            jsonfile.readFile(file, function(err, data) {

                if (err) {
                    logger.error('Error', err);
                    return res.status(500).json({ status: 'Error', message: err });
                }

                var newData = {};
                if (!data.applications) {
                    newData = {
                        "applications": []
                    };
                } else {
                    newData = data;
                }

                newData.applications.push({
                    "name": appName,
                    "display_name": req.body.name,
                    "description": req.body.description,
                    "path": req.body.path,
                    "app_directory": req.body.name,
                    "app_url": process.env.DEFAULT_WEBAPP_PATH + req.body.name + '/index.html',
                    "versions": [],
                    "created_at": new Date().toISOString(),
                    "updated_at": new Date().toISOString()
                });

                var appPath = path.join(process.env.DEFAULT_APP_DIR, req.body.name);

                fs.stat(appPath, function(err, stats) {

                    if (err) {
                        logger.debug('Folder "%s" not found', appPath);
                        logger.debug('Folder creation is possible.');

                        fs.mkdir(appPath, function(err) {

                            if (err) {
                                logger.error('App folder creation failed.', err);
                                res.status(500).json({ status: 'Error', message: 'App folder creation failed.' });
                            }

                            jsonfile.writeFile(file, newData, { spaces: 2, EOL: '\r\n' }, function(err) {
                                if (err) {
                                    logger.error('Error', err);
                                    return res.status(500).json({ status: 'Error', message: err });
                                }

                                return res.status(201).json({ status: 'Success', message: 'Application created.', 'name': appName });
                            });

                        });

                    } else {
                        logger.debug('Folder "%s" already exists.', appPath);
                        logger.error('Folder creation failed.');
                        return res.status(500).json({ status: 'Error', message: 'Folder already exists.' });
                    }
                });
            });
        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }
    },

    applicationEdit: function(req, res) {

        try {
            var appName = req.body.name;

            var file = serverConfig.appsData;
            jsonfile.readFile(file, function(err, data) {

                if (err) {
                    logger.error('Error', err);
                    return res.status(500).json({ status: 'Error', message: err });
                }

                var editData = {};
                if (!data.applications) {
                    return res.status(500).json({ status: 'Error', message: 'No applications found.' });
                }

                for (var i = 0, iLength = data.applications.length; i < iLength; i++) {
                    if (data.applications[i].name == appName) {
                        editData = data.applications[i];
                    }
                }

                editData.display_name = req.body.displayName ? req.body.displayName : editData.display_name;
                editData.app_url = req.body.appUrl ? req.body.appUrl : editData.app_url;
                editData.description = req.body.description ? req.body.description : editData.description;
                editData.remote_git_url = req.body.remoteGitUrl ? req.body.remoteGitUrl : editData.remote_git_url;
                editData.tags = req.body.tags ? req.body.tags : editData.tags;
                editData.updated_at = new Date().toISOString();

                jsonfile.writeFile(file, data, { spaces: 2, EOL: '\r\n' }, function(err) {
                    if (err) {
                        logger.error('Error', err);
                        return res.status(500).json({ status: 'Error', message: err });
                    }

                    return res.status(200).json({ status: 'Success', message: 'Application was updated.', 'name': appName });
                });


            });
        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }
    },

    applicationFolderStructure: function(req, res) {

        try {
            var dirName = req.params.dirname;
            var appFolderStructure = {};

            var targetFolder = path.join(process.env.DEFAULT_APP_DIR,  dirName);            

            logger.debug('Folder path: ', targetFolder);
            appFolderStructure = Application.folderStructure(targetFolder);

            return res.status(200).json(appFolderStructure.subfolder);

        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }
    },

    folderStructure: function(filename) {
        var stats = fs.lstatSync(filename);
        var info = {};
        if (path.basename(filename) !== '.git') { // exclude .git folder
            if (stats.isDirectory()) { // return folder only
                info = {
                    name: path.basename(filename)
                };

                //info.type = "folder";
                info.subfolder = fs.readdirSync(filename).map(function(child) {
                    return Application.folderStructure(path.join(filename, child));
                });

            }

        }

        return info;
    },

    getComponentPath: function(req, res) {
        var appFolder = req.body.appFolder;
        var srcPath = req.body.srcPath;


        if (!appFolder) {
            logger.error('Application name was not defined.');
            return res.status(500).json({ status: 'Error', message: 'Application name was not defined.' });
        }

        if (!srcPath) {
            logger.error('Version source path was not defined.');
            return res.status(500).json({ status: 'Error', message: 'Version source path was not defined.' });
        }

        try {

            if (srcPath.length == 1) {
                srcPath = '/';
            } else {
                if (srcPath.slice(-1) !== '/') {
                    srcPath = srcPath + '/';
                }
            }

            var sourceAppDir = process.env.DEFAULT_APP_DIR + '/' + appFolder + srcPath;
            logger.debug('Version source repository path: ', sourceAppDir);

            var componentFile = 'Component.js';
            var componentStartPattern = 'UIComponent.extend(';
            var componentEndPattern = 'Component';
            var fileName = sourceAppDir + componentFile;
            // UI5 Application has to contain Component.js file
            if (!fs.existsSync(fileName)) {
                logger.error('File "' + fileName + '" was not found in the application directory.');
                return res.status(500).json({ status: 'Error', message: 'File "' + fileName + '" was not found in the application directory.' });
            }

            logger.debug('Parsing file %s .', fileName);
            var fileContent = fs.readFileSync(fileName, 'utf8');
            var startPosition = fileContent.indexOf(componentStartPattern);
            if (startPosition === -1) {
                logger.error('UIComponent declaration was not found in the file "' + fileName + ' .');
                return res.status(500).json({ status: 'Error', message: 'UIComponent declaration was not found in the file "' + fileName + ' .' });
            } else {
                logger.debug('UIComponent found ...');
                startPosition += componentStartPattern.toString().length;
                var endPosition = fileContent.indexOf(componentEndPattern, startPosition);
                if (endPosition === -1) {
                    logger.error('UIComponent declaration was not found in the file "' + fileName + ' .');
                    return res.status(500).json({ status: 'Error', message: 'UIComponent declaration was not found in the file "' + fileName + ' .' });
                } else {
                    var path = fileContent.substring(startPosition, endPosition);
                    var path = path.replace(/\"/g, '').replace(/\'/g, '').replace(/\./g, '/');
                    if (path.slice(-1) === '/') {
                        path = path.replace(/.$/, '');
                    }
                    logger.debug('Start: ' + startPosition + ' / End: ' + endPosition + ' / Path:' + path + ' .');
                    return res.status(200).json({ status: 'Success', message: 'Component path found.', path: path });
                }
            }

        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }
    },


    createApplicationVersion: function(req, res) {

        try {

            var appName = req.body.appName;
            var appFolder = req.body.appFolder;
            var versionName = req.body.versionName;
            var versionFolder = req.body.versionFolder;

            if (versionFolder.length <= 0) {
                logger.debug('Source repository path not defined.');
                return res.status(500).json({ status: 'Error', message: 'Source repository path not defined.' });
            }

            // Add last '/' and first '/'
            if (versionFolder.length == 1) {
                versionFolder = '/';
            } else {
                if (versionFolder.slice(-1) !== '/') {
                    versionFolder = versionFolder + '/';
                }
                if (versionFolder.charAt(0) !== '/') {
                    versionFolder = '/' + versionFolder;
                }
            }

            var versionPath = appFolder + '-' + versionName;
            //var versionDir = path.join(process.env.ROOT_DIR_REL, process.env.VERSIONS_DIR, versionPath);
            //var versionDirWebApp = path.join(process.env.ROOT_DIR_REL, process.env.VERSIONS_DIR, versionPath, process.env.DIST_VERSION_DIR);
            //var appDirWebApp = path.join(process.env.ROOT_DIR_REL, process.env.APPS_DIR, appFolder + versionFolder);
            var versionDir = path.join(process.env.VERSIONS_DIR, versionPath);
            var versionDirWebApp = path.join(process.env.VERSIONS_DIR, versionPath, process.env.DIST_VERSION_DIR);
            var appDirWebApp = path.join(process.env.APPS_DIR, appFolder + versionFolder);

            logger.debug('Version source repository path: ', appDirWebApp);

            var appVersionData = {};
            var versionName = req.body.versionName;
            var versionDescription = req.body.versionDescription || '';
            var isBuild = req.body.isBuild || false;
            var pathPrefix = req.body.pathPrefix || false;
            var dataProviders = req.body.dataProviders || [];
            var versionRootPath = versionFolder || '';

            logger.debug('Version creation process started ...');

            if (!fs.existsSync(appDirWebApp)) {
                logger.debug('Folder "' + appDirWebApp + '" was not found in the application directory.');
                return res.status(500).json({ status: 'Error', message: 'Folder "' + appDirWebApp + '" was not found in the application directory.' });
            }

            if (!fs.existsSync(versionDir)) {
                logger.debug('Creating folder "%s" ... ', versionDir);

                fs.mkdir(versionDir, function(err) {

                    if (err) {
                        logger.error('Application version folder creation failed.', err);
                        return res.status(500).json({ status: 'Error', message: err.toString() });
                    }

                    logger.debug('Copy process of application version started ...');

                    try {
                        logger.debug('Creating folder "%s" ... ', versionDirWebApp);
                        //fs.mkdirSync(versionDirWebApp);

                        fs.mkdir(versionDirWebApp, function(err) {

                            if (err) {
                                logger.error('Folder %s creation failed.', versionDirWebApp);
                                return res.status(500).json({ status: 'Error', message: err.toString() });
                            }

                            if (isBuild) {
                                if (pathPrefix) {
                                    utils.buildComponentPreload(appFolder, versionPath, pathPrefix, versionFolder)
                                        .then(
                                            function(result) {
                                                // Do nothing here
                                                //return res.status(200).json(result);
                                                fs.copy(appDirWebApp, versionDirWebApp, function(err) {
                                                    if (err) {
                                                        logger.error('Copy process of application version failed.', err);
                                                        return res.status(500).json({ status: 'Error', message: err.toString() });
                                                    } else {
                                                        logger.debug('Copy process finished.');

                                                        logger.debug('Updating application:', appName);

                                                        var file = serverConfig.appsData;
                                                        jsonfile.readFile(file, function(err, data) {

                                                            if (err) {
                                                                logger.error('Error', err);
                                                                return res.status(500).json({ status: 'Error', message: err });
                                                            }

                                                            var editData = {};
                                                            if (!data.applications) {
                                                                return res.status(500).json({ status: 'Error', message: 'No applications found.' });
                                                            }

                                                            for (var i = 0, iLength = data.applications.length; i < iLength; i++) {
                                                                if (data.applications[i].name == appName) {
                                                                    editData = data.applications[i];
                                                                }
                                                            }

                                                            if (editData.versions) {
                                                                editData.versions.push({
                                                                    "name": versionName,
                                                                    "description": versionDescription,
                                                                    "version_directory": versionPath,
                                                                    "path": versionFolder,
                                                                    "build": isBuild,
                                                                    "created_at": new Date().toISOString(),
                                                                    "updated_at": new Date().toISOString()
                                                                });
                                                            }

                                                            jsonfile.writeFile(file, data, { spaces: 2, EOL: '\r\n' }, function(err) {
                                                                if (err) {
                                                                    logger.error('Error', err);
                                                                    return res.status(500).json({ status: 'Error', message: err });
                                                                }

                                                                return res.status(200).json({ status: 'Success', message: 'Application version created.' });
                                                            });

                                                        });
                                                    }
                                                });

                                            },
                                            function(result) {
                                                fs.remove(versionDir, function(err) {
                                                    if (err) {
                                                        logger.error('Error ', err);
                                                        return res.status(500).json({ status: 'Error', message: err });
                                                    }
                                                });
                                                return res.status(500).json({ status: 'Error', message: result });
                                            }
                                        )
                                        .catch(
                                            function(ex) {
                                                logger.error('Exception', ex);
                                                return res.status(500).json({ status: 'Error', message: ex.toString() });
                                            }
                                        );
                                }
                            } else {
                                fs.copy(appDirWebApp, versionDirWebApp, function(err) {
                                    if (err) {
                                        logger.error('Copy process of application version failed.', err);
                                        return res.status(500).json({ status: 'Error', message: err.toString() });
                                    } else {
                                        logger.debug('Copy process finished.');

                                        logger.debug('Updating application:', appName);

                                        var file = serverConfig.appsData;
                                        jsonfile.readFile(file, function(err, data) {

                                            if (err) {
                                                logger.error('Error', err);
                                                return res.status(500).json({ status: 'Error', message: err });
                                            }

                                            var editData = {};
                                            if (!data.applications) {
                                                return res.status(500).json({ status: 'Error', message: 'No applications found.' });
                                            }

                                            for (var i = 0, iLength = data.applications.length; i < iLength; i++) {
                                                if (data.applications[i].name == appName) {
                                                    editData = data.applications[i];
                                                }
                                            }

                                            if (editData.versions) {
                                                editData.versions.push({
                                                    "name": versionName,
                                                    "description": versionDescription,
                                                    "version_directory": versionPath,
                                                    "path": versionFolder,
                                                    "build": isBuild,
                                                    "created_at": new Date().toISOString(),
                                                    "updated_at": new Date().toISOString()
                                                });
                                            } else {
                                                return res.status(500).json({ status: 'Error', message: 'No versions found.' });
                                            }

                                            jsonfile.writeFile(file, data, { spaces: 2, EOL: '\r\n' }, function(err) {
                                                if (err) {
                                                    logger.error('Error', err);
                                                    return res.status(500).json({ status: 'Error', message: err });
                                                }

                                                return res.status(200).json({ status: 'Success', message: 'Application version created.' });
                                            });

                                        });
                                    }
                                });
                            }

                        });

                    } catch (ex) {
                        logger.error('Application version folder creation failed.', ex);
                        return res.status(500).json({ status: 'Error', message: ex.toString() });
                    }

                });

            } else {
                logger.debug('Folder "%s" already exists', versionDir);
                return res.status(500).json({ status: 'Error', message: 'Folder ' + versionDir + ' already exists.' });
            }

        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }

    },

    updateApplicationVersion: function(req, res) {

        var appName = req.body.appName;
        var versionId = req.body.versionId;
        var versionFolder = req.body.versionFolder;
        var versionName = req.body.versionName;
        var versionDescription = req.body.versionDescription;


        try {

            logger.debug('Updating application version:', versionId);

            var file = serverConfig.appsData;
            jsonfile.readFile(file, function(err, data) {

                if (err) {
                    logger.error('Error', err);
                    return res.status(500).json({ status: 'Error', message: err });
                }

                var editData = {};
                if (!data.applications) {
                    return res.status(500).json({ status: 'Error', message: 'No applications found.' });
                }

                for (var i = 0, iLength = data.applications.length; i < iLength; i++) {
                    if (data.applications[i].name == appName) {
                        editData = data.applications[i];
                        break;
                    }
                }

                if (editData.versions) {
                    for (var j = 0, jLength = editData.versions.length; j < jLength; j++) {
                        if (editData.versions[j].version_directory == versionId) {
                            editData.versions[j].name = versionName ? versionName : editData.versions[j].name;
                            editData.versions[j].description = versionDescription ? versionDescription : editData.versions[j].description;
                            editData.versions[j].updated_at = new Date().toISOString();
                            break;
                        }
                    }

                    jsonfile.writeFile(file, data, { spaces: 2, EOL: '\r\n' }, function(err) {
                        if (err) {
                            logger.error('Error', err);
                            return res.status(500).json({ status: 'Error', message: err });
                        }

                        return res.status(200).json({ status: 'Success', message: 'Application version changed.' });
                    });
                } else {
                    return res.status(500).json({ status: 'Error', message: 'No versions found.' });
                }
            });


        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }

    },


    deleteApplicationVersion: function(req, res) {

        var appName = req.body.appName;
        var versionId = req.body.versionId;
        var versionDir;
        var deleteIndex;
        var isDelete = false;

        try {

            logger.debug('Deleting application version:', versionId);

            var file = serverConfig.appsData;
            jsonfile.readFile(file, function(err, data) {

                if (err) {
                    logger.error('Error', err);
                    return res.status(500).json({ status: 'Error', message: err });
                }

                var editData = {};
                if (!data.applications) {
                    return res.status(500).json({ status: 'Error', message: 'No applications found.' });
                }

                if (appName && versionId) {
                    logger.debug('Content to be deleted found ...');
                    for (var i = 0, iLength = data.applications.length; i < iLength; i++) {
                        if (data.applications[i].name == appName) {
                            editData = data.applications[i];
                            break;
                        }
                    }

                    if (editData.versions) {
                        for (var j = 0, jLength = editData.versions.length; j < jLength; j++) {
                            if (editData.versions[j].version_directory == versionId) {
                                deleteIndex = j;
                                isDelete = true;
                                break;
                            }
                        }
                    }

                    if (isDelete) {
                        //var versionDir = path.join(process.env.ROOT_DIR_REL, process.env.VERSIONS_DIR, versionId);
                        var versionDir = path.join(process.env.VERSIONS_DIR, versionId);
                        fs.remove(versionDir, function(err) {
                            if (err) {
                                logger.error('Error', err);
                                return res.status(500).json({ status: 'Error', message: err.toString() });
                            }

                            logger.debug('Deleting application version ... ');
                            editData.versions.splice(deleteIndex, 1);

                            jsonfile.writeFile(file, data, { spaces: 2, EOL: '\r\n' }, function(err) {
                                if (err) {
                                    logger.error('Error', err);
                                    return res.status(500).json({ status: 'Error', message: err });
                                }

                                return res.status(200).json({ status: 'Success', message: 'Application version deleted.' });
                            });

                        });
                    } else {
                        logger.debug('Delete index not found.');
                        return res.status(200).json({ status: 'Success', message: 'No content deleted.' });
                    }
                } else {
                    logger.debug('Application name or Version ID not found.');
                    return res.status(200).json({ status: 'Success', message: 'No content deleted.' });
                }

            });

        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }
    },

    bspApplicationsList: function(req, res) {

        var adtConfigParams = req.body.deploymentConfig;
        adtConfigParams.requestHeaders["Accept"] = "*/*"; // Header extension for S4 HANA system

        try {

            var adtHost = adtConfigParams.systemUrl.replace(/\/+$/, ''); // trailing '/'
            var adtConfig = {
                host: adtHost,
                url: adtHost + process.env.FILESTORE_OBJECTS_PATH,
                headers: adtConfigParams.requestHeaders
            };


            utils.getBspApplicationsList(adtConfig)
                .then(
                    function(applications) {
                        adtConfig.url = adtHost + process.env.PACKAGES_PATH;
                        utils.getPackagesList(adtConfig).then(
                            function(packages) {
                                var result = {
                                    applications: applications,
                                    packages: packages
                                }
                                return res.status(200).json(result);
                            },
                            function(error) {
                                logger.error('Error', error);
                                return res.status(500).json({ status: 'Error', message: error });
                            }
                        );

                    },
                    function(error) {
                        logger.error('Error', error);
                        return res.status(500).json({ status: 'Error', message: error });
                    }).catch(
                    function(ex) {
                        logger.error('Exception', ex);
                        return res.status(500).json({ status: 'Error', message: ex.toString() });
                    }
                );

        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }
    },

    getSapTransportsList: function(req, res) {

        var adtConfigParams = req.body.deploymentConfig;
        adtConfigParams.requestHeaders["Accept"] = "*/*"; // Header extension for S4 HANA system

        try {

            var adtHost = adtConfigParams.systemUrl.replace(/\/+$/, ''); // trailing '/'
            var adtConfig = {
                host: adtHost,
                url: adtHost + process.env.FILESTORE_OBJECTS_PATH, // For connection
                headers: adtConfigParams.requestHeaders,
                bspProperties: adtConfigParams.bspProperties
            };

            utils.adtSetConnection(adtConfig)
                .then(
                    function(response) {
                        delete adtConfig.headers['X-CSRF-Token']; // Do not fetch token when post
                        delete adtConfig.headers['x-csrf-token']; // Do not fetch token when post

                        adtConfig.headers["x-csrf-token"] = response.headers['x-csrf-token'];
                        adtConfig.headers["cookie"] = response.headers['set-cookie'];

                        utils.getSapTransportsList(adtConfig)
                            .then(
                                function(result) {
                                    return res.status(200).json(result);
                                },
                                function(error) {
                                    logger.error('Error', error);
                                    return res.status(500).json({ status: 'Error', message: error });
                                }).catch(
                                function(ex) {
                                    logger.error('Exception', ex);
                                    return res.status(500).json({ status: 'Error', message: ex.toString() });
                                }
                            ).catch(
                                function(ex) {
                                    logger.error('Exception', ex);
                                    return res.status(500).json({ status: 'Error', message: ex.toString() });
                                }
                            );

                    },
                    function(error) {
                        logger.error('Application resources read failed.', error);
                        return res.status(500).json({ status: 'Error', message: error });


                    })
                .catch(
                    function(ex) {
                        logger.error('Exception', ex);
                        return res.status(500).json({ status: 'Error', message: ex.toString() });
                    }
                );

        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }
    },

    deployBspApplicationNew: function(req, res) {

        var adtConfigParams = req.body.adtConfig;

        try {

            var adtHost = adtConfigParams.systemUrl.replace(/\/+$/, ''); // trailing '/'
            var adtConfig = {
                host: adtHost,
                url: adtHost + process.env.FILESTORE_OBJECTS_PATH + '/' + encodeURIComponent(adtConfigParams.bspProperties.bspApplication) + '/content',
                headers: adtConfigParams.requestHeaders,
                appPath: path.join(process.env.VERSIONS_DIR, adtConfigParams.bspProperties.versionDirectory, process.env.DIST_VERSION_DIR) + path.sep
            };
/*
            var adtConfig = {
                host: adtHost,
                url: adtHost + process.env.FILESTORE_OBJECTS_PATH + '/' + encodeURIComponent(adtConfigParams.bspProperties.bspApplication) + '/content',
                headers: adtConfigParams.requestHeaders,
                appPath: process.env.ROOT_DIR_REL + '/' + process.env.VERSIONS_DIR + '/' + adtConfigParams.bspProperties.versionDirectory + '/' + process.env.DIST_VERSION_DIR + '/',
            };
*/
            if (!adtConfigParams.bspProperties.bspApplication.length) {
                return res.status(500).json({ status: 'Error', message: 'Invalid name of BSP application.' });
            }

            utils.adtSetConnection(adtConfig)
                .then(
                    function(result) {
                        logger.error('Error', 'Creating an application which already exists.');
                        return res.status(500).json({ status: 'Error', message: 'Application already exists.' });
                    },
                    function(error) {
                        utils.readSourceDir(adtConfigParams.bspProperties.bspApplication, adtConfig.appPath)
                            .then(
                                function(resourcesLocal) {
                                    var resourcesServer = [];
                                    var resourcesSync = utils.getresourcesSync(resourcesServer, resourcesLocal)
                                    if (!resourcesSync.length) {
                                        return res.status(500).json({ status: 'Error', message: 'Nothing to upload.' });
                                    }
                                    var resourcesProps = {
                                        bspApplication: adtConfigParams.bspProperties.bspApplication,
                                        bspAppExists: false
                                    };
                                    return res.status(200).json({
                                        resourcesSync: resourcesSync,
                                        resourcesProps: resourcesProps
                                    });
                                },
                                function(error) {
                                    logger.error('Error', error);
                                    return res.status(500).json({ status: 'Error', message: error });
                                }
                            ).catch(
                                function(ex) {
                                    logger.error('Exception', ex);
                                    return res.status(500).json({ status: 'Error', message: ex.toString() });
                                });


                    }).catch(
                    function(ex) {
                        logger.error('Exception', ex);
                        return res.status(500).json({ status: 'Error', message: ex.toString() });
                    }
                );

        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }

    },

    deployBspApplicationChange: function(req, res) {

        var adtConfigParams = req.body.adtConfig;

        try {

            var adtHost = adtConfigParams.systemUrl.replace(/\/+$/, ''); // trailing '/'
            var adtConfig = {
                host: adtHost,
                url: adtHost + process.env.FILESTORE_OBJECTS_PATH + '/' + encodeURIComponent(adtConfigParams.bspProperties.bspApplication) + '/content',
                headers: adtConfigParams.requestHeaders,
                appPath: path.join(process.env.VERSIONS_DIR, adtConfigParams.bspProperties.versionDirectory, process.env.DIST_VERSION_DIR) + path.sep
            };

/*
            var adtConfig = {
                host: adtHost,
                url: adtHost + process.env.FILESTORE_OBJECTS_PATH + '/' + encodeURIComponent(adtConfigParams.bspProperties.bspApplication) + '/content',
                headers: adtConfigParams.requestHeaders,
                appPath: process.env.ROOT_DIR_REL + '/' + process.env.VERSIONS_DIR + '/' + adtConfigParams.bspProperties.versionDirectory + '/' + process.env.DIST_VERSION_DIR + '/',
            };
*/

            if (!adtConfigParams.bspProperties.bspApplication.length) {
                return res.status(500).json({ status: 'Error', message: 'Invalid name of BSP application.' });
            }


            utils.readSourceDir(adtConfigParams.bspProperties.bspApplication, adtConfig.appPath)
                .then(
                    function(resourcesLocal) {
                        logger.debug('Collect files from %s', adtConfig.url);
                        utils.collectResourcesServer(adtConfig).then(function(resourcesServer) {
                                var resourcesSync = utils.getresourcesSync(resourcesServer, resourcesLocal)
                                if (!resourcesSync.length) {
                                    return res.status(500).json({ status: 'Error', message: 'Nothing to upload.' });
                                }
                                var resourcesProps = {
                                    bspApplication: adtConfigParams.bspProperties.bspApplication,
                                    bspAppExists: true
                                };
                                if (!resourcesServer.length) {
                                    resourcesProps.bspAppExists = false;
                                }
                                return res.status(200).json({
                                    resourcesSync: resourcesSync,
                                    resourcesProps: resourcesProps
                                });
                            },
                            function(error) {
                                logger.error('Error', error);
                                return res.status(500).json({ status: 'Error', message: error });
                            });
                    },
                    function(error) {
                        logger.error('Error', error);
                        return res.status(500).json({ status: 'Error', message: error });
                    }
                ).catch(
                    function(ex) {
                        logger.error('Exception', ex);
                        return res.status(500).json({ status: 'Error', message: ex.toString() });
                    }
                );

        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }

    },

    deployBspApplicationSubmit: function(req, res) {

        var adtConfigParams = req.body.deploymentConfig;
        var deploymentSync = req.body.deploymentSync;
        var appName = req.body.appName;
        var versionId = req.body.versionId;

        try {

            var adtHost = adtConfigParams.systemUrl.replace(/\/+$/, ''); // trailing '/'
            var adtConfig = {
                host: adtHost,
                url: adtHost + process.env.FILESTORE_OBJECTS_PATH,
                headers: adtConfigParams.requestHeaders,
                bspProperties: adtConfigParams.bspProperties,
                systemDescription: adtConfigParams.systemDescription,
                systemUrl: adtConfigParams.systemUrl,
                bspUrlPattern: adtConfigParams.bspUrlPattern,
                appName: appName,
                versionId: versionId
            };

            if (!adtConfigParams.bspProperties.bspApplication.length) {
                return res.status(500).json({ status: 'Error', message: 'Invalid name of BSP application.' });
            }

            // Create new app
            if (adtConfigParams.bspProperties.isNewApp) {

                utils.adtSetConnection(adtConfig)
                    .then(
                        function(response) {
                            delete adtConfig.headers['X-CSRF-Token']; // Do not fetch token when post
                            delete adtConfig.headers['x-csrf-token']; // Do not fetch token when post

                            adtConfig.headers["x-csrf-token"] = response.headers['x-csrf-token'];
                            adtConfig.headers["cookie"] = response.headers['set-cookie'];

                            utils.createBspApplication(adtConfig).then(
                                function(result) {
                                    logger.debug('Application created.');
                                    logger.debug('Application resources deployment started.');
                                    utils.bspApplicationDeployResources(adtConfig, deploymentSync.resourcesSync).then(
                                        function(result) {

                                            utils.bspApplicationIndexCalculation(adtConfig, serverConfig).then(
                                                function(result) {
                                                    return res.status(200).json({ status: 'Success', message: 'Application was deployed.' });
                                                },
                                                function(error) {
                                                    logger.error('Error', error);
                                                    return res.status(500).json({ status: 'Error', message: error });
                                                }

                                            );

                                        },
                                        function(error) {
                                            logger.error('Error', error);
                                            return res.status(500).json({ status: 'Error', message: error });
                                        }
                                    );

                                },
                                function(error) {
                                    logger.error('Error', error);
                                    return res.status(500).json({ status: 'Error', message: error });
                                }
                            );
                        },
                        function(error) {
                            logger.error('Application resources read failed.', error);
                            return res.status(500).json({ status: 'Error', message: error });


                        })
                    .catch(
                        function(ex) {
                            logger.error('Exception', ex);
                            return res.status(500).json({ status: 'Error', message: ex.toString() });
                        }
                    );

                // Update/Delete existing app                
            } else {


                utils.adtSetConnection(adtConfig)
                    .then(
                        function(response) {
                            delete adtConfig.headers['X-CSRF-Token']; // Do not fetch token when post
                            delete adtConfig.headers['x-csrf-token']; // Do not fetch token when post

                            adtConfig.headers["x-csrf-token"] = response.headers['x-csrf-token'];
                            adtConfig.headers["cookie"] = response.headers['set-cookie'];

                            logger.debug('Application resources deployment started.');
                            utils.bspApplicationDeployResources(adtConfig, deploymentSync.resourcesSync).then(
                                function(result) {

                                    utils.bspApplicationIndexCalculation(adtConfig, serverConfig).then(
                                        function(result) {
                                            return res.status(200).json({ status: 'Success', message: 'Application was deployed.' });
                                        },
                                        function(error) {
                                            logger.error('Error', error);
                                            return res.status(500).json({ status: 'Error', message: error });
                                        }

                                    );
                                },
                                function(error) {
                                    logger.error('Error', error);
                                    return res.status(500).json({ status: 'Error', message: error });
                                }
                            );


                        },
                        function(error) {
                            logger.error('Application resources read failed.', error);
                            return res.status(500).json({ status: 'Error', message: error });


                        })
                    .catch(
                        function(ex) {
                            logger.error('Exception', ex);
                            return res.status(500).json({ status: 'Error', message: ex.toString() });
                        }
                    );

            }
        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }

    },

    sapSystemsList: function(req, res) {

        try {

            var file = serverConfig.sapSystems;
            jsonfile.readFile(file, function(err, data) {

                if (err) {
                    logger.error('Error', err);
                    return res.status(500).json({ status: 'Error', message: err });
                }
                return res.status(200).json(data);

            });
        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }

    },

    proxyList: function(req, res) {

        try {

            var file = serverConfig.reverseProxies;
            jsonfile.readFile(file, function(err, data) {

                if (err) {
                    logger.error('Error', err);
                    return res.status(500).json({ status: 'Error', message: err });
                }
                return res.status(200).json(data);

            });
        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }

    },

    proxyNew: function(req, res) {

        try {
            var proxyName = 'proxy' + '-' + uuid.v1().replace(/-/g, '');

            var file = serverConfig.reverseProxies;
            jsonfile.readFile(file, function(err, data) {

                if (err) {
                    logger.error('Error', err);
                    return res.status(500).json({ status: 'Error', message: err });
                }

                var newData = {};
                if (!data.proxies) {
                    newData = {
                        "proxies": []
                    };
                } else {
                    newData = data;
                }

                newData.proxies.push({
                    "name": proxyName,
                    "description": req.body.description ? req.body.description : req.body.targetHost,
                    "targetHost": req.body.targetHost,
                    "path": req.body.path,
                    "pathRewrite": req.body.pathRewrite,
                    "targetHeaders": req.body.targetHeaders,
                    "created_at": new Date().toISOString(),
                    "updated_at": new Date().toISOString()
                });

                jsonfile.writeFile(file, newData, { spaces: 2, EOL: '\r\n' }, function(err) {
                    if (err) {
                        logger.error('Error', err);
                        return res.status(500).json({ status: 'Error', message: err });
                    }
                    logger.debug('Reverse proxy created.');
                    return res.status(201).json({ status: 'Success', message: 'Reverse proxy created.' });
                });

            });
        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }
    },

    proxyEdit: function(req, res) {

        try {
            var proxyName = req.body.name;

            var file = serverConfig.reverseProxies;
            jsonfile.readFile(file, function(err, data) {

                if (err) {
                    logger.error('Error', err);
                    return res.status(500).json({ status: 'Error', message: err });
                }

                var editData = {};
                if (!data.proxies) {
                    return res.status(500).json({ status: 'Error', message: 'No proxies found.' });
                }

                for (var i = 0, iLength = data.proxies.length; i < iLength; i++) {
                    if (data.proxies[i].name == proxyName) {
                        editData = data.proxies[i];
                    }
                }

                editData.description = req.body.description ? req.body.description : editData.description;
                editData.path = req.body.path ? req.body.path : editData.path;
                editData.targetHost = req.body.targetHost ? req.body.targetHost : editData.targetHost;
                editData.pathRewrite = req.body.pathRewrite ? req.body.pathRewrite : editData.pathRewrite;
                editData.targetHeaders = req.body.targetHeaders ? req.body.targetHeaders : editData.targetHeaders;
                editData.updated_at = new Date().toISOString();

                jsonfile.writeFile(file, data, { spaces: 2, EOL: '\r\n' }, function(err) {
                    if (err) {
                        logger.error('Error', err);
                        return res.status(500).json({ status: 'Error', message: err });
                    }

                    logger.debug('Reverse proxy setup was updated.');
                    return res.status(200).json({ status: 'Success', message: 'Reverse proxy was updated.' });
                });


            });
        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }
    },

    proxyDelete: function(req, res) {

        var proxyName = req.body.name;
        var deleteIndex;
        var isDelete = false;

        try {

            logger.debug('Deleting reverse proxy:', proxyName);

            var file = serverConfig.reverseProxies;
            jsonfile.readFile(file, function(err, data) {

                if (err) {
                    logger.error('Error', err);
                    return res.status(500).json({ status: 'Error', message: err });
                }

                var editData = {};
                if (!data.proxies) {
                    return res.status(500).json({ status: 'Error', message: 'No proxies found.' });
                }

                if (proxyName) {

                    for (var i = 0, iLength = data.proxies.length; i < iLength; i++) {
                        if (data.proxies[i].name == proxyName) {
                            logger.debug('Content to be deleted found ...');
                            editData = data;
                            editData.proxies.splice(i, 1);
                            break;
                        }
                    }

                    jsonfile.writeFile(file, editData, { spaces: 2, EOL: '\r\n' }, function(err) {
                        if (err) {
                            logger.error('Error', err);
                            return res.status(500).json({ status: 'Error', message: err });
                        }
                        logger.debug('Reverse proxy deleted.');
                        return res.status(200).json({ status: 'Success', message: 'Reverse proxy deleted.' });
                    });

                } else {
                    logger.debug('Reverse proxy not found.');
                    return res.status(200).json({ status: 'Success', message: 'No content deleted.' });
                }

            });

        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }
    },

    sapSystemNew: function(req, res) {

        try {
            var systemName = 'sap' + '-' + uuid.v1().replace(/-/g, '');

            var file = serverConfig.sapSystems;
            jsonfile.readFile(file, function(err, data) {

                if (err) {
                    logger.error('Error', err);
                    return res.status(500).json({ status: 'Error', message: err });
                }

                var newData = {};
                if (!data.systems) {
                    newData = {
                        "systems": []
                    };
                } else {
                    newData = data;
                }

                newData.systems.push({
                    "name": systemName,
                    "description": req.body.description ? req.body.description : req.body.url,
                    "url": req.body.url,
                    "bsp_url_pattern": req.body.bsp_url_pattern,
                    "created_at": new Date().toISOString(),
                    "updated_at": new Date().toISOString()
                });

                jsonfile.writeFile(file, newData, { spaces: 2, EOL: '\r\n' }, function(err) {
                    if (err) {
                        logger.error('Error', err);
                        return res.status(500).json({ status: 'Error', message: err });
                    }

                    return res.status(201).json({ status: 'Success', message: 'SAP System created.' });
                });

            });
        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }
    },

    sapSystemEdit: function(req, res) {

        try {
            var systemName = req.body.name;

            var file = serverConfig.sapSystems;
            jsonfile.readFile(file, function(err, data) {

                if (err) {
                    logger.error('Error', err);
                    return res.status(500).json({ status: 'Error', message: err });
                }

                var editData = {};
                if (!data.systems) {
                    return res.status(500).json({ status: 'Error', message: 'No systems found.' });
                }

                for (var i = 0, iLength = data.systems.length; i < iLength; i++) {
                    if (data.systems[i].name == systemName) {
                        editData = data.systems[i];
                    }
                }

                editData.url = req.body.url ? req.body.url : editData.url;
                editData.bsp_url_pattern = req.body.bsp_url_pattern ? req.body.bsp_url_pattern : editData.bsp_url_pattern;
                editData.description = req.body.description ? req.body.description : editData.description;
                editData.updated_at = new Date().toISOString();

                jsonfile.writeFile(file, data, { spaces: 2, EOL: '\r\n' }, function(err) {
                    if (err) {
                        logger.error('Error', err);
                        return res.status(500).json({ status: 'Error', message: err });
                    }

                    logger.debug('SAP System connection was updated.');
                    return res.status(200).json({ status: 'Success', message: 'System was updated.' });
                });


            });
        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }
    },

    sapSystemDelete: function(req, res) {

        var systemName = req.body.name;
        var deleteIndex;
        var isDelete = false;

        try {

            logger.debug('Deleting SAP System:', systemName);

            var file = serverConfig.sapSystems;
            jsonfile.readFile(file, function(err, data) {

                if (err) {
                    logger.error('Error', err);
                    return res.status(500).json({ status: 'Error', message: err });
                }

                var editData = {};
                if (!data.systems) {
                    return res.status(500).json({ status: 'Error', message: 'No systems found.' });
                }

                if (systemName) {

                    for (var i = 0, iLength = data.systems.length; i < iLength; i++) {
                        if (data.systems[i].name == systemName) {
                            logger.debug('Content to be deleted found ...');
                            editData = data;
                            editData.systems.splice(i, 1);
                            break;
                        }
                    }

                    jsonfile.writeFile(file, editData, { spaces: 2, EOL: '\r\n' }, function(err) {
                        if (err) {
                            logger.error('Error', err);
                            return res.status(500).json({ status: 'Error', message: err });
                        }

                        return res.status(200).json({ status: 'Success', message: 'System deleted.' });
                    });

                } else {
                    logger.debug('System not found.');
                    return res.status(200).json({ status: 'Success', message: 'No content deleted.' });
                }

            });

        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }
    },

    serverConfig: function(req, res) {

        var config = {};
        try {
            config['pathDelimiter'] = process.env.PATH_DELIMITER;
            config['appsDir'] = process.env.DEFAULT_APP_DIR;
            config['versionsDir'] = process.env.DEFAULT_VERSION_DIR;
            config['bspAppUrlPattern'] = serverConfig.bspAppUrlPattern;
            config['appsData'] = serverConfig.appsData;
            config['sapSystems'] = serverConfig.sapSystems;
            config['reverseProxies'] = serverConfig.reverseProxies;
            return res.status(200).json(config);
        } catch (ex) {
            logger.error('Exception', ex);
            return res.status(500).json({ status: 'Error', message: ex.toString() });
        }
    }

}

module.exports = Application;