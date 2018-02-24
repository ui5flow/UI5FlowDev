
# UI5FlowDev

UI5FlowDev enables you to manage and run your UI5 applications on a local server with reverse-proxy support. It also provides you the option to build your applications and deploy them to SAP NetWeaver ABAP.

## Installation

UI5FlowDev should be installled globally.

```sh
$ npm install ui5flowdev --global
```

UI5FlowDev requires [Node.js](https://nodejs.org/) v6+ to run.

## UI5FlowDev start

Open your console and type

```sh
$ ui5flow
```
This command will start the server on HTTP port you defined in the initial setup and automatically open browser with UI5FlowDev application.

In case of first start, simple configuration wizard is started. You have to specify the server port and where you want to store your UI5FlowDev development artifacts. 

## UI5FlowDev stop

Ctrl+C in your console and confirm process termiantion with 'Y'.

## User guide

### Applications list

Applications list displays all your applications registered in UI5FlowDev.

### Add application
1. In the lower-right corner of the _Applications_ list click on _Add_ button.
2. Type _Name_ and _Description_ of your application.
3. Click on _Save_ button in the lower-right corner of the dialog window.  

After successful save you will be automatically redirected to your Application details.

### Add application artifacts
With the application created you can copy your development resources to the root folder of your application.
> By clicking on the _Resources path_ a path to the root folder will be stored in clipboard so you can just simply do cd > paste to this directory on your local machine.

You should copy your custom UI5 application resources into this folder.

### Change application properties
1. Select application in the _Applications_ list to display the details.
2. Select _Properties_ tab. 
3. Click on _Change_ button in the lower-right corner.
4. You can change _Local URL_, _Display name_ and _Description_.
* _Local URL_ is URL to your the _index.html_ file of your UI5 application. 
> You might need to change this URL in case your index.html file is stored in any subfolder (e.g. webapp).
* _Display name_ is an application name suitable for display purpose and used as a default application name. 
* _Description_ is description of the application. It should contain a brief description of the functionalities, purpose, etc.

## Delete application 
1. Select application in the _Applications_ list to display the details.
2. Select _Settings_ tab. 
3. Click on _Delete_ button and follow the instructions in the confirmation dialog. 
4. Click on _Delete_ button in the lower-right corner of the confirmation dialog.
Your application will be deleted and you`ll be redirected to the _Applications_ list.
> Deletion of application will delete the application and all the objects related to the application (Versions, Service proxies). Deletion of application cannot be undone.

## Create service proxy
1. Click on _Settings_ menu button in the top-right corner. 
2. Select _Service Proxies_.
3. Click on _Add_ button in the lower-right corner of the _Service proxies_ dialog. 
4. Type _Description_ of the service proxy. 
5. In the definition part of service proxy provide following inputs:
* _Target host_ of your webservice
   > Example: In following service URL `https://api.foo.com/service/do/something?query-param=value` is target host `https://api.foo.com`. 
* _Path_ defines the context of your service.   
   > Example: In following service URL `https://api.foo.com/service/do/something?query-param=value` is path `/service/do/something`.   
   
   In the _Service path_ input type the path to your webservice.

* _Path rewrite_ provides an option to replace any part of the _Service path_ with an alternative path which might be necessary to access the service. This is suitable in cases where you have your webservices defined in your manifest.json file (or any other setup file) and you don\`t want to make changes in your application source code to enable access of your webservices from the UI5Flow platform. 
 
   > Example: In the manifest.json you have defined webservices running on SAP HANA XS system which are accessible through a SAP SCP based destination. The webservice URL on SAP SCP is e.g. `https://my-hcp-instance.dispatcher.hana.ondemand.com/destinations/my-service-destination/my-service/do/something?query-param=value`. In case you want to access this specific webservice directly on your SAP HANA XS system from the UI5Flow platform with URL   `https://mysaphanainstance.ondemand.com/my-service/do/something?query-param=value` you have to type following inputs:   
   _Service path_: `/destinations/my-service-destination/my-service/do/something?query-param=value`  
   _Service path transformation_ (origin): `/destinations/my-service-destination`  
   _Service path transformation_ (taget): `` (leave empty)  
   _Target host_: `https://mysaphanainstance.ondemand.com`

* _Request headers_ should be used in case your service requires Basic authentication or any other header information. 

6. Click on _Save_ button in the lower-right corner of the dialog.

_Service Proxy_ is created and displayed in the list of _Service proxies_.
Created _Service Proxy_ may be now used by any of your application added to the UI5FlowDev.

## Create SAP system connection
1. Click on _Settings_ menu button in the top-right corner. 
2. Select _SAP Systems_.
3. Click on _Add_ button in the lower-right corner of the _SAP Systems_ dialog. 
4. Type _Description_ of the SAP System connection. 
5. Type _Application server URL_ of the SAP System connection. E.g. https://yoursapserverhost.com
> This URL should be accessible from your browser using a Basic authentication. Usually it points to a SAP Gateway system.
To check if your access to the ADT services works try to access `https://yoursapserverhost.com/sap/bc/adt/discovery`. In case you cannot access the ADT services please review ICF settings on the SAP system. Better option  how to check the access to your SAP system is using any REST client which gives you better control over HTTP request headers.
6. _BSP Application URL pattern_ is predefined URL pattern of your application on the SAP System. This pattern is used to generate links to your application on SAP system deployed from UI5FlowDev.
7. Click on _Save_ button in the lower-right corner of the dialog.
_SAP System connection_ is created and displayed in the list of _SAP System connections_.
_SAP System connection_ is used in the deployment process of your UI5 applications.

## Create application version
1. Select application in the _Applications_ list to display the details.
2. Select _Versions_ tab. 
3. Click on _Create_ button in the lower-right corner.
4. Type _Version name_ and _Description_ of new version. 
5. _Root directory_ enables you to select the right directory in the directory structure of your application for the application version. Generally the _Root directory_ should contain `index.html` and `Component.js` file.

> By clicking on _Apply_ button without selecting any subdirectory, the root folder will be selected. Navigation between subdirectories and their parent is possible using the _Selected root path_ breadcrumbs.

6. _UI5 Application build_ provides you an option to automatically generate the `Component-preload.js` file. 

> Precondition of successful generation of `Component-preload.js` file is the identification of _Component path_ in the `Component.js` file. `Component.js` file has to be located in the selected _Root directory_. In case the `Component.js` file cannot be located or the _Component path_ cannot be extracted from the `Component.js` file, there is an option to type the _Component path_ manually.

7. Click on _Save_ button in the lower-right corner of the dialog.

_Application version_ is created and displayed in the _List of available application versions_.
Generated version is stored in the _versions_ directory of your UI5FlowDev development artifacts structure. 

## Deploy version to SAP ABAP Netweaver
1. Select application in the _Applications_ list to display the details.
2. Select _Versions_ tab. 
3. Select version you want to deploy.
4. Click on _SAP Deploy_ button in the lower-right corner.
5. Select SAP System in the value help dialog.

> If you haven`t defined SAP System yet, please proceed to chapter _Create SAP system connection_.

6. Type your _User_ and _Password_ in the _Authentication_ dialog. Use the user you use to login to the selected SAP System.

> In case the login fails, please review your connection settings (VPN Connection, etc.)

7. Choose if you want to deploy a new application or re-deploy an existing application.

> In case of _Re-deploy_ of existing application select your application from the _BSP Application name_ value help dialog.
In the _Transport_ value help select a transport in which you want to store your objects after deploying to SAP System. 

> In case of _Deploy new application_ type _BSP Application name_ and _Description_ of the BSP application, select _Package_ in the value help dialog and select _Transport_ in the value help dialog.

8. Click on _Deploy_ button in the lower-right corner.

9. Review the list of objects to be deployed to the SAP system.

10. Click on _Deploy_ button in the lower-right corner.

After successful deployment check your BSP application on the SAP System. In the _List of available application versions_ a message box with information about the deployment is displayed. 







