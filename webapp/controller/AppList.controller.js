sap.ui.define([
    "com/oprtnl/ui5locserv/controller/BaseController",
    "com/oprtnl/ui5locserv/model/formatter",
    "sap/m/MessagePopover",
    "sap/m/MessagePopoverItem",
], function(Controller, formatter, MessagePopover, MessagePopoverItem) {
    "use strict";
    return Controller.extend("com.oprtnl.ui5locserv.controller.AppList", {

        formatter: formatter,

        onInit: function() {

            this.globalBusyOn();

            var oRouter = this.getRouter(this);
            oRouter.getRoute("root").attachPatternMatched(this.onObjectMatched, this);
            oRouter.getRoute("appList").attachPatternMatched(this.onObjectMatched, this);
        },

        onBeforeRendering: function() {


        },

        onObjectMatched: function(oEvent) {

            var that = this;

            // Get server config
            var serverConfigPath = this.getGlobalProperty("/host") + this.getGlobalProperty("/route-serverConfig");
            this.getView().getModel("serverConfig").loadData(serverConfigPath);
            this.getView().getModel("serverConfig").refresh(true); 


            
            // Get applications
            var applicationsPath = this.getGlobalProperty("/host") + this.getGlobalProperty("/route-applicationsList");
            this.getView().getModel("applicationsList").loadData(applicationsPath);
            this.getView().getModel("applicationsList").refresh(true);
                
            // Get SAP systems    
            var sapSystemsPath = this.getGlobalProperty("/host") + this.getGlobalProperty("/route-sapSystemsList");
            this.getView().getModel("sapSystemsList").loadData(sapSystemsPath);
            this.getView().getModel("sapSystemsList").refresh(true);            

            // Get proxies    
            var reverseProxyPath = this.getGlobalProperty("/host") + this.getGlobalProperty("/route-proxyList");
            this.getView().getModel("reverseProxyList").loadData(reverseProxyPath);
            this.getView().getModel("reverseProxyList").refresh(true);


            this.messagesReset();

            // DOM synchornization
            setTimeout(function() {
                that.globalBusyOff();
            }, 0);

        },

        onAfterRendering: function() {

            // Check mobile screen
            if(sap.ui.Device.system.phone) {
                this.showMessagePopover([{ "status":"Warning", "message": this.getI18nText("Signup.mobileCheck")}], true);
            }
        },


        onAppTitlePress: function(oEvent) {
            this.globalBusyOn();

            var oRouter = this.getRouter(this);
            oRouter.navTo("appDetail", { appName: oEvent.getSource().data("appName") });
        },

        onCustomListItemPress: function(oEvent) {
            this.globalBusyOn();

            var oRouter = this.getRouter(this);
            oRouter.navTo("appDetail", { appName: oEvent.getParameters().listItem.data("appNameItem") });
        },

        onConfigInitClose: function() {
        
            this.valuesCleanup(["assetsPath"]);   
            this.messagesReset();
            this.getView().byId("configInit").close();
        },

        onApplicationAddNewOpen: function() {

            var oView = this.getView();
            var oAddNewDialog = oView.byId("AddNew");

            // Create dialog lazily
            if (!oAddNewDialog) {
                // Create dialog via fragment factory
                oAddNewDialog = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.AppNew", this);
                oView.addDependent(oAddNewDialog);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), oAddNewDialog);              
            } 

            this.valuesCleanup(["newAppName", "newAppDescription"]);   
            this.messagesReset();

            oAddNewDialog.open();
        },

        onNewAppClose: function() {
            this.valuesCleanup(["newAppName", "newAppDescription"]);   
            this.messagesReset();
            this.getView().byId("AddNew").close();
        },
        
        onNewAppSave: function() {

            var that = this;

            this.messagesReset();

            if (!this.checkInputValue(["newAppName"])) {
              return false;
            } 

            this.setBusy("AddNew", true);

            var oPostData = {
                "name": this.getInputValue("newAppName"),
                "description": this.getInputValue("newAppDescription"),
                "path": this.getInputValue("newAppPath")
            };
            
            var appName = this.getInputValue("newAppName");
            jQuery.ajax({
                type: "POST",
                contentType: "application/json",
                url: this.getGlobalProperty("/host") + this.getGlobalProperty("/route-applicationNew"),
                dataType: "json",
                async: true,
                data: JSON.stringify(oPostData),
                //headers: oHeaders,
                success: function(oResponse) {
                    // Cleanup & reset
                    var sPath = that.getGlobalProperty("/host") + that.getGlobalProperty("/route-applicationsList");
                    that.getView().getModel("applicationsList").loadData(sPath);
                    that.getView().getModel("applicationsList").refresh(true);

                    that.setBusy("AddNew", false);

                    that.getView().byId("AddNew").close();
                    that.showMessageToast(that.responseParse(oResponse));

                    that.getRouter(that.getView()).navTo("ui5AppDetail", { appName: that.responseParse(oResponse).name });
                },
                error: function(oResponse) {
                    that.setBusy("AddNew", false);
                    that.showMessagePopover([that.responseParse(oResponse)], true);
                }
            });

        },  

        onAppNameCheck: function(oEvent) {

            var name = oEvent.getSource().getValue();            
            var path = this.getView().getModel("serverConfig").getProperty("/appsDir") + this.getView().getModel("serverConfig").getProperty("/pathDelimiter");
                      
            if (!this.validateAppName(name)) {
                oEvent.getSource().setValueStateText(this.getI18nText("AppList.valueCheckAppNameLength"));
                oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                this.getView().byId("bNewSave").setEnabled(false);
                this.getView().byId("newAppPath").setValue(path);
                return false;
            } else {
                oEvent.getSource().setValueStateText(this.getI18nText("AppList.valueCheckAppName"));
                oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                this.getView().byId("bNewSave").setEnabled(true);
                this.getView().byId("newAppPath").setValue(path + name);
                return true;
            }
        },

        validateAppName: function(name) {
            var re = /^[\w-]{1,20}$/; // only [a-zA-Z0-9_-] max 20
            return re.test(name);
        },

        onListSearch: function(oEvent) {
            var aFilters = [];
            var sQuery = oEvent.getSource().getValue();
            if (sQuery && sQuery.length > 0) {
                var filter = new sap.ui.model.Filter("display_name", sap.ui.model.FilterOperator.Contains, sQuery);
                aFilters.push(filter);
                var filter = new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sQuery);
                aFilters.push(filter);
                var filter = new sap.ui.model.Filter("description", sap.ui.model.FilterOperator.Contains, sQuery);
                aFilters.push(filter);
                this.getView().byId("appList").getBinding("items").filter(new sap.ui.model.Filter({ filters: aFilters, and: false }));
            } else {
                this.getView().byId("appList").getBinding("items").filter(aFilters);
            }
        },

        onRelUrlPress: function(oEvent) {

            var appUrl = oEvent.getSource().data("appUrl");
            window.open(appUrl, "_blank");
        }

    });
});
