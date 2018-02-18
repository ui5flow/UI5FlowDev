sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function(JSONModel, Device) {
	"use strict";

	return {

		initDeviceModel: function() {
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},

		initGlobalPropertiesModel: function() {

			var oGlobalProperties = {
				"host": window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port : ''),
				"route-applicationsList": "/api/applications",
				"route-applicationNew": "/api/application",
				"route-applicationUpdate": "/api/application",
				"route-applicationsDelete": "/api/application",
				"route-serverConfig": "/api/config",
				"route-applicationFolderStruct": "/api/application/fstruct",
				"route-versionComponent":	"/api/application/component",
				"route-applicationVersion": "/api/application/version",
				"route-versionDeployChange": "/api/application/deploychange",
				"route-versionDeployNew": "/api/application/deploynew",
				"route-versionDeploySubmit": "/api/application/deploysubmit",				
				"route-bspAppsList": "/api/application/bspapps",				
				"route-transportsList": "/api/application/transports",	
				"route-sapSystemsList": "/api/sapsystems",
				"route-sapSystem": "/api/sapsystem",
				"route-proxyList": "/api/proxies",
				"route-proxy": "/api/proxy",
			};

    	var oModel = new JSONModel(); 
    	oModel.setDefaultBindingMode("TwoWay");
    	oModel.setData(oGlobalProperties);
    	return oModel;
		}

	};

});