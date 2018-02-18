const logger = require('../utils/logger.js');
const jsonfile = require('jsonfile');
const path = require('path');
const slash = require('slash');
const uglify = require('uglify-js');
const pd = require('pretty-data').pd;
const maxmin = require('maxmin');
const fs = require('fs-extra');
const requestPromise = require('request-promise');
const request = require('request');
const xmldoc = require('xmldoc');
const isBinaryFile = require("isbinaryfile");

var Utils = {
    writeFile: function(file, data, options) {

        return new Promise(function(resolve, reject) {
            try {

                jsonfile.writeFile(file, data, options, function(err) {
                    if (err) {
                        logger.error('Error', err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });

            } catch (ex) {
                logger.error('Exception:', ex);
                reject({ status: 'Error', message: ex.toString() });
            }
        });
    },

    adtSetConnection: function(adtConfig) {


        return new Promise(function(resolve, reject) {

            try {
                var options = adtConfig;

                if (!adtConfig.headers['x-csrf-token']) {
                    adtConfig.headers['x-csrf-token'] = 'Fetch';
                }

                request(adtConfig, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                        if (response.headers['x-csrf-token']) {
                            logger.debug('Token fetch successful.');
                            resolve(response);
                        }
                    } else {
                        if (response.statusCode == 404) {
                            logger.error('Error:', 'Resource not found');
                            reject('Resource not found');
                        }
                        logger.error('Error:', error);
                        reject(error ? error.toString() : 'Connection creation failed.');
                    }
                });
            } catch (ex) {
                logger.error('Exception:', ex);
                reject({ status: 'Error', message: ex.toString() });
            }

        });

    },

    createBspApplication: function(adtConfig) {

        return new Promise(function(resolve, reject) {

            try {
                if (!adtConfig) {
                    reject({ status: 'Error', message: 'No request configuration provided.' });
                }

                var adtCreateQuery = '?type=folder&isBinary=false' +
                    '&name=' + encodeURIComponent(adtConfig.bspProperties.bspApplication) +
                    '&description=' + encodeURIComponent(adtConfig.bspProperties.bspAppDescritpion) +
                    '&devclass=' + encodeURIComponent(adtConfig.bspProperties.bspAppPackage) +
                    '&corrNr=' + encodeURIComponent(adtConfig.bspProperties.bspTransport);

                adtConfig.method = 'POST';
                adtConfig.url = adtConfig.host + process.env.FILESTORE_OBJECTS_PATH + '/%20/content' + adtCreateQuery;

                request(adtConfig, function(error, response, body) {
                    if (error) {
                        logger.error('Error:', error, response.body);
                        reject(error ? error.toString() : response.body);
                    }

                    if (response.statusCode == 200 || response.statusCode == 201) {
                        logger.debug('Application was created.');
                        resolve('Application was created.');                      


                    } else {
                        if (response.statusCode == 404) {
                            logger.error('Error:', 'Application not found');
                            reject('Application not found');
                        }
                        logger.error('Error:', error, response.body);
                        reject(error ? error.toString() : response.body);
                    }
                });

            } catch (ex) {
                logger.error('Exception:', ex);
                reject({ status: 'Error', message: ex.toString() });
            }
        });


    },

    bspApplicationIndexCalculation: function(adtConfig, serverConfig) {

        return new Promise(function(resolve, reject) {

            try {
                adtConfig.method = 'POST';
                adtConfig.url = adtConfig.host + process.env.FILESTORE_APPINDEX_PATH + '/' + encodeURIComponent(adtConfig.bspProperties.bspApplication);

                logger.debug('Calculating application index for %s', adtConfig.bspProperties.bspApplication);

                logger.debug('Requesting GET:', adtConfig.url);

                request(adtConfig, function(error, response, body) {
                    if (error) {
                        logger.error('Error:', error);
                        reject(error ? error.toString() : error);
                    }

                    if (response.statusCode == 200 || response.statusCode == 201) {
                        logger.debug('Application index calculation for %s successful.', adtConfig.bspProperties.bspApplication);


                        Utils.updateApplicationVersionDeployemnt(adtConfig, serverConfig).then(
                            function(result) {
                                logger.debug('Application index calculation successful.and application version updated.');
                                resolve('Application index calculation successful.and application version updated.');
                            },
                            function(error) {
                              logger.error('Error:', error);
                                reject('Application version deployment section update failed.');
                            }
                        );

                    } else {
                        logger.error('Error:', response.body);
                        reject(response.body ? response.body : response);
                    }
                });

            } catch (ex) {
                logger.error('Exception:', ex);
                reject(ex.toString());
            }
        });
    },

    bspApplicationDeployResources: function(adtConfig, resourcesSync) {

        return new Promise(function(resolve, reject) {

            try {
                if (resourcesSync.length) {

                    var resourcesSyncItem = resourcesSync.shift();
                    if (resourcesSyncItem.type === 'folder') {
                        if (resourcesSyncItem.syncMode === 'update') {
                            logger.debug('Updating folder %s', resourcesSyncItem.name);
                            // No action needed in case of fodler update
                            if (resourcesSync.length) {
                                Utils.bspApplicationDeployResources(adtConfig, resourcesSync).then(
                                    function(resourcesSync) {
                                        resolve(resourcesSync);
                                    },
                                    function(error) {
                                        reject(error);
                                    }
                                );
                            } else {
                                resolve(resourcesSync);
                            }
                        } else {
                            logger.debug('Deploying folder %s', resourcesSyncItem.name);
                            Utils.deployFolder(adtConfig, resourcesSyncItem).then(
                                function(result) {
                                    if (resourcesSync.length) {
                                        Utils.bspApplicationDeployResources(adtConfig, resourcesSync).then(
                                            function(resourcesSync) {
                                                resolve(resourcesSync);
                                            },
                                            function(error) {
                                                reject(error);
                                            }
                                        );
                                    } else {
                                        resolve(result);
                                    }

                                },
                                function(error) {
                                    reject(error);
                                }
                            );
                        }

                    } else {
                        logger.debug('Deploying file %s', resourcesSyncItem.name);
                        Utils.deployFile(adtConfig, resourcesSyncItem).then(
                            function(result) {
                                if (resourcesSync.length) {
                                    Utils.bspApplicationDeployResources(adtConfig, resourcesSync).then(
                                        function(resourcesSync) {
                                            resolve(resourcesSync);
                                        },
                                        function(error) {
                                            reject(error);
                                        }
                                    );
                                } else {
                                    resolve(result);
                                }

                            },
                            function(error) {
                                reject(error);
                            }
                        );

                    }
                } else {
                    reject('No resources to be deployed found.')
                }
            } catch (ex) {
                logger.error('Exception:', ex);
                reject(ex.toString());
            }
        });
    },

    parseSyncId: function(id, separator = '%2f') {
        const lastIndex = id.lastIndexOf(separator);
        return {
            path: id.substr(0, lastIndex),
            filename: id.substr(lastIndex + separator.length),
        };
    },

    deployFolder: function(adtConfig, syncData) {
        return new Promise(function(resolve, reject) {

            try {

                var deployId = Utils.parseSyncId(syncData.id);

                switch (syncData.syncMode) {
                    case 'create':

                        var adtCreateQuery = '?type=folder&isBinary=false' +
                            '&name=' + encodeURIComponent(deployId.filename) +
                            '&devclass=' + encodeURIComponent(adtConfig.bspProperties.bspAppPackage) +
                            '&corrNr=' + encodeURIComponent(adtConfig.bspProperties.bspTransport);

                        adtConfig.method = 'POST';
                        adtConfig.url = adtConfig.host + process.env.FILESTORE_OBJECTS_PATH + '/' + encodeURIComponent(deployId.path) + '/content' + adtCreateQuery;

                        break;

                    case 'update':
                        // No action needed in case of fodler update   
                        break;

                    case 'delete':
                        var adtCreateQuery = '?deleteChildren=true&isBinary=false' +
                            '&corrNr=' + encodeURIComponent(adtConfig.bspProperties.bspTransport);

                        adtConfig.method = 'DELETE';
                        adtConfig.url = adtConfig.host + process.env.FILESTORE_OBJECTS_PATH + '/' + encodeURIComponent(syncData.id) + '/content' + adtCreateQuery;

                        adtConfig.headers['If-Match'] = '*';

                        break;
                }

                request(adtConfig, function(error, response, body) {
                    if (error) {
                        logger.error('Error:', error);
                        reject(error ? error.toString() : error);
                    }

                    if (response.statusCode == 200 || response.statusCode == 201) {
                        logger.debug('Resource %s was deployed.', deployId.filename);
                        resolve('Resource deployed.');
                    } else {
                        logger.error('Error:', response.body);
                        reject(response.body ? response.body : response);
                    }
                });

            } catch (ex) {
                logger.error('Exception:', ex);
                reject(ex.toString());
            }
        });
    },


    deployFile: function(adtConfig, syncData) {
        return new Promise(function(resolve, reject) {

            try {


                isBinaryFile(syncData.name, function(error, fileBinary) {


                    var deployId = Utils.parseSyncId(syncData.id);

                    switch (syncData.syncMode) {
                        case 'create':

                            var adtCreateQuery = '?type=file&charset=UTF-8' +
                                '&isBinary=' + fileBinary +
                                '&name=' + encodeURIComponent(deployId.filename) +
                                '&devclass=' + encodeURIComponent(adtConfig.bspProperties.bspAppPackage) +
                                '&corrNr=' + encodeURIComponent(adtConfig.bspProperties.bspTransport);

                            adtConfig.method = 'POST';
                            adtConfig.url = adtConfig.host + process.env.FILESTORE_OBJECTS_PATH + '/' + encodeURIComponent(deployId.path) + '/content' + adtCreateQuery;

                            adtConfig.headers['Content-Type'] = 'application/octet-stream';

                            fs.readFile(syncData.name, function(error, data) {
                                adtConfig.body = data;

                                Utils.asyncRequest(adtConfig).then(
                                    function(response) {
                                        if (response.statusCode == 200 || response.statusCode == 201) {
                                            logger.debug('Resource %s was deployed.', deployId.filename);
                                            resolve('Resource deployed.');
                                        } else {
                                            logger.error('Error:', response.body);
                                            reject(response.body);
                                        }
                                    },
                                    function(error) {
                                        logger.error('Error:', error);
                                        reject(error ? error.toString() : error);
                                    }
                                );
                            });



                            break;

                        case 'update':

                            var adtCreateQuery = '?charset=UTF-8' +
                                '&isBinary=' + fileBinary +
                                '&corrNr=' + encodeURIComponent(adtConfig.bspProperties.bspTransport);

                            adtConfig.method = 'PUT';
                            adtConfig.url = adtConfig.host + process.env.FILESTORE_OBJECTS_PATH + '/' + encodeURIComponent(syncData.id) + '/content' + adtCreateQuery;

                            adtConfig.headers['Content-Type'] = 'application/octet-stream';
                            adtConfig.headers['If-Match'] = '*';

                            fs.readFile(syncData.name, function(error, data) {
                                adtConfig.body = data;

                                Utils.asyncRequest(adtConfig).then(
                                    function(response) {
                                        if (response.statusCode == 200 || response.statusCode == 201) {
                                            logger.debug('Resource was deployed.', deployId.filename);
                                            resolve('Resource deployed.');
                                        } else {
                                            logger.error('Error:', response.body);
                                            reject(response.body);
                                        }
                                    },
                                    function(error) {
                                        logger.error('Error:', error);
                                        reject(error ? error.toString() : error);
                                    }
                                );
                            });



                            break;

                        case 'delete':

                            var adtCreateQuery = '?corrNr=' + encodeURIComponent(adtConfig.bspProperties.bspTransport);

                            adtConfig.method = 'DELETE';
                            adtConfig.url = adtConfig.host + process.env.FILESTORE_OBJECTS_PATH + '/' + encodeURIComponent(syncData.id) + '/content' + adtCreateQuery;

                            adtConfig.headers['If-Match'] = '*';

                            logger.debug('Requesting DELETE:', adtConfig.url);

                            Utils.asyncRequest(adtConfig).then(
                                function(response) {
                                    if (response.statusCode == 200 || response.statusCode == 201) {
                                        logger.debug('Resource was deployed.', deployId.filename);
                                        resolve('Resource deployed.');
                                    } else {
                                        logger.error('Error:', response.body);
                                        reject(response.body);
                                    }
                                },
                                function(error) {
                                    logger.error('Error:', error);
                                    reject(error ? error.toString() : error);
                                }
                            );

                            break;
                    }

                });

            } catch (ex) {
                logger.error('Exception:', ex);
                reject(ex.toString());
            }
        });
    },

    updateApplicationVersionDeployemnt: function(adtConfig, serverConfig) {

        var appName = adtConfig.appName;
        var versionId = adtConfig.versionId;

        return new Promise(function(resolve, reject) {

            try {

                logger.debug('Updating application version:', versionId);

                var file = serverConfig.appsData;
                jsonfile.readFile(file, function(err, data) {

                    if (err) {
                        logger.error('Error', err);
                        reject(err ? err.toString() : 'File read error.');
                    }

                    var editData = {};
                    if (!data.applications) {
                        reject('No applications found.');
                    }

                    for (var i = 0, iLength = data.applications.length; i < iLength; i++) {
                        if (data.applications[i].name == appName) {
                            editData = data.applications[i];
                            break;
                        }
                    }

                    if (editData.versions) {
                        var deploymentInfo = {};
                        for (var j = 0, jLength = editData.versions.length; j < jLength; j++) {
                            if (editData.versions[j].version_directory == versionId) {
                                if (!editData.versions[j].deployments) {
                                    editData.versions[j]['deployments'] = [];
                                }

                                var deployedAt = new Date().toISOString();
                                editData.versions[j]['last_deployment_info'] = {
                                    systemDescription: adtConfig.systemDescription,
                                    deployed_at: deployedAt
                                }
                                
                                var systemUrl = adtConfig.systemUrl.replace(/\/+$/, ''); 
                                var bspAppUrl = adtConfig.bspUrlPattern.replace('{applicationServerUrl}', systemUrl).replace('{bspApplication}', adtConfig.bspProperties.bspApplication);

                                deploymentInfo = {
                                    bspApplication: adtConfig.bspProperties.bspApplication,
                                    bspAppDescritpion: adtConfig.bspProperties.bspAppDescritpion,
                                    bspAppPackage: adtConfig.bspProperties.bspAppPackage,
                                    bspTransport: adtConfig.bspProperties.bspTransport,
                                    systemDescription: adtConfig.systemDescription,
                                    systemUrl: systemUrl,
                                    bspAppUrl: bspAppUrl,
                                    deployed_at: deployedAt
                                };

                                editData.versions[j].deployments.push(deploymentInfo);
                                break;
                            }
                        }

                        jsonfile.writeFile(file, data, { spaces: 2, EOL: '\r\n' }, function(err) {
                            if (err) {
                                logger.error('Error', err);
                                reject(err ? err.toString() : 'File write error.');
                            }

                            resolve(deploymentInfo);
                        });
                    } else {
                        reject('No versions found.');
                    }
                });

            } catch (ex) {
                logger.error('Exception:', ex);
                reject({ status: 'Error', message: ex.toString() });
            }
        });


    },

    getBspApplicationsList: function(adtConfig) {

        return new Promise(function(resolve, reject) {

            logger.debug('Collecting BSP applications.');

            if (!adtConfig) {
                reject({ status: 'Error', message: 'No request configuration provided.' });
            }

            request(adtConfig, function(error, response, body) {
                if (error) {
                    logger.error(error);
                    reject(error ? error.toString() : error);
                }

                if (response.statusCode == 200) {
                    var responseXml = new xmldoc.XmlDocument(response.body);
                    var bspApsList = [];
                    responseXml.childrenNamed('atom:entry').map(function(node) {

                        bspApsList.push({
                            id: node.valueWithPath('atom:id'),
                            name: node.valueWithPath('atom:id').replace(new RegExp('%2f', 'g'), '/'),
                            description: node.valueWithPath('atom:summary')
                        });

                    });

                    resolve(bspApsList);
                } else {
                    if (response.statusCode == 404) {
                        logger.error('Application not found.', response.body);
                        reject('Application not found.');
                    }

                    if (response.statusCode == 403) {
                        logger.error('%s Access forbidden.', response.statusCode);
                        reject('Access forbidden.');
                    }

                    if (response.statusCode == 401) {
                        logger.error('%s Unauthorized access.', response.statusCode);
                        reject('Unauthorized access.');
                    }

                    logger.error('Error:', error);
                    reject(error);
                }
            });
        });

    },

    getPackagesList: function(adtConfig) {

        return new Promise(function(resolve, reject) {

            logger.debug('Collecting packages.');

            if (!adtConfig) {
                reject({ status: 'Error', message: 'No request configuration provided.' });
            }

            request(adtConfig, function(error, response, body) {
                if (error) {
                    logger.error(error);
                    reject(error ? error.toString() : error);
                }

                if (response.statusCode == 200) {
                    var responseXml = new xmldoc.XmlDocument(response.body);
                    var packagesList = [];
                    responseXml.childrenNamed('adtcore:objectReference').map(function(node) {

                        packagesList.push({
                            id: node.attr['adtcore:uri'],
                            description: node.attr['adtcore:name'],
                            name: node.attr['adtcore:uri'].replace('/sap/bc/adt/vit/wb/object_type/devck/object_name/', '').replace(new RegExp('%2f', 'g'), '/')
                        });

                    });

                    resolve(packagesList);
                } else {
                    if (response.statusCode == 404) {
                        logger.error('Application not found.', response.body);
                        reject('Application not found.');
                    }

                    if (response.statusCode == 403) {
                        logger.error('%s Access forbidden.', response.statusCode);
                        reject('Access forbidden.');
                    }

                    if (response.statusCode == 401) {
                        logger.error('%s Unauthorized access.', response.statusCode);
                        reject('Unauthorized access.');
                    }

                    logger.error('Error:', error);
                    reject(error);
                }
            });
        });

    },

    readSourceDir: function(bspApplication, dirPath, list) {

        return new Promise(function(resolve, reject) {
            try {
                logger.debug('Collect files from %s', dirPath);
                var fileList = [];
                var bspAppDir = '';
                var getAllFiles = function(bspApplication, parentDir, dir, fileList) {

                    var files = fs.readdirSync(dir);
                    fileList = fileList || [];
                    files.forEach(function(file) {
                        if (fs.statSync(path.join(dir, file)).isDirectory()) {
                            bspAppDir = dir.replace(/\\/g, '/').replace(parentDir, '');
                            bspAppDir = bspAppDir.length ? '/' + bspAppDir : '';
                            bspAppDir = bspAppDir.replace(new RegExp('/', 'g'), '%2f');

                            fileList.push({
                                id: bspApplication + bspAppDir + '%2f' + file,
                                name: slash(path.join(dir, file)),
                                type: 'folder'
                            });

                            fileList = getAllFiles(bspApplication, parentDir, path.join(dir, file), fileList);

                        } else {
                            bspAppDir = dir.replace(/\\/g, '/').replace(parentDir, '');
                            bspAppDir = bspAppDir.length ? '/' + bspAppDir : '';
                            bspAppDir = bspAppDir.replace(new RegExp('/', 'g'), '%2f');

                            fileList.push({
                                id: bspApplication + bspAppDir + '%2f' + file,
                                name: slash(path.join(dir, file)),
                                type: 'file'
                            });
                        }
                    });
                    return fileList;
                };

                getAllFiles(bspApplication, dirPath, dirPath, fileList);

                resolve(fileList);

            } catch (ex) {
                reject(ex);
            }
        });
    },

    asyncRequest: function(adtConfig) {
        return new Promise(function(resolve, reject) {
            request(adtConfig, function(error, response, body) {

                if (error) {
                    reject(error);
                }

                if (!error && (response.statusCode == 200 || response.statusCode == 201)) {
                    resolve(response);
                } else {
                    if (response.statusCode == 404) {
                        resolve(response);
                    }
                    reject(response.body);
                }
            });
        });
    },

    collectResourcesServer: function(adtConfig, items, recursionCheck = {}, recursionId) {

        if (!items) {
            items = [];
        }

        return new Promise(function(resolve, reject) {
            try {
                Utils.asyncRequest(adtConfig).then(
                    function(response) {

                        if (response.statusCode == 404) {
                            resolve(items);
                        }

                        if (response.statusCode == 200) {
                            var responseXml = new xmldoc.XmlDocument(response.body);
                            var currentFolderItems = [];
                            responseXml.childrenNamed('atom:entry').map(function(node) {
                                var id = node.valueWithPath('atom:id');

                                currentFolderItems.push({
                                    id: id,
                                    type: node.valueWithPath('atom:category@term')
                                });

                                items.push({
                                    id: id,
                                    name: id.replace(new RegExp('%2f', 'g'), '/'),
                                    type: node.valueWithPath('atom:category@term')
                                });
                            });

                            var checkFolder = function(item) {
                                return item.type === 'folder'
                            }

                            var subFolders = currentFolderItems.filter(checkFolder);
                            if (subFolders.length) {
                                recursionCheck[recursionId] = true;

                                for (var i = 0, iLength = subFolders.length; i < iLength; i++) {
                                    recursionCheck[subFolders[i].id] = false;
                                }

                                for (var i = 0, iLength = subFolders.length; i < iLength; i++) {
                                    var subFolder = subFolders[i];

                                    recursionId = subFolder.id;

                                    adtConfig.url = adtConfig.host + process.env.FILESTORE_OBJECTS_PATH + '/' + encodeURIComponent(subFolder.id) + '/content';

                                    Utils.collectResourcesServer(adtConfig, items, recursionCheck, recursionId).then(
                                        function(items) {
                                            resolve(items);
                                        },
                                        function(error) {
                                            logger.error('Error', error);
                                            reject(error);
                                        }
                                    );
                                }
                            } else {
                                items.sort(function(valueA, valueB) {
                                    return valueA.name.localeCompare(valueB.name);
                                });

                                recursionCheck[recursionId] = true;

                                var isComplete = true;
                                for (var prop in recursionCheck) {
                                    if (!recursionCheck[prop]) {
                                        isComplete = false;
                                    }
                                }

                                if (isComplete) {
                                    resolve(items);
                                }


                            }
                        } else {
                            logger.error('Error:', error);
                            reject({ status: 'Error', message: error.toString() });
                        }

                    },
                    function(error) {
                        logger.error('Error', error);
                        reject(error);
                    }
                );
            } catch (ex) {
                reject(ex);
            }
        });

    },

    getresourcesSync(resourcesServer, resourcesLocal) {
        var resourcesSync = resourcesLocal.map(localEntry => {
            var serverResourcesExists = !!resourcesServer.find(
                serverEntry => serverEntry.type === localEntry.type && serverEntry.id === localEntry.id
            );
            return Object.assign({}, localEntry, { syncMode: serverResourcesExists ? 'update' : 'create' });
        });
        resourcesServer.forEach(serverEntry => {
            var localEntryExists = !!resourcesLocal.find(
                localEntry => localEntry.type === serverEntry.type && localEntry.id === serverEntry.id
            );
            if (!localEntryExists) {
                resourcesSync.push(Object.assign({}, serverEntry, { syncMode: 'delete' }));
            }
        });
        return Utils.sortResourcesForProcessing(resourcesSync);
    },

    sortResourcesForProcessing(entries) {
        var files = entries.filter(file => file.type === 'file');
        var folders = entries.filter(folder => folder.type === 'folder')
            .map(folder => Object.assign({}, folder, {
                level: folder.name.split('/').length - 1
            }));

        const createFiles = files.filter(file => file.syncMode === 'create');
        const updateFiles = files.filter(file => file.syncMode === 'update');
        const deleteFiles = files.filter(file => file.syncMode === 'delete');

        const createFolders = folders.filter(folder => folder.syncMode === 'create');
        const updateFolders = folders.filter(folder => folder.syncMode === 'update');
        const deleteFolders = folders.filter(folder => folder.syncMode === 'delete');

        deleteFolders.sort((folderA, folderB) => folderB.level - folderA.level); // highest level first
        createFolders.sort((folderA, folderB) => folderA.level - folderB.level); // lowest level first

        return [].concat(
            deleteFiles,
            deleteFolders,
            createFolders,
            updateFolders, // not processed by ADT
            createFiles,
            updateFiles
        );
    },

    getSapTransportsList: function(adtConfig, bspProperties) {

        return new Promise(function(resolve, reject) {
            try {
                logger.debug('Collecting transports.');

                var sapPackage = adtConfig.bspProperties.bspAppPackage ? adtConfig.bspProperties.bspAppPackage : '';

                adtConfig.url = adtConfig.host + process.env.TRANSPORT_PATH; // Transports
                adtConfig.method = 'POST';
                adtConfig.headers['Content-Type'] = 'application/xml';
                adtConfig.body = '<?xml version="1.0" encoding="UTF-8"?>' +
                    '<asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">' +
                    '<asx:values>' +
                    '<DATA>' +
                    '<PGMID/>' +
                    '<OBJECT/>' +
                    '<OBJECTNAME/>' +
                    '<DEVCLASS>' + sapPackage + '</DEVCLASS>' +
                    '<OPERATION>I</OPERATION>' +
                    '<URI>/sap/bc/adt/filestore/ui5-bsp/objects/' + adtConfig.bspProperties.bspApplication + '/$create</URI>' +
                    '</DATA>' +
                    '</asx:values>' +
                    '</asx:abap>';

                request(adtConfig, function(error, response, body) {

                    if (error) {
                        logger.error('Error', error);
                        reject(error);
                    }

                    if (!error && (response.statusCode == 200)) {
                        logger.debug('Transports list collected.');

                        var responseXml = new xmldoc.XmlDocument(response.body);
                        var transportsList = {
                            requests: [],
                            locks: [],
                            messages: []
                        };

                        var requestList = responseXml.childNamed('asx:values').childNamed('DATA').childNamed('REQUESTS').childrenNamed('CTS_REQUEST');

                        if (requestList) {
                            requestList.map(function(node) {
                                if (node) {
                                    transportsList.requests.push({
                                        id: node.childNamed('REQ_HEADER').valueWithPath('TRKORR'),
                                        description: node.childNamed('REQ_HEADER').valueWithPath('AS4TEXT')
                                    });
                                }

                            });
                        }

                        var requestLocksList = responseXml.childNamed('asx:values').childNamed('DATA').childNamed('LOCKS').childrenNamed('CTS_OBJECT_LOCK');
                        if (requestLocksList) {
                            requestLocksList.map(function(node) {
                                if (node) {
                                    transportsList.locks.push({
                                        id: node.childNamed('LOCK_HOLDER').childNamed('REQ_HEADER').valueWithPath('TRKORR'),
                                        description: node.childNamed('LOCK_HOLDER').childNamed('REQ_HEADER').valueWithPath('AS4TEXT')
                                    });
                                }

                            });
                        }

                        var messagesList = responseXml.childNamed('asx:values').childNamed('DATA').childNamed('MESSAGES').childrenNamed('CTS_MESSAGE');                        
                        if (messagesList) {
                            messagesList.map(function(node) {
                                if (node) {
                                    transportsList.messages.push({
                                        message: node.valueWithPath('TEXT'),
                                        status: node.valueWithPath('SEVERITY') == 'E' ? 'Error' : 'Warning'
                                    });
                                }

                            });
                        }

                        resolve(transportsList);
                    } else {
                        logger.error('Error', response.body);
                        reject(response.body);
                    }
                });

            } catch (ex) {
                reject(ex);
            }
        });
    },

    buildComponentPreload: function(appName, versionExtId, pathPrefix, srcRepoPath) {

        return new Promise(function(resolve, reject) {

            // replace last "/" in case is provided
            if (pathPrefix.slice(-1) === '/') {
                pathPrefix = pathPrefix.replace(/.$/, '');
            }

            var sourceRepoDir = process.env.ROOT_DIR_REL + '/' + process.env.APPS_DIR + '/' + appName + srcRepoPath;
            logger.debug('Build process started for folder %s ', sourceRepoDir);

            // ** Setup
            var preloadInfo = {
                moduleName: 'Component-preload',
                ext: '.js',
                indicatorFile: 'Component.js',
                processContent: function(content) {
                    return 'jQuery.sap.registerPreloadedModules(' + content + ');';
                }
            };
            var options = {
                compress: true
            }
            var copyrightCommentsPattern = /copyright|\(c\)|released under|license|\u00a9/i;
            var xmlHtmlPrePattern = /<(?:\w+:)?pre>/;
            // ** Setup



            var fileList = [];
            var getAllFiles = function(dir, fileList) {

                var files = fs.readdirSync(dir);
                fileList = fileList || [];
                files.forEach(function(file) {
                    if (fs.statSync(path.join(dir, file)).isDirectory()) {
                        fileList = getAllFiles(path.join(dir, file), fileList);
                    } else {
                        fileList.push({
                            fullpath: slash(path.join(dir, file)),
                            apppath: pathPrefix + '/' + slash(path.join(dir, file)).replace(sourceRepoDir, ''),
                            filename: file
                        });
                    }
                });
                return fileList;
            };
            getAllFiles(sourceRepoDir, fileList);

            if (fileList.length === 0) {
                logger.error('No files found in the application root folder.');
                reject({ status: 'Error', message: 'No files found in the application root folder.' });
            }

            var preloadFiles = [];

            for (var i = 0, len = fileList.length; i < len; i++) {
                if (fileList[i].filename === preloadInfo.indicatorFile) {
                    preloadFiles.push(fileList[i].apppath);
                }
            }
            if (preloadFiles.length === 0) {
                logger.error('No "' + preloadInfo.indicatorFile + '" file found. ');
                reject({ status: 'Error', message: 'No "' + preloadInfo.indicatorFile + '" file found.' });

            }

            preloadFiles.forEach(function(preloadFile) {
                var preloadDir = path.dirname(preloadFile);
                var preloadModuleName = preloadDir + '/' + preloadInfo.moduleName;
                logger.debug('Creating preload module for ' + preloadFile);


                var preloadObject = {
                    version: '2.0',
                    name: preloadModuleName,
                    modules: {}
                };

                preloadObject.name = preloadModuleName;

                var iPreloadOriginalSize = 0;
                var iPreloadCompressedSize = 0;

                for (var i = 0, len = fileList.length; i < len; i++) {

                    // Check file formats
                    var regFileExtensionCheck = /^.*\.js$|^.*\.xml$|^.*\.json$/;
                    var componentPreloadFile = preloadInfo.moduleName + preloadInfo.ext;
                    if (regFileExtensionCheck.test(fileList[i].filename) && fileList[i].filename !== componentPreloadFile) {

                        var fileName = fileList[i].fullpath;
                        var fileContent = fs.readFileSync(fileName, 'utf8');
                        var fileExtension = path.extname(fileName);

                        var iOriginalSize, iCompressedSize;

                        if (options.compress) {
                            iOriginalSize = fileContent.length;
                            iPreloadOriginalSize += iOriginalSize;

                            if (options.compress === true) {
                                options.compress = {};
                            }

                            options.compress.uglifyjs = options.compress.uglifyjs || {};

                            // Always override given options, override shouldn't be possible
                            options.compress.uglifyjs.fromString = true;

                            //options.compress.uglifyjs.warnings = true;

                            // Set default "comments" option if not given already
                            options.compress.uglifyjs.output = options.compress.uglifyjs.output || {};
                            if (!options.compress.uglifyjs.output.hasOwnProperty("comments")) {
                                options.compress.uglifyjs.output.comments = copyrightCommentsPattern;
                            }

                            try {
                                switch (fileExtension) {
                                    case '.js':
                                        // uglify javascript 
                                        /*
                                        compressor.minify({
                                          compressor: 'gcc',
                                          input: 'foo.js',
                                          output: 'bar.js',
                                          callback: function (err, min) {}
                                        });
                                        */

                                        fileContent = uglify.minify(fileContent, options.compress.uglifyjs).code;

                                        break;
                                    case '.json':
                                        // parse anc covert to string
                                        fileContent = JSON.stringify(JSON.parse(fileContent));
                                        break;
                                    case '.xml':
                                        // minify xml; avoid xml with <*:pre> tag to avoid destroing the formatting
                                        if (!xmlHtmlPrePattern.test(fileContent)) {
                                            fileContent = pd.xmlmin(fileContent, false);
                                        }
                                        break;
                                }

                            } catch (ex) {
                                logger.error('Failed to compress ' + fileName + ' probably due to a syntax error in the file.', ex);
                                // Do not reject here, just use the not-minified content
                                // reject({ status: 'Error', message: 'Failed to compress ' + fileName + ' probably due to a syntax error in the file. Exception:' + ex.toString() });
                            }

                            iCompressedSize = fileContent.length;
                            iPreloadCompressedSize += iCompressedSize;
                        }
                        preloadObject.modules[fileList[i].apppath] = fileContent;

                    }
                }

                var content = JSON.stringify(preloadObject, null, '\t');
                if (typeof preloadInfo.processContent === 'function') {
                    content = preloadInfo.processContent(content);
                }

                var componentFilePath = process.env.ROOT_DIR_REL + '/' + process.env.VERSIONS_DIR + '/' + versionExtId + '/' + process.env.DIST_VERSION_DIR + '/' + preloadInfo.moduleName + preloadInfo.ext;
                fs.writeFile(componentFilePath, content, function(err) {
                    if (err) {
                        logger.error('Error:', err);
                        reject({ status: 'Error', message: err.toString() });
                    }
                    logger.debug('File ' + componentFilePath + ' was saved.');
                    resolve({ status: 'Success', message: 'File ' + componentFilePath + ' was saved.' });
                });
            });

        });
    }
}

module.exports = Utils;