sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageStrip",
    "sap/m/BusyDialog",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/MessagePopover",
    "sap/m/MessagePopoverItem"
], function(Controller, History, MessageStrip, BusyDialog, MessageBox, MessageToast, MessagePopover, MessagePopoverItem) {
    "use strict";

    return Controller.extend("com.oprtnl.ui5locserv.controller.BaseController", {

        globalBusyDialog: new BusyDialog(),

        onInit: function() {
            var oRouter, oTarget;
            oRouter = this.getRouter();
        },

        getRouter: function(oView) {
            return sap.ui.core.UIComponent.getRouterFor(oView);
        },

        globalBusyOn: function() {
            if (!this.globalBusyDialog) {
                this.globalBusyDialog = new sap.m.BusyDialog();
            }
            this.globalBusyDialog.open();
        },

        globalBusyOff: function() {
            this.globalBusyDialog.close();
        },

        getGlobalProperty: function(sPath) {
            return this.getOwnerComponent().getModel("globalProperties").getProperty(sPath);
        },

        setGlobalProperty: function(sPath, oValue) {
            this.getOwnerComponent().getModel("globalProperties").setProperty(sPath, oValue);
            return true;
        },

        valuesCleanup: function(ids) {
            for (var i = 0, length = ids.length; i < length; i++) {
                this.getView().byId(ids[i]).setValue("");
                this.getView().byId(ids[i]).setValueState(sap.ui.core.ValueState.None);
            }
        },

        getI18nText: function(text) {
            var resourceBundle = this.getView().getModel("i18n").getResourceBundle();
            if (resourceBundle.hasText(text)) {
                return resourceBundle.getText(text);
            } else {
                return "";
            }
        },

        setBusy: function(id, isBusy) {
            var that = this;
            setTimeout(function() {
                that.getView().byId(id).setBusy(isBusy);
            }, 0);
        },

        getInputValue: function(id) {
            return this.getView().byId(id).getValue();
        },

        setInputValue: function(id, value) {
            this.getView().byId(id).setValue(value);
            return true;
        },

        checkInputValue: function(ids) {
            var isValid = true;
            var messages = [];
            var message = {};
            for (var i = 0, length = ids.length; i < length; i++) {
                this.getView().byId(ids[i]).setValueState(sap.ui.core.ValueState.None);
                switch (ids[i]) {
                    default: if (!this.getView().byId(ids[i]).getValue()) {
                        this.getView().byId(ids[i]).setValueState(sap.ui.core.ValueState.Error);

                        message["message"] = this.getView().byId(ids[i]).getValueStateText();
                        message["status"] = "Error";
                        messages.push(message);
                        this.showMessagePopover(messages, true);
                        isValid = false;
                    }
                }
            }
            return isValid;
        },

        showMessageToast: function(message) {
            if (message.message) {
                MessageToast.show(message.message);
            }
        },


        onUserMenuAction: function(oEvent) {
            var action = oEvent.getParameter("item").data("action");
            switch (action) {
                case "onSapSystemsList":
                    this.onSapSystemsList();
                    break;
                case "onServiceProxy":
                    this.onReverseProxyList();
                    break;
            }
        },

        onSapSystemsList: function() {
            var oView = this.getView();
            this.oSapSystemsList = oView.byId("sapSystems");

            // Create dialog lazily
            if (!this.oSapSystemsList) {
                // Create dialog via fragment factory
                this.oSapSystemsList = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.SapSystemsList", this);
                oView.addDependent(this.oSapSystemsList);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oSapSystemsList);
            }

            this.oSapSystemsList.open();
        },

        onSapSystemsClose: function() {
            this.selectedSapSystem = undefined;
            this.getView().byId("sapSystemsList").removeSelections();
            this.toggleSapSystemButtons();
            this.messagesReset();
            this.getView().byId("sapSystems").close();
        },

        valuesSapSystemDataReset: function() {

            this.valuesCleanup(["sapSystemDescriptionText", "sapSystemServerUrl", "bspAppUrlPattern"]);
            this.messagesReset();
        },

        onSapSystemAdd: function() {
            var oView = this.getView();
            this.oSapSystemChange = oView.byId("sapSystemChange");

            // Create dialog lazily
            if (!this.oSapSystemChange) {
                // Create dialog via fragment factory
                this.oSapSystemChange = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.SapSystemChange", this);
                oView.addDependent(this.oSapSystemChange);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oSapSystemChange);
            }

            this.setInputValue("bspAppUrlPattern", this.getView().getModel("serverConfig").getProperty("/bspAppUrlPattern"));

            this.sapSystemActionType = "POST";
            this.oSapSystemChange.open();
        },


        onSapSystemChange: function() {

            var oView = this.getView();
            this.oSapSystemChange = oView.byId("sapSystemChange");

            // Create dialog lazily
            if (!this.oSapSystemChange) {
                // Create dialog via fragment factory
                this.oSapSystemChange = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.SapSystemChange", this);
                oView.addDependent(this.oSapSystemChange);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oSapSystemChange);
            }

            this.valuesSapSystemDataReset();

            var sapSystems = this.getView().getModel("sapSystemsList").getData().systems;
            for (var i = 0, ilength = sapSystems.length; i < ilength; i++) {
                if (sapSystems[i].name === this.selectedSapSystem) {
                    this.setInputValue("sapSystemDescriptionText", sapSystems[i].description);
                    this.setInputValue("sapSystemServerUrl", sapSystems[i].url);
                    this.setInputValue("bspAppUrlPattern", sapSystems[i].bsp_url_pattern);
                }
            }

            this.sapSystemActionType = "PUT";
            this.oSapSystemChange.open();
        },


        onSapSystemDelete: function() {

            var oView = this.getView();
            this.oSapSystemChange = oView.byId("sapSystemChange");

            // Create dialog lazily
            if (!this.oSapSystemChange) {
                // Create dialog via fragment factory
                this.oSapSystemChange = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.SapSystemChange", this);
                oView.addDependent(this.oSapSystemChange);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oSapSystemChange);
            }

            this.valuesSapSystemDataReset();

            this.sapSystemActionType = "DELETE";
            this.onSapSystemSave();
        },

        onSapSystemSave: function() {

            if (!this.sapSystemActionType) {
                this.sapSystemActionType = "POST";
            }

            if (this.sapSystemActionType === "POST" || this.sapSystemActionType === "PUT") {
                if (!this.checkInputValue(["sapSystemServerUrl"])) {
                    return false;
                }
            }

            this.messagesReset();

            if (this.sapSystemActionType === "POST" || this.sapSystemActionType === "PUT") {
                this.setBusy("sapSystemChange", true);
            }

            var oPostData = {
                "name": this.selectedSapSystem,
                "url": this.getInputValue("sapSystemServerUrl"),
                "description": this.getInputValue("sapSystemDescriptionText"),
                "bsp_url_pattern": this.getInputValue("bspAppUrlPattern")
            };

            var that = this;

            jQuery.ajax({
                type: this.sapSystemActionType,
                contentType: "application/json",
                url: this.getGlobalProperty("/host") + this.getGlobalProperty("/route-sapSystem"),
                dataType: "json",
                async: true,
                data: JSON.stringify(oPostData),
                //headers: oHeaders,
                success: function(oResponse) {
                    // Cleanup & reset
                    var sPath = that.getGlobalProperty("/host") + that.getGlobalProperty("/route-sapSystemsList");
                    that.getView().getModel("sapSystemsList").loadData(sPath);
                    that.getView().getModel("sapSystemsList").refresh(true);

                    that.setBusy("sapSystemChange", false);

                    that.valuesSapSystemDataReset();
                    that.getView().byId("sapSystemsList").removeSelections();
                    that.selectedSapSystem = undefined;
                    that.toggleSapSystemButtons();

                    that.getView().byId("sapSystemChange").close();
                    that.showMessageToast(that.responseParse(oResponse));
                },
                error: function(oResponse) {
                    that.setBusy("sapSystemChange", false);
                    that.showMessagePopover([that.responseParse(oResponse)], true, false, "bShowMessagesSapSystems");
                }
            });

        },

        onSapSystemClose: function() {

            this.messagesReset();
            this.getView().byId("sapSystemChange").close();
        },

        onSapSystemListSearch: function(oEvent) {
            var aFilters = [];
            var sQuery = oEvent.getSource().getValue();
            if (sQuery && sQuery.length > 0) {
                var filter = new sap.ui.model.Filter("url", sap.ui.model.FilterOperator.Contains, sQuery);
                aFilters.push(filter);
                var filter = new sap.ui.model.Filter("description", sap.ui.model.FilterOperator.Contains, sQuery);
                aFilters.push(filter);
                this.getView().byId("sapSystemsList").getBinding("items").filter(new sap.ui.model.Filter({ filters: aFilters, and: false }));
            } else {
                this.getView().byId("sapSystemsList").getBinding("items").filter(aFilters);
            }
        },

        onSapSystemSelection: function(oEvent) {
            this.selectedSapSystem = oEvent.getParameters().listItem.data("sapSystemName");
            this.toggleSapSystemButtons();
        },

        toggleSapSystemButtons: function() {
            this.getView().byId("bSapSystemsEdit").setVisible(this.checkSapSystemSelected());
            this.getView().byId("bSapSystemsDelete").setVisible(this.checkSapSystemSelected());
        },

        checkSapSystemSelected: function() {
            if (this.checkNoSapSystem()) {
                return false;
            } else {
                if (this.selectedSapSystem) {
                    return true;
                }
                return false;
            }
        },

        checkNoSapSystem: function() {
            if (this.getView().getModel("sapSystemsList").getData()) {
                return this.getView().getModel("sapSystemsList").getData().systems.length > 0 ? false : true;
            }
            return true;
        },

        onReverseProxyList: function() {
            var oView = this.getView();
            this.oProxyList = oView.byId("proxyList");

            // Create dialog lazily
            if (!this.oProxyList) {
                // Create dialog via fragment factory
                this.oProxyList = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.ProxyList", this);
                oView.addDependent(this.oProxyList);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oProxyList);
            }

            this.oProxyList.open();
        },

        valuesReverseProxyDataReset: function() {

            this.valuesCleanup(["reverseProxyDescriptionText", "reverseProxyTargetHost", "reverseProxyPath", "reverseProxyPathRewriteFrom", "reverseProxyPathRewriteTo"]);
            this.requestHeaders = [];
            this.messagesReset();
        },

        onReverseProxyAdd: function() {
            var oView = this.getView();
            this.oReverseProxyChange = oView.byId("reverseProxyChange");

            // Create dialog lazily
            if (!this.oReverseProxyChange) {
                // Create dialog via fragment factory
                this.oReverseProxyChange = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.ReverseProxyChange", this);
                oView.addDependent(this.oReverseProxyChange);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oReverseProxyChange);
            }

            this.reverseProxyActionType = "POST";
            this.requestHeaders = [];
            this.oReverseProxyChange.open();
        },

        onReverseProxyChange: function() {

            var oView = this.getView();
            this.oReverseProxyChange = oView.byId("reverseProxyChange");

            // Create dialog lazily
            if (!this.oReverseProxyChange) {
                // Create dialog via fragment factory
                this.oReverseProxyChange = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.ReverseProxyChange", this);
                oView.addDependent(this.oReverseProxyChange);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oReverseProxyChange);
            }

            this.valuesReverseProxyDataReset();

            var proxies = this.getView().getModel("reverseProxyList").getData().proxies;
            this.requestHeaders = [];
            for (var i = 0, ilength = proxies.length; i < ilength; i++) {
                if (proxies[i].name === this.selectedDataProviderSetup) {
                    this.setInputValue("reverseProxyDescriptionText", proxies[i].description);
                    this.setInputValue("reverseProxyTargetHost", proxies[i].targetHost);
                    this.setInputValue("reverseProxyPath", proxies[i].path);

                    var rewriteFrom = Object.keys(proxies[i].pathRewrite)[0];
                    var rewriteTo = rewriteFrom ? proxies[i].pathRewrite[rewriteFrom] : "";
                    this.setInputValue("reverseProxyPathRewriteFrom", rewriteFrom);
                    this.setInputValue("reverseProxyPathRewriteTo", rewriteTo);


                    this.getView().getModel("proxyHeaders").setData(this.requestHeaders);
                    for (var key in proxies[i].targetHeaders) {
                        this.requestHeaders.push({
                            "key": key,
                            "value": proxies[i].targetHeaders[key]
                        });
                    }
                    this.getView().getModel("proxyHeaders").setData(this.requestHeaders);
                    this.getView().getModel("proxyHeaders").refresh(true);
                }
            }

            this.reverseProxyActionType = "PUT";
            this.oReverseProxyChange.open();
        },

        onReverseProxyAddHeader: function() {

            this.requestHeaders.push({
                "key": "",
                "value": ""
            });
            this.getView().getModel("proxyHeaders").setData(this.requestHeaders);
            this.getView().getModel("proxyHeaders").refresh(true);
        },

        onReverseProxyRemoveHeader: function(oEvent) {

            var bindingPath = oEvent.getSource().getBindingContext("proxyHeaders").getPath();
            var index = parseInt(bindingPath.replace("/", ""));
            this.requestHeaders.splice(index, 1);
            //this.requestHeaders
            this.getView().getModel("proxyHeaders").setData(this.requestHeaders);
            this.getView().getModel("proxyHeaders").refresh(true);
        },

        onReverseProxyDelete: function() {

            var oView = this.getView();
            this.oReverseProxyChange = oView.byId("reverseProxyChange");

            // Create dialog lazily
            if (!this.oReverseProxyChange) {
                // Create dialog via fragment factory
                this.oReverseProxyChange = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.ReverseProxyChange", this);
                oView.addDependent(this.oReverseProxyChange);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oReverseProxyChange);
            }

            this.valuesReverseProxyDataReset();

            this.reverseProxyActionType = "DELETE";
            this.onReverseProxyDetailSave();
        },

        onReverseProxyHeaderBasicConfirm: function() {

            var base64 = "Basic " + btoa(this.getInputValue("reverseProxyBasicAuthUser") + ":" + this.getInputValue("reverseProxyBasicAuthPassword"));
            var authExists = false;
            this.requestHeaders.map(function(node) {
                if (node.key === "Authorization") {
                    node.value = base64;
                    authExists = true;
                }
            });
            
            if (!authExists) {
                this.requestHeaders.push({
                    "key": "Authorization",
                    "value": base64
                });
            }

            this.getView().getModel("proxyHeaders").setData(this.requestHeaders);
            this.getView().getModel("proxyHeaders").refresh(true);

            this.valuesCleanup(["reverseProxyBasicAuthPassword", "reverseProxyBasicAuthUser"]);
            this.getView().byId("reverseProxyBasicAuth").close();
        },

        onReverseProxyHeaderBasicAuthClose: function() {
            this.valuesCleanup(["reverseProxyBasicAuthPassword", "reverseProxyBasicAuthUser"]);
            this.getView().byId("reverseProxyBasicAuth").close();
        },

        onReverseProxyAddBasicAuth: function() {

            var oView = this.getView();
            this.oReverseProxyBasicAuth = oView.byId("reverseProxyBasicAuth");

            // Create dialog lazily
            if (!this.oReverseProxyBasicAuth) {
                // Create dialog via fragment factory
                this.oReverseProxyBasicAuth = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.BasicAuthProxyHeader", this);
                oView.addDependent(this.oReverseProxyBasicAuth);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oReverseProxyBasicAuth);
            }

            this.oReverseProxyBasicAuth.open();
        },

        onReverseProxyDetailSave: function() {

            if (!this.reverseProxyActionType) {
                this.reverseProxyActionType = "POST";
            }

            if (this.reverseProxyActionType === "POST" || this.reverseProxyActionType === "PUT") {
                if (!this.checkInputValue(["reverseProxyTargetHost", "reverseProxyPath"])) {
                    return false;
                }
            }

            this.messagesReset();

            if (this.reverseProxyActionType === "POST" || this.reverseProxyActionType === "PUT") {
                this.setBusy("reverseProxyChange", true);
            }

            var oPostData = {
                "name": this.selectedDataProviderSetup,
                "description": this.getInputValue("reverseProxyDescriptionText"),
                "path": this.getInputValue("reverseProxyPath"),
                "pathRewrite": {},
                "targetHost": this.getInputValue("reverseProxyTargetHost"),
                "targetHeaders": {}
            };

            if (this.getInputValue("reverseProxyPathRewriteFrom")) {
                oPostData.pathRewrite[this.getInputValue("reverseProxyPathRewriteFrom")] = this.getInputValue("reverseProxyPathRewriteTo");
            }

            if (this.requestHeaders.length) {
                for (var i = 0, iLength = this.requestHeaders.length; i < iLength; i++) {
                    if (this.requestHeaders[i].key.length) {
                        oPostData.targetHeaders[this.requestHeaders[i].key] = this.requestHeaders[i].value;
                    }
                }
            }

            var that = this;

            jQuery.ajax({
                type: this.reverseProxyActionType,
                contentType: "application/json",
                url: this.getGlobalProperty("/host") + this.getGlobalProperty("/route-proxy"),
                dataType: "json",
                async: true,
                data: JSON.stringify(oPostData),
                //headers: oHeaders,
                success: function(oResponse) {
                    // Cleanup & reset
                    var sPath = that.getGlobalProperty("/host") + that.getGlobalProperty("/route-proxyList");
                    that.getView().getModel("reverseProxyList").loadData(sPath);
                    that.getView().getModel("reverseProxyList").refresh(true);

                    that.setBusy("reverseProxyChange", false);

                    that.valuesReverseProxyDataReset();
                    that.getView().byId("dataProviderList").removeSelections();
                    that.selectedDataProviderSetup = undefined;
                    that.toggleDataProviderSetupButtons();

                    that.getView().byId("reverseProxyChange").close();
                    that.showMessageToast(that.responseParse(oResponse));
                },
                error: function(oResponse) {
                    that.setBusy("reverseProxyChange", false);
                    that.showMessagePopover([that.responseParse(oResponse)], true, false, "bShowMessagesReverseProxy");
                }
            });

        },

        onReverseProxyClose: function() {
            this.selectedDataProviderSetup = undefined;
            this.getView().byId("dataProviderList").removeSelections();
            this.toggleDataProviderSetupButtons();
            this.messagesReset();
            this.getView().byId("proxyList").close();
        },

        onReverseProxyDetailClose: function() {
            this.messagesReset();
            this.getView().byId("reverseProxyChange").close();
        },

        onDataProviderSetupSelection: function(oEvent) {
            this.selectedDataProviderSetup = oEvent.getParameters().listItem.data("dataProviderName");
            this.toggleDataProviderSetupButtons();
        },

        toggleDataProviderSetupButtons: function() {
            this.getView().byId("bReverseProxyEdit").setVisible(this.checkDataProviderSetupSelected());
            this.getView().byId("bReverseProxyDelete").setVisible(this.checkDataProviderSetupSelected());
        },

        checkDataProviderSetupSelected: function() {
            if (this.checkNoDataProviderSetup()) {
                return false;
            } else {
                if (this.selectedDataProviderSetup) {
                    return true;
                }
                return false;
            }
        },

        checkNoDataProviderSetup: function() {
            if (this.getView().getModel("reverseProxyList").getData()) {
                return this.getView().getModel("reverseProxyList").getData().proxies.length > 0 ? false : true;
            }
            return true;
        },

        onReverseProxyListSearch: function(oEvent) {
            var aFilters = [];
            var sQuery = oEvent.getSource().getValue();
            if (sQuery && sQuery.length > 0) {
                var filter = new sap.ui.model.Filter("targetHost", sap.ui.model.FilterOperator.Contains, sQuery);
                aFilters.push(filter);
                filter = new sap.ui.model.Filter("description", sap.ui.model.FilterOperator.Contains, sQuery);
                aFilters.push(filter);
                filter = new sap.ui.model.Filter("path", sap.ui.model.FilterOperator.Contains, sQuery);
                aFilters.push(filter);
                this.getView().byId("dataProviderList").getBinding("items").filter(new sap.ui.model.Filter({ filters: aFilters, and: false }));
            } else {
                this.getView().byId("dataProviderList").getBinding("items").filter(aFilters);
            }
        },

        responseParse: function(res) {

            try {
                var stdMessage = { status: "", message: "", messageId: "" };
                if (res.getResponseHeader('Content-Type')) {
                    if (res.getResponseHeader('Content-Type') == "text/html") {
                        stdMessage.status = "Error";
                        stdMessage.message = "Unknown error with HTTP Status:" + res.status;
                        return stdMessage;
                    }
                } else if (res.responseJSON) {
                    var response = res.responseJSON;
                    if (typeof response == 'object') {
                        if (response.status) {
                            if (typeof response.message == 'object' && response.message) {
                                stdMessage.status = response.status;

                                if (response.message.errors) {
                                    stdMessage.message = response.message.errors.name.message;
                                    return stdMessage;
                                }
                                if (response.message.errmsg) {
                                    stdMessage.message = response.message.errmsg;
                                    return stdMessage;
                                }
                                return stdMessage;
                            } else {
                                stdMessage.status = response.status;
                                stdMessage.message = response.message;
                                return stdMessage;
                            }
                        } else {
                            return response; // Wrong format
                        }
                    } else {
                        return response; // Wrong format
                    }
                } else if (res.getParameter) {
                    if (res.getParameter("errorobject")) {
                        if (res.getParameter("errorobject").statusCode === 500 && res.getParameter("errorobject").responseText) {
                            var jsonErrorMessage = JSON.parse(res.getParameter("errorobject").responseText);
                            stdMessage.status = jsonErrorMessage.status ? jsonErrorMessage.status : "Error";
                            stdMessage.message = jsonErrorMessage.message ? jsonErrorMessage.message : "";
                            return stdMessage;
                        }
                    }
                } else {
                    stdMessage.status = "Error";
                    stdMessage.message = "Unknown error with HTTP Status:" + res.status;
                    return stdMessage;
                }


            } catch (ex) {
                return res; // Wrong format
            }
        },

        showMessagePopover: function(messages, isInit, keepClosed, controlId) {

            var controlId = controlId ? controlId : "bShowMessages";
            var that = this;
            if (isInit) {
                this.messages = messages;
            }
            var oMessagePopoverItem = {};
            if (!this.oMessagePopover) {
                this.oMessagePopover = new MessagePopover({
                    initiallyExpanded: true
                });

            }
            this.oMessagePopover.removeAllItems();
            for (var i = 0, length = this.messages.length; i < length; i++) {
                if (this.messages[i].status !== "Error" && this.messages[i].status !== "Warning" && this.messages[i].status !== "Success") {
                    oMessagePopoverItem = new MessagePopoverItem({
                        type: "Error",
                        title: this.messages.toString()
                    });
                } else {
                    oMessagePopoverItem = new MessagePopoverItem({
                        type: this.messages[i].status,
                        title: this.messages[i].message
                    });
                }
                this.oMessagePopover.insertItem(oMessagePopoverItem);
            }
            if (this.messages.length > 0) {
                this.getView().byId(controlId).setText(this.messages.length);
                this.getView().byId(controlId).setVisible(true);
                if (!keepClosed) {
                    var that = this;
                    setTimeout(function() {
                        that.oMessagePopover.openBy(that.getView().byId(controlId));
                    }, 100);
                }

            }
        },

        getContentDensityClass: function() {
            if (!this.sContentDensityClass) {
                if (!sap.ui.Device.support.touch) {
                    this.sContentDensityClass = "sapUiSizeCompact";
                } else {
                    this.sContentDensityClass = "sapUiSizeCozy";
                }
            }
            return this.sContentDensityClass;
        },

        messagesReset: function() {
            this.messages = [];
            this.getView().byId("bShowMessages").setVisible(false);
            if (this.getView().byId("bShowMessagesVersion")) {
                this.getView().byId("bShowMessagesVersion").setVisible(false);
            }
            if (this.getView().byId("bShowMessagesVersionDeploymentBsp")) {
                this.getView().byId("bShowMessagesVersionDeploymentBsp").setVisible(false);
            }
            if (this.getView().byId("bShowMessagesVersionDeploymentSync")) {
                this.getView().byId("bShowMessagesVersionDeploymentSync").setVisible(false);
            }
            if (this.getView().byId("bShowMessagesReverseProxy")) {
                this.getView().byId("bShowMessagesReverseProxy").setVisible(false);
            }
            if (this.getView().byId("bShowMessagesProxyList")) {
                this.getView().byId("bShowMessagesProxyList").setVisible(false);
            }
            if (this.getView().byId("bShowMessagesSapSystems")) {
                this.getView().byId("bShowMessagesSapSystems").setVisible(false);
            }
            if (this.getView().byId("bShowMessagesSapSystem")) {
                this.getView().byId("bShowMessagesSapSystem").setVisible(false);
            }
        }


    });
});