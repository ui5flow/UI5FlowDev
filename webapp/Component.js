sap.ui.define([
   "sap/ui/core/UIComponent",
   "sap/ui/model/json/JSONModel",
   "com/oprtnl/ui5locserv/model/models"  
], function (UIComponent, JSONModel, models) {
   "use strict";
   return UIComponent.extend("com.oprtnl.ui5locserv.Component", {

      metadata : {
            manifest: "json"
      },

      init : function () {
         // call the init function of the parent
         UIComponent.prototype.init.apply(this, arguments);

         // set global properties model
         this.setModel(models.initGlobalPropertiesModel(), "globalProperties");
         
         // set the device model
         this.setModel(models.initDeviceModel(), "device");

         // initialize router
         this.getRouter().initialize();
        
	}
   });
});