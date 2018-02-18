sap.ui.define([
    "com/oprtnl/ui5locserv/controller/BaseController",
    "com/oprtnl/ui5locserv/model/formatter",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/MessagePopover",
    "sap/m/MessagePopoverItem",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Token",
    "sap/m/Link"
], function(Controller, formatter, Dialog, Button, MessagePopover, MessagePopoverItem, MessageToast, MessageBox, Token, Link) {
    "use strict";
    return Controller.extend("com.oprtnl.ui5locserv.controller.AppDetail", {

        formatter: formatter,

        onInit: function() {
            var oRouter = this.getRouter(this);
            oRouter.getRoute("appDetail").attachPatternMatched(this.onObjectMatched, this);
            this.appDetailFragmentView();
        },

        onObjectMatched: function(oEvent) {

            // Get server config
            if (!this.getView().getModel("serverConfig").getData().sapSystems) {
                var serverConfigPath = this.getGlobalProperty("/host") + this.getGlobalProperty("/route-serverConfig");
                this.getView().getModel("serverConfig").loadData(serverConfigPath);
                this.getView().getModel("serverConfig").refresh(true);
            }



            this.getDetailData(oEvent.getParameter("arguments").appName);

            this.isChangeActive = false;

            this.messagesReset();
            this.onStartTabSelection();

            this.globalBusyOff();
        },

        getDetailData: function(appName) {

            // Get SAP systems    
            if (!this.getView().getModel("sapSystemsList").getData().systems) {
                var sapSystemsPath = this.getGlobalProperty("/host") + this.getGlobalProperty("/route-sapSystemsList");
                this.getView().getModel("sapSystemsList").loadData(sapSystemsPath);
                this.getView().getModel("sapSystemsList").refresh(true);
            }

            // Get proxies    
            if (!this.getView().getModel("reverseProxyList").getData().proxies) {
                var reverseProxyPath = this.getGlobalProperty("/host") + this.getGlobalProperty("/route-proxyList");
                this.getView().getModel("reverseProxyList").loadData(reverseProxyPath);
                this.getView().getModel("reverseProxyList").refresh(true);
            }

            var appDetailData = {};

            var appListData = this.getView().getModel("applicationsList").getData();
            if (!appListData.applications) {
                var sPath = this.getGlobalProperty("/host") + this.getGlobalProperty("/route-applicationsList");
                this.getView().getModel("applicationsList").loadData(sPath);
                this.getView().getModel("applicationsList").refresh(true);

                this.getView().getModel("applicationsList").attachEventOnce("requestCompleted", function(oEvent) {
                    this.getDetailData(appName);
                }, this);


            } else {

                if (appListData.applications) {
                    for (var i = 0, iLength = appListData.applications.length; i < iLength; i++) {
                        if (appListData.applications[i].name === appName) {
                            appDetailData = appListData.applications[i];
                        }
                    }
                }
                this.getView().getModel("applicationDetail").setData(appDetailData);
                this.getView().getModel("applicationDetail").refresh(true);
            }

        },

        onApplicationDelete: function() {

            var oView = this.getView();
            this.oDeleteConfirm = oView.byId("appDeleteConfirm");

            // Create dialog lazily
            if (!this.oDeleteConfirm) {
                // Create dialog via fragment factory
                this.oDeleteConfirm = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.DeleteConfirmation", this);
                oView.addDependent(this.oDeleteConfirm);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oDeleteConfirm);                
            }

            this.valuesAppDeleteReset();

            this.oDeleteConfirm.open();

        },

        onCheckDeleteConfirmation: function(oEvent) {
            if (oEvent.getSource().getSelected()) {
                this.getView().byId("bAppDeleteConfirm").setEnabled(true);
            } else {
                this.getView().byId("bAppDeleteConfirm").setEnabled(false);
            }
        },

        valuesAppDeleteReset: function() {
            this.getView().byId("confirmCheck").setSelected(false);
            this.getView().byId("bAppDeleteConfirm").setEnabled(false);
            this.messagesReset();
        },

        onApplicationDeleteConfirmed: function() {

            this.globalBusyOn();

            var oPostData = {
                "appName": this.getView().getModel("applicationDetail").getProperty("/name")
            };

            var that = this;
            jQuery.ajax({
                type: 'DELETE',
                contentType: "application/json",
                url: this.getGlobalProperty("/host") + this.getGlobalProperty("/route-applicationsDelete"),
                dataType: "json",
                async: true,
                data: JSON.stringify(oPostData),
                //headers: oHeaders,
                success: function(oResponse) {

                    that.showMessageToast(that.responseParse(oResponse));
                    that.globalBusyOff();
                    that.oDeleteConfirm.close();
                    setTimeout(function() {
                        that.onBackConfirmed();
                    }, 1);


                },
                error: function(oResponse) {
                    that.globalBusyOff();
                    that.showMessagePopover([that.responseParse(oResponse)], true, true, "bShowMessages");
                    that.oDeleteConfirm.close();
                }
            });
        },

        onApplicationDeleteCancel: function() {
            this.oDeleteConfirm.close();
        },

        onTabSelection: function(oEvent) {
            switch (oEvent.getParameter("key")) {
                case "tabDetail":
                    this.toggleDetailButtons();
                    if (this.isChangeActive) {
                        this.appDetailFragmentChange();
                    } else {
                        this.appDetailFragmentView();
                    }

                    break;
                case "tabDataProvider":
                    if (this.checkNoDetailChange()) {
                        this.getView().byId("dataProviderList").removeSelections();
                        this.selectedDataProvider = false;
                        this.toggleDataProviderButtons();
                        this.setDataProviderViewState();
                    }
                    break;
                case "tabVersion":
                    if (this.checkNoDetailChange()) {
                        this.getView().byId("versionList").removeSelections();
                        this.selectedVersion = false;
                        this.toggleVersionButtons();
                        this.setVersionViewState();
                    }
                    break;
                case "tabSettings":
                    this.toggleSettingsButtons();
                    break;
                default:
                    this.toggleDetailButtons();
                    this.appDetailFragmentView();
            }
        },

        checkNoDetailChange: function() {

            var that = this;
            if (this.isChangeActive) {
                MessageBox.warning(
                    that.getI18nText("AppDetail.appChangesLost"), {
                        icon: MessageBox.Icon.WARNING,
                        title: that.getI18nText("AppDetail.appChangesLostHead"),
                        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                        styleClass: "sapUiSizeCompact",
                        initialFocus: MessageBox.Action.CLOSE,
                        onClose: function(action) {
                            if (action === MessageBox.Action.CANCEL) {
                                that.toggleDetailButtons();
                                that.getView().byId("appDetailHeaderTabBar").setSelectedKey("tabDetail");
                                return false;
                            } else {
                                that.onDetailDataCancel();
                                that.getView().byId("bApplicationChange").setVisible(false);
                                return true;
                            }
                        }
                    }
                );
            }
            return true;
        },

        setDataProviderViewState: function() {
            if (this.checkNoDataProvider()) {
                this.getView().byId("noDataProvider").setVisible(true);
                this.getView().byId("hasDataProvider").setVisible(false);
            } else {
                this.getView().byId("noDataProvider").setVisible(false);
                this.getView().byId("hasDataProvider").setVisible(true);
            }
        },

        setVersionViewState: function() {
            if (this.checkNoAppVersion()) {
                this.getView().byId("noVersion").setVisible(true);
                this.getView().byId("hasVersion").setVisible(false);
            } else {
                this.getView().byId("noVersion").setVisible(false);
                this.getView().byId("hasVersion").setVisible(true);
            }
        },

        appDetailFragmentView: function(oEvent) {

            var oVerticalLayout = this.getView().byId("appDetailVertLayout");

            if (this.oDetailDataFragment) {
                this.oDetailDataFragment.destroy();
                this.oDetailDataFragment = null;
            }

            this.oDetailDataFragment = sap.ui.xmlfragment(this.getView().getId(), "com.oprtnl.ui5locserv.view.AppDetailDisplay", this);
            this.getView().addDependent(this.oDetailDataFragment);
            // forward compact/cozy style into dialog
            jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oDetailDataFragment);

            oVerticalLayout.removeAllContent();
            oVerticalLayout.insertContent(this.oDetailDataFragment);
        },

        onStartTabSelection: function() {
            this.getView().byId("appDetailHeaderTabBar").setSelectedKey("tabDetail");
            this.toggleDetailButtons();
        },

        toggleDataProviderButtons: function() {
            this.getView().byId("bApplicationChange").setVisible(false);
            this.getView().byId("bDetailDataSave").setVisible(false);
            this.getView().byId("bDetailDataCancel").setVisible(false);
            this.getView().byId("bCreateVersion").setVisible(false);
            this.getView().byId("bDeploySapVersion").setVisible(false);
            this.getView().byId("bChangeVersion").setVisible(false);
            this.getView().byId("bDeleteVersion").setVisible(false);
            this.getView().byId("bCreateDataProvider").setVisible(true);
            this.getView().byId("bChangeDataProvider").setVisible(this.checkDataProviderSelected());
            this.getView().byId("bDeleteDataProvider").setVisible(this.checkDataProviderSelected());
        },

        toggleVersionButtons: function() {
            this.getView().byId("bApplicationChange").setVisible(false);
            this.getView().byId("bDetailDataSave").setVisible(false);
            this.getView().byId("bDetailDataCancel").setVisible(false);
            this.getView().byId("bCreateVersion").setVisible(true);
            this.getView().byId("bCreateDataProvider").setVisible(false);
            this.getView().byId("bChangeDataProvider").setVisible(false);
            this.getView().byId("bDeleteDataProvider").setVisible(false);
            this.getView().byId("bDeploySapVersion").setVisible(this.checkVersionSelected());
            this.getView().byId("bChangeVersion").setVisible(this.checkVersionSelected());
            this.getView().byId("bDeleteVersion").setVisible(this.checkVersionSelected());
        },

        toggleSettingsButtons: function() {
            this.getView().byId("bApplicationChange").setVisible(false);
            this.getView().byId("bDetailDataSave").setVisible(false);
            this.getView().byId("bDetailDataCancel").setVisible(false);
            this.getView().byId("bCreateVersion").setVisible(false);
            this.getView().byId("bCreateDataProvider").setVisible(false);
            this.getView().byId("bChangeDataProvider").setVisible(false);
            this.getView().byId("bDeleteDataProvider").setVisible(false);
            this.getView().byId("bDeploySapVersion").setVisible(false);
            this.getView().byId("bChangeVersion").setVisible(false);
            this.getView().byId("bDeleteVersion").setVisible(false);
        },

        toggleDetailButtons: function() {
            if (this.isChangeActive) {
                this.getView().byId("bApplicationChange").setVisible(false);
                this.getView().byId("bDetailDataSave").setVisible(true);
                this.getView().byId("bDetailDataCancel").setVisible(true);
            } else {
                this.getView().byId("bApplicationChange").setVisible(true);
                this.getView().byId("bDetailDataSave").setVisible(false);
                this.getView().byId("bDetailDataCancel").setVisible(false);
            }

            this.getView().byId("bCreateVersion").setVisible(false);
            this.getView().byId("bDeploySapVersion").setVisible(false);
            this.getView().byId("bChangeVersion").setVisible(false);
            this.getView().byId("bDeleteVersion").setVisible(false);
            this.getView().byId("bCreateDataProvider").setVisible(false);
            this.getView().byId("bChangeDataProvider").setVisible(false);
            this.getView().byId("bDeleteDataProvider").setVisible(false);
        },

        toggleDetailChangeButtons: function(isDetailChange) {
            if (isDetailChange) {
                this.getView().byId("bApplicationChange").setVisible(false);
                this.getView().byId("bDetailDataSave").setVisible(true);
                this.getView().byId("bDetailDataCancel").setVisible(true);
            } else {
                this.getView().byId("bApplicationChange").setVisible(true);
                this.getView().byId("bDetailDataSave").setVisible(false);
                this.getView().byId("bDetailDataCancel").setVisible(false);
            }
        },

        checkNoAppVersion: function() {
            if (this.getView().getModel("applicationDetail").getProperty("/versions")) {
                return this.getView().getModel("applicationDetail").getProperty("/versions").length > 0 ? false : true;
            }
            return true;
        },

        checkNoDataProvider: function() {
            if (this.getView().getModel("applicationDetail").getProperty("/data_providers")) {
                return this.getView().getModel("applicationDetail").getProperty("/data_providers").length > 0 ? false : true;
            }
            return true;
        },

        checkVersionSelected: function() {
            if (this.checkNoAppVersion()) {
                return false;
            } else {
                if (this.selectedVersion) {
                    return true;
                }
                return false;
            }
        },

        checkDataProviderSelected: function() {
            if (this.checkNoDataProvider()) {
                return false;
            } else {
                if (this.selectedDataProvider) {
                    return true;
                }
                return false;
            }
        },

        collectDetailDataBeforeChange: function() {
            // copy object
            this.dataImageBeforeChangeDetail = JSON.parse(JSON.stringify(this.getView().getModel("applicationDetail").getData()));
        },

        onDetailDataChange: function() {

            this.collectDetailDataBeforeChange();
            this.appDetailFragmentChange();
            this.toggleDetailChangeButtons(true);
            this.isChangeActive = true;
        },

        appDetailFragmentChange: function(oEvent) {
            var oVerticalLayout = this.getView().byId("appDetailVertLayout");

            if (this.oDetailDataFragment) {
                this.oDetailDataFragment.destroy();
                this.oDetailDataFragment = null;
            }

            this.oDetailDataFragment = sap.ui.xmlfragment(this.getView().getId(), "com.oprtnl.ui5locserv.view.AppDetailChange", this);
            this.getView().addDependent(this.oDetailDataFragment);
            // forward compact/cozy style into dialog
            jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oDetailDataFragment);

            oVerticalLayout.removeAllContent();
            oVerticalLayout.insertContent(this.oDetailDataFragment);
        },

        onDetailDataCancel: function() {
            this.getView().getModel("applicationDetail").setData(this.dataImageBeforeChangeDetail);
            this.appDetailFragmentView();
            this.toggleDetailChangeButtons(false);
            this.isChangeActive = false;
        },

        onDetailDataSave: function() {

            var that = this;
            var appName = this.getView().getModel("applicationDetail").getProperty("/name");

            var oPostData = {
                "name": appName,
                "displayName": this.getInputValue("displayName"),
                "appUrl": this.getInputValue("appUrl"),
                "description": this.getInputValue("appDescription"),
                "remoteGitUrl": this.getInputValue("appRemoteGitUrl")
            };

            jQuery.ajax({
                type: "PUT",
                contentType: "application/json",
                url: this.getGlobalProperty("/host") + this.getGlobalProperty("/route-applicationUpdate"),
                dataType: "json",
                async: true,
                data: JSON.stringify(oPostData),
                //headers: oHeaders,
                success: function(oResponse) {

                    var sPath = that.getGlobalProperty("/host") + that.getGlobalProperty("/route-applicationsList");

                    that.getView().getModel("applicationsList").loadData(sPath);
                    that.getView().getModel("applicationsList").refresh(true);

                    that.getView().getModel("applicationsList").attachEventOnce("requestCompleted", function(oEvent) {
                        that.getDetailData(appName);
                    }, that);


                    that.appDetailFragmentView();
                    that.toggleDetailChangeButtons(false);
                    that.showMessageToast(that.responseParse(oResponse));
                    that.isChangeActive = false;
                },
                error: function(oResponse) {
                    that.setBusyDetailChange(false);
                    that.showMessagePopover([that.responseParse(oResponse)], true);
                }
            });
        },

        onDirectoryOpen: function(oEvent) {

            var appPath = oEvent.getSource().data("appPath");
            window.open(appPath, "_blank");
        },

        onRelUrlPress: function(oEvent) {

            var appUrl = oEvent.getSource().data("appUrl");
            window.open(appUrl, "_blank");
        },

        onVersionCreate: function() {

            var oView = this.getView();
            this.oVersionData = oView.byId("versionDataChange");

            if (!this.oVersionData) {
                this.oVersionData = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.AppVersionDataChange", this);
                oView.addDependent(this.oVersionData);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oVersionData);

            }
            var dataProviders = this.getView().getModel("applicationDetail").getProperty("/data_providers");

            this.getView().byId("versionName").setEditable(true);
            this.getView().byId("bVersionFolder").setEnabled(true);

            this.valuesVersionDataReset();
            this.versionActionType = "POST";
            this.oVersionData.open();
        },

        onPathPress: function(oEvent) {

            var url = oEvent.getSource().data("appPath");
            if (!url) {
                this.showMessageToast({ message: this.getI18nText("AppDetail.pathUrlCopyFailed") });
                return false;
            }
            var textArea = document.createElement("textarea");

            textArea.style.position = "fixed";
            textArea.style.top = 0;
            textArea.style.left = 0;
            textArea.style.width = "2em";
            textArea.style.height = "2em";
            textArea.style.padding = 0;
            textArea.style.border = "none";
            textArea.style.outline = "none";
            textArea.style.boxShadow = "none";
            textArea.style.background = "transparent";


            textArea.value = url;

            document.body.appendChild(textArea);

            textArea.select();

            try {
                var successful = document.execCommand("copy");
                this.showMessageToast({ message: this.getI18nText("AppDetail.pathUrlCopySuccessful") });
            } catch (err) {
                this.showMessageToast({ message: this.getI18nText("AppDetail.pathUrlCopyFailed") });
            }

            document.body.removeChild(textArea);
        },

        valuesVersionDataReset: function() {
            this.valuesCleanup(["versionName", "versionDescription", "versionCompPathValue", "versionFolder"]);
            this.getView().byId("versionIsBuild").setSelected(false);
            this.getView().byId("versionCompPathLabel").setVisible(false);
            this.getView().byId("versionCompPathValue").setVisible(false);
            this.getView().byId("versionCompPathValue").setEditable(true);
            this.getView().byId("versionIsBuild").setEditable(true);
            this.getView().byId("versionIsBuild").setSelected(false);
            this.messagesReset();
        },

        onVersionClose: function() {
            this.valuesVersionDataReset();
            this.messagesReset();
            this.getView().byId("versionDataChange").close();
        },


        onVersionFolderSelect: function(oEvent) {

            var dirName = this.getView().getModel("applicationDetail").getProperty("/app_directory");
            var sPath = this.getGlobalProperty("/host") + this.getGlobalProperty("/route-applicationFolderStruct") + "/" + dirName;
            this.getView().getModel("applicationFolderStructure").loadData(sPath, "", false);

            this.folderPathMap = [];
            this.actualFolderLevel = 0;

            var hasSubFolder = false;
            var actualFolder = [];
            this.folderStructureData = this.getView().getModel("applicationFolderStructure").getData();
            this.actualFolderStructureData = this.folderStructureData;
            for (var i = 0, iLength = this.folderStructureData.length; i < iLength; i++) {
                if (this.folderStructureData[i].name) {

                    if (this.folderStructureData[i].subfolder) {
                        hasSubFolder = false;
                        for (var j = 0, jLength = this.folderStructureData[i].subfolder.length; j < jLength; j++) {
                            if (this.folderStructureData[i].subfolder[j].name) {
                                hasSubFolder = true;
                            }
                        }
                    } else {
                        hasSubFolder = false;
                    }

                    actualFolder.push({
                        id: i,
                        name: this.folderStructureData[i].name,
                        hasSubFolder: hasSubFolder
                    });
                }
            }
            this.getView().getModel("applicationFolderStructure").setData(actualFolder);

            this.oVersionFolderStructure = this.getView().byId("applicationFolderStructure");

            // Create dialog lazily
            if (!this.oVersionFolderStructure) {
                this.oVersionFolderStructure = sap.ui.xmlfragment(this.getView().getId(), "com.oprtnl.ui5locserv.view.AppFolderStructureSelect", this);
                this.getView().addDependent(this.oVersionFolderStructure);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oVersionFolderStructure);
            }

            if (this.getView().byId("folderStructureBreadcrumbs").getLinks()) {
                this.getView().byId("folderStructureBreadcrumbs").removeAllLinks();
            }
            //this.getView().byId("folderStructureBreadcrumbs").addLink(new Link({ text: "." }));
            this.getView().byId("folderStructureBreadcrumbs").setCurrentLocationText("");

            var oLink = new Link({
                text: "[root]"
            });
            oLink.data("folderLevel", -1);
            oLink.data("controller", this);
            this.getView().byId("folderStructureBreadcrumbs").addLink(oLink);

            this.getView().byId("folderStructureStripText").setText(this.getI18nText("AppDetail.versionFolderText"));
            this.getView().byId("bFolderStructureSelect").detachPress(this.onVersionFolderAccept, this);
            this.getView().byId("bFolderStructureSelect").attachPress(this.onVersionFolderAccept, this);

            this.oVersionFolderStructure.open();

        },

        onFolderStructureLinkSelection: function(oEvent) {

            var folderLevel = oEvent.getSource().data("folderLevel");
            var controller = oEvent.getSource().data("controller");
            var oV
            var actualFolder = [];
            var hasSubFolder = false;

            folderLevel = folderLevel + 1;

            var actualFolderStructureData = controller.folderStructureData;
            for (var i = 0, iLength = controller.folderPathMap.length; i < folderLevel; i++) {
                actualFolderStructureData = actualFolderStructureData[controller.folderPathMap[i].folderId].subfolder;
            }
            var deleteFromIdx = folderLevel;
            if (deleteFromIdx < 0) {
                deleteFromIdx = 0;
            }
            controller.folderPathMap.splice(deleteFromIdx);
            controller.actualFolderLevel = deleteFromIdx;
            controller.actualFolderStructureData = actualFolderStructureData;

            for (var i = 0, iLength = actualFolderStructureData.length; i < iLength; i++) {
                if (actualFolderStructureData[i].name) {
                    if (actualFolderStructureData[i].subfolder) {
                        hasSubFolder = false;
                        for (var j = 0, jLength = actualFolderStructureData[i].subfolder.length; j < jLength; j++) {
                            if (actualFolderStructureData[i].subfolder[j].name) {
                                hasSubFolder = true;
                            }
                        }
                    } else {
                        hasSubFolder = false;
                    }

                    actualFolder.push({
                        id: i,
                        name: actualFolderStructureData[i].name,
                        hasSubFolder: hasSubFolder
                    });
                }
            }

            if (controller.getView().byId("folderStructureBreadcrumbs").getLinks()) {
                controller.getView().byId("folderStructureBreadcrumbs").removeAllLinks();
            }

            var oLink = new Link({
                text: "[root]",
                press: controller.onFolderStructureLinkSelection
            });

            oLink.data("folderLevel", -1);
            oLink.data("controller", controller);
            controller.getView().byId("folderStructureBreadcrumbs").addLink(oLink);
            for (var i = 0, iLength = controller.folderPathMap.length; i < iLength; i++) {
                var oLink = new Link({
                    text: controller.folderPathMap[i].folderName,
                    press: controller.onFolderStructureLinkSelection
                });
                oLink.data("folderLevel", i);
                oLink.data("controller", controller);
                controller.getView().byId("folderStructureBreadcrumbs").addLink(oLink);
            }

            controller.getView().getModel("applicationFolderStructure").setData(actualFolder);
            controller.getView().getModel("applicationFolderStructure").refresh();
        },

        onFolderStructureItemSelection: function(oEvent) {

            this.selectedFolderStructureId = oEvent.getParameters().listItem.data("folderId");
            var selectedFolderStructHasSubFolder = oEvent.getParameters().listItem.data("hasSubFolder");
            var selectedFolderStructName = oEvent.getParameters().listItem.data("folderName");

            this.getView().byId("folderStructureList").removeSelections();

            var actualFolderStructureData = null;
            var actualFolder = [];
            var hasSubFolder = false;
            var isLastFolder = false;

            if (this.selectedFolderStructureId >= 0) {

                if (!this.folderPathMap[this.actualFolderLevel]) {
                    this.folderPathMap[this.actualFolderLevel] = {};
                }
                this.folderPathMap[this.actualFolderLevel]["folderId"] = this.selectedFolderStructureId;
                this.folderPathMap[this.actualFolderLevel]["folderName"] = selectedFolderStructName;
                this.folderPathMap[this.actualFolderLevel]["hasSubFolder"] = selectedFolderStructHasSubFolder;

                if (!selectedFolderStructHasSubFolder) {
                    isLastFolder = true;
                } else {
                    this.actualFolderLevel++;
                }

                if (this.getView().byId("folderStructureBreadcrumbs").getLinks()) {
                    this.getView().byId("folderStructureBreadcrumbs").removeAllLinks();
                }

                var oLink = new Link({
                    text: "[root]",
                    press: this.onFolderStructureLinkSelection
                });
                oLink.data("folderLevel", -1);
                oLink.data("controller", this);
                this.getView().byId("folderStructureBreadcrumbs").addLink(oLink);

                var enableLink = true;
                for (var i = 0, iLength = this.folderPathMap.length; i < iLength; i++) {

                    if (isLastFolder && i === (iLength - 1)) {
                        enableLink = false;
                    }
                    var oLink = new Link({
                        text: this.folderPathMap[i].folderName,
                        press: this.onFolderStructureLinkSelection,
                        enabled: enableLink
                    });
                    oLink.data("folderLevel", i);
                    oLink.data("controller", this);
                    this.getView().byId("folderStructureBreadcrumbs").addLink(oLink);
                }

                if (isLastFolder) {
                    return;
                }

                if (this.actualFolderStructureData[this.selectedFolderStructureId].subfolder) {
                    actualFolderStructureData = this.actualFolderStructureData[this.selectedFolderStructureId].subfolder;
                } else {
                    actualFolderStructureData = this.folderStructureData;
                }
                this.actualFolderStructureData = actualFolderStructureData;

                for (var i = 0, iLength = actualFolderStructureData.length; i < iLength; i++) {
                    if (actualFolderStructureData[i].name) {
                        if (actualFolderStructureData[i].subfolder) {
                            hasSubFolder = false;
                            for (var j = 0, jLength = actualFolderStructureData[i].subfolder.length; j < jLength; j++) {
                                if (actualFolderStructureData[i].subfolder[j].name) {
                                    hasSubFolder = true;
                                }
                            }
                        } else {
                            hasSubFolder = false;
                        }

                        actualFolder.push({
                            id: i,
                            name: actualFolderStructureData[i].name,
                            hasSubFolder: hasSubFolder
                        });
                    }
                }
                this.getView().getModel("applicationFolderStructure").setData(actualFolder);
                this.getView().getModel("applicationFolderStructure").refresh();
            }

        },

        onFolderStructureCancel: function() {
            this.getView().byId("bFolderStructureSelect").detachPress(this.onVersionFolderAccept, this);

            this.getView().byId("applicationFolderStructure").close();
        },

        onVersionFolderAccept: function() {
            var links = this.getView().byId("folderStructureBreadcrumbs").getLinks();
            var path = "[root]";
            if (links.length) {
                for (var i = 1, iLength = links.length; i < iLength; i++) {
                    path = path + "/" + links[i].getText();
                }
            }
            path = path + "/";

            this.getView().byId("versionFolder").setValue(path);
            if (path.length > 0) {
                this.getView().byId("versionIsBuild").setEnabled(true);
            }
            this.getView().byId("bFolderStructureSelect").detachPress(this.onVersionFolderAccept, this);
            this.getView().byId("applicationFolderStructure").close();
        },


        onBuildSelection: function() {

            if (!this.getView().byId("versionIsBuild").getSelected()) {
                this.getView().byId("versionCompPathValue").setVisible(false);
                this.getView().byId("versionCompPathValue").setEditable(false);
                this.messagesReset();
                return false;
            }

            this.setBusyVersionChange(true);

            var oPostData = {
                "appFolder": this.getView().getModel("applicationDetail").getProperty("/app_directory"),
                "srcPath": this.getView().byId("versionFolder").getValue().replace("[root]", "") // remove root alias
            };

            var that = this;
            jQuery.ajax({
                type: 'POST',
                contentType: "application/json",
                url: this.getGlobalProperty("/host") + this.getGlobalProperty("/route-versionComponent"),
                dataType: "json",
                async: true,
                data: JSON.stringify(oPostData),
                //headers: oHeaders,
                success: function(oResponse) {

                    that.setInputValue("versionCompPathValue", that.responseParse(oResponse).path);
                    that.showMessageToast(that.responseParse(oResponse));
                    that.setBusyVersionChange(false);
                    that.getView().byId("versionCompPathLabel").setVisible(true);
                    that.getView().byId("versionCompPathValue").setVisible(true);
                    that.getView().byId("versionCompPathValue").setEditable(false);

                },
                error: function(oResponse) {
                    that.setBusyVersionChange(false);
                    that.showMessagePopover([that.responseParse(oResponse)], true, true, "bShowMessagesVersion");

                    MessageBox.error(
                        that.getI18nText("AppDetail.versionCompPathNotFound"), {
                            icon: MessageBox.Icon.ERROR,
                            title: that.getI18nText("AppDetail.versionCompPath"),
                            actions: [MessageBox.Action.CLOSE],
                            styleClass: "sapUiSizeCompact",
                            initialFocus: MessageBox.Action.CLOSE
                        }
                    );

                    that.getView().byId("versionCompPathLabel").setVisible(true);
                    that.getView().byId("versionCompPathValue").setVisible(true);
                    that.getView().byId("versionCompPathValue").setEditable(true);
                }
            });

        },

        onVersionSave: function() {

            if (this.versionActionType === "POST" || this.versionActionType === "PUT") {
                if (!this.checkInputValue(["versionName"])) {
                    return false;
                }
                if (!this.checkInputValue(["versionFolder"])) {
                    return false;
                }
                if (this.getView().byId("versionIsBuild").getSelected() && this.versionActionType === "POST") {
                    if (!this.checkInputValue(["versionCompPathValue"])) {
                        return false;
                    }
                }
            }

            this.messagesReset();

            var appName = this.getView().getModel("applicationDetail").getProperty("/name");
            var appFolder = this.getView().getModel("applicationDetail").getProperty("/app_directory");
            var versionId = this.selectedVersion;
            var versionFolder = this.getInputValue("versionFolder").replace("[root]", ""); // remove root alias
            var oPostData = {
                "appName": appName,
                "appFolder": appFolder,
                "versionId": versionId,
                "versionName": this.getInputValue("versionName"),
                "versionDescription": this.getInputValue("versionDescription"),
                "isBuild": this.getView().byId("versionIsBuild").getSelected(),
                "pathPrefix": this.getInputValue("versionCompPathValue"),
                "versionFolder": versionFolder
            };

            if (this.versionActionType === "POST" || this.versionActionType === "PUT") {
                this.setBusyVersionChange(true);
            }

            if (this.versionActionType === "POST" || this.versionActionType === "PUT" || this.versionActionType === "DELETE") {
                var that = this;
                jQuery.ajax({
                    type: that.versionActionType,
                    contentType: "application/json",
                    url: this.getGlobalProperty("/host") + this.getGlobalProperty("/route-applicationVersion"),
                    dataType: "json",
                    async: true,
                    data: JSON.stringify(oPostData),
                    //headers: oHeaders,
                    success: function(oResponse) {

                        var sPath = that.getGlobalProperty("/host") + that.getGlobalProperty("/route-applicationsList");

                        that.getView().getModel("applicationsList").loadData(sPath);
                        that.getView().getModel("applicationsList").refresh(true);

                        that.getView().getModel("applicationsList").attachEventOnce("requestCompleted", function(oEvent) {
                            that.getDetailData(appName);
                        }, that);

                        that.showMessageToast(that.responseParse(oResponse));

                        that.selectedVersion = false;
                        that.getView().byId("versionList").removeSelections();
                        that.setVersionViewState();
                        that.toggleVersionButtons();

                        if (that.versionActionType === "POST" || that.versionActionType === "PUT") {
                            that.setBusyVersionChange(false);
                            that.getView().byId("versionDataChange").close();
                        }
                        that.versionActionType = false;
                    },
                    error: function(oResponse) {

                        if (that.versionActionType === "POST" || that.versionActionType === "PUT") {
                            that.setBusyVersionChange(false);
                            that.showMessagePopover([that.responseParse(oResponse)], true, false, "bShowMessagesVersion");
                        } else {
                            that.showMessagePopover([that.responseParse(oResponse)], true, false, "bShowMessages");
                        }


                    }
                });
            }

        },

        onVersionNameCheck: function(oEvent) {

            var name = oEvent.getSource().getValue();

            if (!this.validateVersionName(name)) {
                oEvent.getSource().setValueStateText(this.getI18nText("AppDetail.valueCheckVersionNameLength"));
                oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                this.getView().byId("bVersionSave").setEnabled(false);
                return false;
            } else {
                oEvent.getSource().setValueStateText(this.getI18nText("AppDetail.valueCheckVersionName"));
                oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                this.getView().byId("bVersionSave").setEnabled(true);
                return true;
            }
        },

        validateVersionName: function(name) {
            var re = /^[\w-.]{1,20}$/; // only [a-zA-Z0-9_-] max 20
            return re.test(name);
        },

        setBusyVersionChange: function(isBusy) {
            var that = this;
            setTimeout(function() {
                that.getView().byId("versionDataChange").setBusy(isBusy);
            }, 0);
        },

        onVersionItemSelection: function(oEvent) {
            this.selectedVersion = oEvent.getParameters().listItem.data("versionId");
            this.selectedVersionListItem = oEvent.getParameters().listItem;
            this.toggleVersionButtons();
        },

        onVersionDeploymentHistorySelection: function(oEvent) {
            this.selectedVersion = oEvent.getSource().data("versionId");

            var versions = this.getView().getModel("applicationDetail").getProperty("/versions");
            for (var i = 0, ilength = versions.length; i < ilength; i++) {
                if (versions[i].version_directory === this.selectedVersion) {
                    this.getView().getModel("sapDeploymentsHistory").setData(versions[i].deployments);
                }
            }

            if (!this.versionDeploymentsHistory) {
                this.versionDeploymentsHistory = sap.ui.xmlfragment(
                    "com.oprtnl.ui5locserv.view.VersionDeploymentHistory",
                    this
                );
                this.getView().addDependent(this.versionDeploymentsHistory);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.versionDeploymentsHistory);
            }

            // open value help dialog filtered by the input value
            this.versionDeploymentsHistory.open();
        },

        onVersionDeploymentHistoryClose: function() {
            this.getView().getModel("sapDeploymentsHistory").setData([]);
            this.versionDeploymentsHistory.close();
        },

        onDeploymentHistoryItemPress: function(oEvent) {
            var bspAppUrl = oEvent.getSource().data("bspAppUrl");

            if (!this.bspAppUrlView) {
                this.bspAppUrlView = sap.ui.xmlfragment(
                    "com.oprtnl.ui5locserv.view.BspAppUrlView",
                    this
                );
                this.getView().addDependent(this.bspAppUrlView);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.bspAppUrlView);
            }

            //this.setInputValue("bspAppUrl", bspAppUrl);
            //this.bspAppUrlView.getAggregation("content")
            this.bspAppUrlView.getAggregation("content")[0].setValue(bspAppUrl);

            this.bspAppUrlView.openBy(oEvent.getSource());

        },

        onBspUrlCopy: function(oEvent) {


            var url = this.bspAppUrlView.getAggregation("content")[0].getValue();
            if (!url) {
                this.showMessageToast({ message: this.getI18nText("AppDetail.bspUrlCopyFailed") });
                return false;
            }
            var textArea = document.createElement("textarea");

            textArea.style.position = "fixed";
            textArea.style.top = 0;
            textArea.style.left = 0;
            textArea.style.width = "2em";
            textArea.style.height = "2em";
            textArea.style.padding = 0;
            textArea.style.border = "none";
            textArea.style.outline = "none";
            textArea.style.boxShadow = "none";
            textArea.style.background = "transparent";

            textArea.value = url;

            document.body.appendChild(textArea);

            textArea.select();

            try {
                var successful = document.execCommand("copy");
                this.showMessageToast({ message: this.getI18nText("AppDetail.bspUrlCopySuccessful") });
            } catch (err) {
                this.showMessageToast({ message: this.getI18nText("AppDetail.bspUrlCopyFailed") });
            }

            document.body.removeChild(textArea);

        },
        
        onBspUrlLink: function(oEvent) {

            var appUrl = this.bspAppUrlView.getAggregation("content")[0].getValue();
            window.open(appUrl, "_blank");
        },  

        onVersionChange: function() {
            var oView = this.getView();
            this.oVersionData = oView.byId("versionDataChange");

            // Create dialog lazily
            if (!this.oVersionData) {
                // Create dialog via fragment factory
                this.oVersionData = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.AppVersionDataChange", this);
                oView.addDependent(this.oVersionData);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oVersionData);
            }

            this.valuesVersionDataReset();

            var versions = this.getView().getModel("applicationDetail").getProperty("/versions");
            for (var i = 0, ilength = versions.length; i < ilength; i++) {
                if (versions[i].version_directory === this.selectedVersion) {
                    this.setInputValue("versionName", versions[i].name);
                    this.setInputValue("versionDescription", versions[i].description);
                    this.setInputValue("versionFolder", versions[i].path);

                    if (versions[i].build) {
                        this.getView().byId("versionIsBuild").setSelected(true);
                    }

                }
            }
            this.getView().byId("bVersionFolder").setEnabled(false);
            this.getView().byId("versionIsBuild").setEditable(false);

            this.versionActionType = "PUT";
            this.oVersionData.open();
        },


        onVersionDelete: function() {
            var oView = this.getView();
            var oVersionData = oView.byId("versionDataChange");

            // Create dialog lazily
            if (!oVersionData) {
                // Create dialog via fragment factory
                oVersionData = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.AppVersionDataChange", this);
                oView.addDependent(oVersionData);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), oVersionData);
            }

            this.valuesVersionDataReset();

            this.versionActionType = "DELETE";
            this.onVersionSave();
        },

        onVersionSapDeploy: function() {
            var oView = this.getView();
            this.oVersionDeploy = oView.byId("versionDeploy");

            // Create dialog lazily
            if (!this.oVersionDeploy) {
                // Create dialog via fragment factory
                this.oVersionDeploy = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.AppVersionDeploy", this);
                oView.addDependent(this.oVersionDeploy);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oVersionDeploy);
            }

            this.valuesVersionDeployDataReset();

            var versions = this.getView().getModel("applicationDetail").getProperty("/versions");
            for (var i = 0, ilength = versions.length; i < ilength; i++) {
                if (versions[i].version_directory === this.selectedVersion) {
                    this.setInputValue("deployVersionName", versions[i].name);
                    this.setInputValue("deployVersionDescription", versions[i].description);
                }
            }

            this.oVersionDeploy.open();
        },

        valuesVersionDeployDataReset: function() {
            this.valuesCleanup(["deployVersionName", "deployVersionDescription", "deployVersionSystem"]);
            this.messagesReset();

        },

        onValueHelpVersionDeploySystem: function(oEvent) {
            this.inputId = oEvent.getSource().getId();
            // create value help dialog
            if (!this.valueHelpDialogSystemFilter) {
                this.valueHelpDialogSystemFilter = sap.ui.xmlfragment(
                    "com.oprtnl.ui5locserv.view.HelpFilterSystem",
                    this
                );
                this.getView().addDependent(this.valueHelpDialogSystemFilter);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.valueHelpDialogSystemFilter);
            }

            this.valueHelpDialogSystemFilter.getBinding("items").filter([]);

            // open value help dialog filtered by the input value
            this.valueHelpDialogSystemFilter.open();
        },

        onValueHelpSystemSearch: function(oEvent) {

            var sValue = oEvent.getParameter("value");

            oEvent.getSource().getBinding("items").filter(new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("description", sap.ui.model.FilterOperator.Contains, sValue),
                    new sap.ui.model.Filter("url", sap.ui.model.FilterOperator.Contains, sValue)
                ],
                and: false
            }));
        },

        onValueHelpSystemFilterClose: function(oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                var inputObject = this.getView().byId(this.inputId);
                inputObject.setValue(oSelectedItem.getTitle());
                inputObject.data("sapSystemUrl", oSelectedItem.getDescription());
                inputObject.data("bspUrlPattern", oSelectedItem.data("bspUrlPattern"));
            }
            oEvent.getSource().getBinding("items").filter([]);
        },

        onValueHelpVersionDeployBspApp: function(oEvent) {
            this.inputId = oEvent.getSource().getId();
            // create value help dialog
            if (!this.valueHelpDialogBspAppFilter) {
                this.valueHelpDialogBspAppFilter = sap.ui.xmlfragment(
                    "com.oprtnl.ui5locserv.view.HelpFilterBspApp",
                    this
                );
                this.getView().addDependent(this.valueHelpDialogBspAppFilter);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.valueHelpDialogBspAppFilter);
            }

            this.valueHelpDialogBspAppFilter.getBinding("items").filter([]);

            // open value help dialog filtered by the input value
            this.valueHelpDialogBspAppFilter.open();
        },

        onValueHelpBspAppSearch: function(oEvent) {

            var sValue = oEvent.getParameter("value");

            oEvent.getSource().getBinding("items").filter(new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("description", sap.ui.model.FilterOperator.Contains, sValue),
                    new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sValue)
                ],
                and: false
            }));
        },

        onValueHelpBspAppFilterClose: function(oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                var inputObject = this.getView().byId(this.inputId);
                inputObject.setValue(oSelectedItem.getTitle());
                inputObject.data("id", oSelectedItem.data("id"));
                this.getTransportsList();
            }
            oEvent.getSource().getBinding("items").filter([]);
        },

        startTransportsCollection: function() {

            if (this.getInputValue("bspAppNameNew") && this.getInputValue("bspAppPackage")) {
                this.getTransportsList();
            }

        },

        onValueHelpVersionDeployPackage: function(oEvent) {
            this.inputId = oEvent.getSource().getId();
            // create value help dialog
            if (!this.valueHelpDialogPackageFilter) {
                this.valueHelpDialogPackageFilter = sap.ui.xmlfragment(
                    "com.oprtnl.ui5locserv.view.HelpFilterPackage",
                    this
                );
                this.getView().addDependent(this.valueHelpDialogPackageFilter);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.valueHelpDialogPackageFilter);
            }

            this.valueHelpDialogPackageFilter.getBinding("items").filter([]);

            // open value help dialog filtered by the input value
            this.valueHelpDialogPackageFilter.open();
        },

        onValueHelpPackageSearch: function(oEvent) {

            var sValue = oEvent.getParameter("value");

            oEvent.getSource().getBinding("items").filter(new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("description", sap.ui.model.FilterOperator.Contains, sValue),
                    new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sValue)
                ],
                and: false
            }));
        },

        onValueHelpPackageFilterClose: function(oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                var inputObject = this.getView().byId(this.inputId);
                inputObject.setValue(oSelectedItem.getTitle());
                inputObject.data("id", oSelectedItem.data("id"));
                this.startTransportsCollection();
            }
            oEvent.getSource().getBinding("items").filter([]);
        },

        onValueHelpVersionDeployTransport: function(oEvent) {
            this.inputId = oEvent.getSource().getId();
            // create value help dialog
            if (!this.valueHelpDialogTransportFilter) {
                this.valueHelpDialogTransportFilter = sap.ui.xmlfragment(
                    "com.oprtnl.ui5locserv.view.HelpFilterTransport",
                    this
                );
                this.getView().addDependent(this.valueHelpDialogTransportFilter);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.valueHelpDialogTransportFilter);
            }

            this.valueHelpDialogTransportFilter.getBinding("items").filter([]);

            // open value help dialog filtered by the input value
            this.valueHelpDialogTransportFilter.open();
        },

        onValueHelpTransportSearch: function(oEvent) {

            var sValue = oEvent.getParameter("value");

            oEvent.getSource().getBinding("items").filter(new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("description", sap.ui.model.FilterOperator.Contains, sValue),
                    new sap.ui.model.Filter("id", sap.ui.model.FilterOperator.Contains, sValue)
                ],
                and: false
            }));
        },

        onValueHelpTransportFilterClose: function(oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                var inputObject = this.getView().byId(this.inputId);
                inputObject.setValue(oSelectedItem.getTitle());
                inputObject.data("id", oSelectedItem.data("id"));
            }
            oEvent.getSource().getBinding("items").filter([]);
        },

        onVersionDeployClose: function() {
            this.valuesVersionDeployDataReset();
            this.getView().byId("versionDeploy").close();
        },

        onVersionDeployStart: function() {

            if (!this.checkInputValue(["deployVersionSystem"])) {
                return false;
            }

            this.deploymentConfig = {
                systemDescription: this.getInputValue("deployVersionSystem"),
                systemUrl: this.getView().byId("deployVersionSystem").data("sapSystemUrl"),
                bspUrlPattern: this.getView().byId("deployVersionSystem").data("bspUrlPattern")
            };

            this.messagesReset();
            this.valuesVersionDeployDataReset();
            this.getView().byId("versionDeploy").close();


            var oView = this.getView();
            this.oDeployAuthentication = oView.byId("deploymentBasicAuth");

            if (!this.oDeployAuthentication) {
                this.oDeployAuthentication = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.BasicAuth", this);
                oView.addDependent(this.oDeployAuthentication);
                // forward compact/cozy style into dialog
                jQuery.sap.syncStyleClass(this.getView().getController().getContentDensityClass(), this.getView(), this.oDeployAuthentication);

            }

            this.setInputValue("sapSystemDescription", this.deploymentConfig.systemDescription);
            this.valuesCleanup(["sapDeployUser", "sapDeployPassword"]);
            this.oDeployAuthentication.open();

        },

        onVersionDeployAuthClose: function() {
            this.valuesCleanup(["sapSystemDescription", "sapDeployUser", "sapDeployPassword"]);
            this.messagesReset();
            this.getView().byId("deploymentBasicAuth").close();
        },

        onVersionDeployAuthConfirm: function() {

            if (!this.checkInputValue(["sapDeployUser"])) {
                return false;
            }

            if (!this.checkInputValue(["sapDeployPassword"])) {
                return false;
            }

            this.deploymentConfig["requestHeaders"] = { "Authorization": "Basic " + btoa(this.getInputValue("sapDeployUser") + ":" + this.getInputValue("sapDeployPassword")) };


            this.setBusy("deploymentBasicAuth", true);

            var oPostData = {
                "deploymentConfig": this.deploymentConfig
            };

            var that = this;
            jQuery.ajax({
                type: "POST",
                contentType: "application/json",
                url: this.getGlobalProperty("/host") + this.getGlobalProperty("/route-bspAppsList"),
                dataType: "json",
                async: true,
                data: JSON.stringify(oPostData),
                //headers: oHeaders,
                success: function(oResponse) {

                    that.getView().getModel("bspApplicationsList").setData(oResponse);

                    that.messagesReset();
                    that.setBusy("deploymentBasicAuth", false);
                    that.valuesCleanup(["sapSystemDescription", "sapDeployUser", "sapDeployPassword"]);
                    that.getView().byId("deploymentBasicAuth").close();


                    var oView = that.getView();
                    that.oDeployBsp = oView.byId("versionDeployBsp");

                    if (!that.oDeployBsp) {
                        that.oDeployBsp = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.AppVersionDeployBsp", that);
                        oView.addDependent(that.oDeployBsp);
                        // forward compact/cozy style into dialog
                        jQuery.sap.syncStyleClass(that.getView().getController().getContentDensityClass(), that.getView(), that.oDeployBsp);

                    }

                    that.valuesCleanup(["bspAppNameNew", "bspAppNameChange", "bspAppPackage", "deployTransport"]);
                    that.oDeployBsp.open();

                },
                error: function(oResponse) {

                    that.setBusy("deploymentBasicAuth", false);
                    that.showMessagePopover([that.responseParse(oResponse)], true, false, "bShowMessagesDeploymentAuthentication");
                }
            });

        },

        onVersionDeployCloseBsp: function() {
            this.valuesCleanup(["bspAppNameNew", "bspAppNameChange", "bspAppPackage", "deployTransport", "bspAppDescription"]);
            this.deploymentConfig = {};
            this.messagesReset();
            this.getView().byId("versionDeployBsp").close();
        },

        onBspApplicationProcType: function(oEvent) {
            var idx = oEvent.getParameters().selectedIndex;
            if (idx) {
                this.bspAppDeployTypeNew = true;
                this.getView().byId("bspAppNameNew").setVisible(true);
                this.getView().byId("bspAppDescription").setVisible(true);
                this.getView().byId("bspAppDescriptionLabel").setVisible(true);
                this.getView().byId("bspAppNameChange").setVisible(false);
                this.valuesCleanup(["bspAppNameChange", "bspAppNameNew", "bspAppPackage", "bspAppDescription", "deployTransport"]);
                this.getView().byId("bspAppNameChange").setValue(false);
                this.getView().byId("bspAppPackageLabel").setVisible(true);
                this.getView().byId("bspAppPackage").setVisible(true);
                this.getView().byId("deployTransport").setEnabled(false)
            } else {
                this.bspAppDeployTypeNew = false;
                this.getView().byId("bspAppNameNew").setVisible(false);
                this.getView().byId("bspAppDescription").setVisible(false);
                this.getView().byId("bspAppDescriptionLabel").setVisible(false);
                this.getView().byId("bspAppNameChange").setVisible(true);
                this.valuesCleanup(["bspAppNameChange", "bspAppNameNew", "bspAppPackage", "bspAppDescription", "deployTransport"]);
                this.getView().byId("bspAppPackageLabel").setVisible(false);
                this.getView().byId("bspAppPackage").setVisible(false);
                this.getView().byId("deployTransport").setEnabled(false)
            }
        },

        validateBspAppName: function(name) {
            var re = /^[\w\/]{1,15}$/; // only [a-zA-Z0-9_-] max 20
            return re.test(name);
        },

        onBspAppNameCheck: function(oEvent) {

            var name = oEvent.getSource().getValue();
            if (!this.validateBspAppName(name)) {
                oEvent.getSource().setValueStateText(this.getI18nText("AppDetail.bspAppNameCheck"));
                oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                this.getView().byId("bVersionDeployStartBsp").setEnabled(false);
                return false;
            } else {
                oEvent.getSource().setValueStateText(this.getI18nText("AppDetail.bspAppNameCheck"));
                oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                this.getView().byId("bVersionDeployStartBsp").setEnabled(true);

                this.startTransportsCollection();
                return true;
            }
        },


        getTransportsList: function() {

            this.deploymentConfig["bspProperties"] = {};

            if (this.bspAppDeployTypeNew) {
                if (!this.checkInputValue(["bspAppNameNew"])) {
                    return false;
                }
                if (!this.checkInputValue(["bspAppPackage"])) {
                    return false;
                }

                this.deploymentConfig.bspProperties["bspApplication"] = this.getInputValue("bspAppNameNew");
                this.deploymentConfig.bspProperties["bspAppPackage"] = this.getInputValue("bspAppPackage");
            } else {
                if (!this.checkInputValue(["bspAppNameChange"])) {
                    return false;
                }
                this.deploymentConfig.bspProperties["bspApplication"] = this.getInputValue("bspAppNameChange");
            }

            this.valuesCleanup(["deployTransport"]);
            this.messagesReset();

            var oPostData = {
                "deploymentConfig": this.deploymentConfig
            };

            var requestUrl = this.getGlobalProperty("/host") + this.getGlobalProperty("/route-transportsList");

            this.setBusy("versionDeployBsp", true);

            var that = this;
            jQuery.ajax({
                type: "POST",
                contentType: "application/json",
                url: requestUrl,
                dataType: "json",
                async: true,
                data: JSON.stringify(oPostData),
                //headers: oHeaders,
                success: function(oResponse) {

                    if (oResponse.locks.length) {
                        that.getView().getModel("sapTransportsList").setData(oResponse.locks);
                    } else {
                        if (oResponse.requests.length) {
                            that.getView().getModel("sapTransportsList").setData(oResponse.requests);
                        }
                    }

                    if (oResponse.messages.length) {
                        that.showMessagePopover(oResponse.messages, true, false, "bShowMessagesVersionDeploymentBsp");
                    }

                    that.showMessageToast(that.getI18nText("AppDetail.transportsListReady"));

                    that.getView().byId("deployTransport").setEnabled(true);

                    that.setBusy("versionDeployBsp", false);

                },
                error: function(oResponse) {

                    that.setBusy("versionDeployBsp", false);
                    that.showMessagePopover([that.responseParse(oResponse)], true, false, "bShowMessagesVersionDeploymentBsp");
                }
            });

        },

        onVersionDeployStartBsp: function() {

            this.deploymentConfig["bspProperties"] = {};

            if (!this.bspAppDeployTypeNew) {
                this.bspAppDeployTypeNew = false;
            }

            if (this.bspAppDeployTypeNew) {
                if (!this.checkInputValue(["bspAppNameNew"])) {
                    return false;
                }
                if (!this.checkInputValue(["bspAppPackage"])) {
                    return false;
                }
                this.deploymentConfig.bspProperties["bspApplication"] = this.getInputValue("bspAppNameNew");
                this.deploymentConfig.bspProperties["bspAppPackage"] = this.getInputValue("bspAppPackage");
                this.deploymentConfig.bspProperties["bspAppDescritpion"] = this.getInputValue("bspAppDescription");
                this.deploymentConfig.bspProperties["isNewApp"] = true;
            } else {
                if (!this.checkInputValue(["bspAppNameChange"])) {
                    return false;
                }
                this.deploymentConfig.bspProperties["bspApplication"] = this.getInputValue("bspAppNameChange");
                this.deploymentConfig.bspProperties["bspApplicationId"] = this.getView().byId("bspAppNameChange").data("id")
                this.deploymentConfig.bspProperties["isNewApp"] = false;
            }

            if (!this.checkInputValue(["deployTransport"])) {
                return false;
            }

            this.deploymentConfig.bspProperties["bspTransport"] = this.getInputValue("deployTransport");
            this.deploymentConfig.bspProperties["versionDirectory"] = this.selectedVersion;

            this.messagesReset();

            var oPostData = {
                "adtConfig": this.deploymentConfig
            };

            var requestUrl = this.bspAppDeployTypeNew ? this.getGlobalProperty("/host") + this.getGlobalProperty("/route-versionDeployNew") : this.getGlobalProperty("/host") + this.getGlobalProperty("/route-versionDeployChange");

            this.setBusy("versionDeployBsp", true);

            var that = this;
            jQuery.ajax({
                type: "POST",
                contentType: "application/json",
                url: requestUrl,
                dataType: "json",
                async: true,
                data: JSON.stringify(oPostData),
                //headers: oHeaders,
                success: function(oResponse) {

                    that.getView().getModel("deploySyncCheckList").setData(oResponse);
                    that.showMessageToast(that.getI18nText("AppDetail.synchronizationListReady"));

                    that.getView().byId("versionList").removeSelections();
                    that.setVersionViewState();
                    that.toggleVersionButtons();

                    that.setBusy("versionDeployBsp", false);
                    that.getView().byId("versionDeployBsp").close();


                    var oView = that.getView();
                    that.oDeploySync = oView.byId("versionDeploySync");

                    if (!that.oDeploySync) {
                        that.oDeploySync = sap.ui.xmlfragment(oView.getId(), "com.oprtnl.ui5locserv.view.AppVersionDeploySync", that);
                        oView.addDependent(that.oDeploySync);
                        // forward compact/cozy style into dialog
                        jQuery.sap.syncStyleClass(that.getView().getController().getContentDensityClass(), that.getView(), that.oDeploySync);

                    }

                    that.oDeploySync.open();

                },
                error: function(oResponse) {

                    that.setBusy("versionDeployBsp", false);
                    that.showMessagePopover([that.responseParse(oResponse)], true, false, "bShowMessagesVersionDeploymentBsp");
                }
            });


        },

        onVersionDeploySyncCancel: function() {
            this.deploymentConfig = {};
            this.messagesReset();
            this.getView().byId("versionDeploySync").close();
        },

        onVersionDeploySyncOk: function() {

            this.messagesReset();

            var oPostData = {
                "deploymentConfig": this.deploymentConfig,
                "deploymentSync": this.getView().getModel("deploySyncCheckList").getData(),
                "versionId": this.selectedVersion,
                "appName": this.getView().getModel("applicationDetail").getProperty("/name")
            };

            this.setBusy("versionDeploySync", true);

            var appName = this.getView().getModel("applicationDetail").getProperty("/name");
            var that = this;
            jQuery.ajax({
                type: "POST",
                contentType: "application/json",
                url: this.getGlobalProperty("/host") + this.getGlobalProperty("/route-versionDeploySubmit"),
                dataType: "json",
                async: true,
                data: JSON.stringify(oPostData),
                //headers: oHeaders,
                success: function(oResponse) {

                    that.showMessageToast(that.responseParse(oResponse));

                    that.getView().getModel("deploySyncCheckList").setData({});

                    that.selectedVersion = false;
                    that.getView().byId("versionList").removeSelections();
                    that.setVersionViewState();
                    that.toggleVersionButtons();

                    var sPath = that.getGlobalProperty("/host") + that.getGlobalProperty("/route-applicationsList");
                    that.getView().getModel("applicationsList").loadData(sPath);
                    that.getView().getModel("applicationsList").refresh(true);

                    that.getView().getModel("applicationsList").attachEventOnce("requestCompleted", function(oEvent) {
                        that.getDetailData(appName);
                    }, that);


                    that.setBusy("versionDeploySync", false);
                    that.getView().byId("versionDeploySync").close();
                },
                error: function(oResponse) {

                    that.setBusy("versionDeploySync", false);
                    that.showMessagePopover([that.responseParse(oResponse)], true, false, "bShowMessagesVersionDeploymentSync");
                }
            });

        },

        onBackButton: function() {

            var that = this;
            if (this.isChangeActive) {
                MessageBox.warning(
                    that.getI18nText("AppDetail.appChangesLost"), {
                        icon: MessageBox.Icon.WARNING,
                        title: that.getI18nText("AppDetail.appChangesLostHead"),
                        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                        styleClass: "sapUiSizeCompact",
                        initialFocus: MessageBox.Action.CLOSE,
                        onClose: function(action) {
                            if (action === MessageBox.Action.CANCEL) {
                                return false;
                            } else {
                                that.onBackConfirmed();
                            }
                        }
                    }
                );
            } else {
                this.onBackConfirmed();
            }


        },

        onBackConfirmed: function() {
            this.appDetailFragmentView();
            this.toggleDetailChangeButtons(false);

            this.isChangeActive = false;

            this.globalBusyOn();

            var oRouter = this.getRouter(this);
            oRouter.navTo("appList");
        }

    });
});