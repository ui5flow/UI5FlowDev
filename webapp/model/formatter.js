sap.ui.define([], function() {
    "use strict";
    return {

        getFormattedDateTime: function(isoTimestamp) {
            if (isoTimestamp) {
                var date = new Date(isoTimestamp);
                var padNumber = function(number) {
                    number = number.toString();
                    if (number.length === 1) {
                        return "0" + number;
                    }
                    return number;
                };
                return padNumber(date.getDate()) + "/" + padNumber(date.getMonth() + 1) + "/" + date.getFullYear() + " " + padNumber(date.getHours()) + ":" + padNumber(date.getMinutes()) + ":" + padNumber(date.getSeconds());
            } else {
                return "";
            }

        },

        getFolderStructureColor: function(hasSubfolder) {
            return hasSubfolder ? "Critical" : "Normal";
        },

        getVersionUrl: function(versionId) {
            var sServiceUrl = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port : '') + "/" + versionId + "/dist/";
            return sServiceUrl;
        },

        decodeUri: function(uri) {
            return decodeURIComponent(uri);
        },

        getSyncObjectFolfer: function(type) {
            if(type == "folder") {
                return true;
            }
            return false;
        },

        getSyncObjectFile: function(type) {
            if(type == "file") {
                return true;
            }
            return false;
        },

        setLastDeployment: function(lastDeployment) {
            if(lastDeployment) {
                return true;
            }
            return false;
        },

        deploySyncStatus: function(status) {
            switch(status) {
                case "create":
                    return "Success";
                case "update":
                    return "Warning";
                case "delete":
                    return "Error";
            }
        },

        jsonConvert: function(object) {
            return JSON.stringify(object);
        },

        deploySyncStatusText: function(status) {
            var resourceBundle = this.getView().getModel("i18n").getResourceBundle();
            switch(status) {
                case "create":
                    return resourceBundle.getText("AppDetail.syncObjectTextNew");
                case "update":
                    return resourceBundle.getText("AppDetail.syncObjectTextChange");
                case "delete":
                    return resourceBundle.getText("AppDetail.syncObjectTextDelete");
            }
        },

        getListTitle: function(titleText) {
            if (titleText) {
                if (titleText.toString().length > 70) {
                    return titleText.toString().substring(0, 70) + "...";
                }
            }
            return titleText;
        }
    };
});
