# Bods Test Flow
The concept of this flow is to bring the simplest automation approach. It requires low code and technical skills of QC. The framework works as an assitant who will help to check the test cases based on image comparison method (betwwen baseline and actual).

> Test Cases <==> Doing manual test <==> Using Recorder <==> Export to Mocha script <==> Run script within framework <==> Check Allure report and take action

# Getting started

## Preconditions:
- Install [NodeJS](https://nodejs.org/en/) - 18.12.1 LTS or later
- Install [Python](https://www.python.org/) - 3.11 or later
- Install & Run [Docker](https://www.docker.com/): After installed Docker, go to __bods-test-flow__ folder and run:
    ```
    docker compose up
    ```
- Install npm dependencies: go to __bods-test-flow__ folder and run
    ```
    npm i
    ```
__Note__: Docker is used for Selenium Grid, if you want to use your own browser, you can install more services from WDIO like - [chromedriver](https://webdriver.io/docs/wdio-chromedriver-service)

## Mobile automation test setup:
### Install Appium and Inspector
- Install Appium __v2__
    ```
    npm install -g appium@next
    ```
- Check if Appium was installed
    ```
    appium -v
    ```
- Install an Appium driver and its dependencies
    ```
    appium driver install uiautomator2
    ```
- To check the list of drivers and status
    ```
    appium driver list
    ```
- Run Appium server
    ```
    appium server -pa /wd/hub
    ```
- Download Appium Inspector from [here](https://github.com/appium/appium-inspector/releases)
### Install Android SDK (Android Studio) and/or iOS SDK (XCode)
- Download and install [Android Studio](https://developer.android.com/studio) or [XCode](https://developer.apple.com/xcode/).

    __Note__: XCode is used only for MacOS if you want to do automation test with iOS application
- Install [JAVA JDK](https://www.oracle.com/java/technologies/downloads/)
- Add __JAVA_HOME__ to system environments by following this [reference](https://confluence.atlassian.com/doc/setting-the-java_home-variable-in-windows-8895.html).
- Add __ANDROID_HOME__ to system environments by following this [reference](https://www.programsbuzz.com/article/set-androidhome-environment-variable-windows-10).
### Install emulator or connect with real device
- To manage emulators, you can use Android Studio or XCode. Each tool has Devices Manager feature where you can create and manage emulator.
- For Android, to connect real device, you have to turn on __USB debugging__ in Developer options, refer to this [tutorial](https://www.samsung.com/uk/support/mobile-devices/how-do-i-turn-on-the-developer-options-menu-on-my-samsung-galaxy-device/).
- Install [Vysor](https://www.vysor.io/download/) to control the real device on your OS.
### Wdio framework communicates to Appium
- By default, Appium server uses port __4723__, so check and update the following configs in __wdio-mobile.conf.js__ accordingly.
    - port: 4723
    - path: "/wd/hub/"
- Wdio communicates to Appium through __Capabilities__, refer [here](https://appium.io/docs/en/writing-running-appium/caps/) for more detail.
- Depends on the driver you use to communicate, the capabilities are supported differently. But mandatory, there are some capabilities that you have to define the same for all drivers:
    - __udid__:
        - To get __udid__ of an iOS app, you can find it from Devices Manager on XCode.
        - To get __udid__ of an Android app, you can use this command.
            ```
            adb devices
            ```
    - __appPackage__ and __appActivity__: you can ask them from developers or try by yourself with some steps below.
        - Connect your device to OS.
        - Run this command.
            ```
            adb -s [device_id] logcat > logcat.txt
            ```
        - Open application on your device and wait until app is loaded completely.
        - Go back the command line and press __Ctrl + C__ to stop the command.
        - Open the logcat.txt file and search for something like __MainActivity__, then you can find the __appPackage__ and __appActivity__ somewhere in the log.
- The __capabilities__ are managed in the __data__ folder of project ./test/specs/__[client_id]__/__[project_id]__/data/capabilities.json
- There are 2 custom capabilities that are used only for the framework.
    - __custom:enabled__: set this one to __True/False__ to tell the framework which capability is enabled and can be used to communicate to Appium.
    - __custom:cid__: is defined in __wdio-mobile.conf.js__, example __"custom:cid": "cid.002"__

        __Note__: the __custom:cid__ is used to bind the id defined in __wdio-mobile.conf.js__ with the id defined in __capabilities.json__ while the __custom:enabled__ is used to enable or disable the capability.
    
## Clone source code
- Request project repository => check with your manager to get __repository url__ and __branch name__
- Clone code to your local machine
    ```
    git clone https://github.com/Bods-Inc/bods-functional-tests.git
    git submodule update --init --remote utils
    git submodule update --init --remote <specific_path_to_submodule>
    git submodule foreach git pull origin HEAD:main
    ```
    __Note__: <specific_path_to_submodule> is the path to your project folder (e.g. _test/specs/dentsu-digital/chugai_)

## Manage project spec files
- Project spec files are stored in: ./test/specs/__[client_id]__/__[project_id]__/record/__[type]__
    - __[client_id]__ & __[project_id]__ are provided by your manager
    - __[type]__: fullpage or screen or mobile
        - __fullpage__: is used for a web page. Screenshot is captured from top to bottom.
        - __screen__: is used for a web page. Screenshot is captured by current displayed screen.
        - __mobile__: is used for mobile native, hydrid or flutter application. Screenshot is captured by current displayed screen.
    - Spec file name must be uniqued and followed this format: __[project_id]__.__[user_story_id]__-__[case_id]__.js
        - __[user_story_id]__: is defined based on your test cases.
        - __[case_id]__: a smaller case of user story.
        ##### Example: ssh-support.001-C001.js

## Manage project data

### data.xlsx
- You can find this excel from ./test/specs/__[client_id]__/__[project_id]__/data
- The excel includes:
    - __config__:
        - __base_url__: the base url of website needs to be tested. Keep it default if you are testing mobile app.
        - __client__: client name that will be displayed on Allure report.
        - __project__: project name that will be displayed on Allure report.
        - __create_jira__: yes or no (or empty) if you want to create jira ticket automatically for failed case (this is applied only for bods Jira)
        - __jira_key__: project Jira Key (can get from your Jira project URL)
        - __closed_transition_id__: do not change this value (it is used for bods Jira only)
        - __reopen_transition_id__: do not change this value (it is used for bods Jira only)
    - __auth__: is used if your website requires an access authentication.
        - __enabled__: turn on or off this feature
        - __usr__: username
        - __pass__: password
        - __wait__: the timeout to be waited after passed authentication
        - __handler__: only is used if the base_url is not the endpoint of authentication
    - __img_compare__: is used for image comparison module
        - __config | value | type__
            - __wait_for__: default 3000ms. For some web pages, we need to wait until all the media and animations to be loaded completely before taking screenshot.
            - __fullPageScrollTimeout__: is used for web page only. The timeout in milliseconds to wait after a scroll.
            - __ignoreTransparentPixel__: is used for both web and mobile app. Compare images and it will ignore all pixels that have some transparency in one of the images.
            - __ignoreAntialiasing__: is used for both web and mobile app. Compare images and discard anti aliasing.
            - __scaleImagesToSameSize__: is used for web page only. Scales 2 images to same size before execution of comparison. Highly recommended to enable ignoreAntialiasing and ignoreAlpha.
            - __largeImageThreshold__: is used for both web and mobile app. When providing a number for the amount of pixels here (higher then 0), the comparison algorithm skips pixels when the image width or height is larger than largeImageThreshold pixels.
            - __disableCSSAnimation__: is used for web page only. Disable all css animations and the input caret and the input caret in the application.
            - __ignoreColors__: is used for both web and mobile app. Even though the images are in colour, the comparison wil compare 2 black & white images/
            - __ignoreAlpha__: is used for both web and mobile app. Compare images and discard alpha.
            - __debug__: is used for mobile app only. Turn on debug mode.
            - __element_blockout_margin__: when blockout an element, add custom margin around it.
        - __hide_element__: list of selectors, one row one element. All elements are defined here will be set __visibility:hidden__ before taking screenshot.
        - __remove_element__: list of selectors, one row one element. All elements are defined here will be set __display:none__ before taking screenshot.
        - __element_blockout__: list of selectors, one row one element. All elements are defined here will be blocked out before taking screenshot.
    - __pages__: list of all pages will be generated into spec files automatically
        - __domain__: website domain
        - __handler__: the page handler
        - __page_id__: the page id will be set in the spec file name
- To integrate with bods Jira, you have to ensure the issue type "__Automation Bug__" is enabled for your project.

### capabilities.json
- You can find this excel from ./test/specs/__[client_id]__/__[project_id]__/data
- For website, the default capabilities is Chrome. You can add more capabilities for Firefox, etc. into this file.
- For mobile, there is no default capabilities because it's depending on each project. You have to change the value accordingly.
- Each capability has a uniqued ID (e.g _cid.001_) that you have to ask your manager to generate for you.

## Integrate to Google API
### Preparation
- Enable Google Drive API and Google Sheets API from Google Cloud > Console > API & Services.
- Create OAuth consent screen. Remember to add Test user.
- Create credential
    - Create OAuth 2.0 Client ID
    - Choose "Desktop App"
    - Download credential and name to "credentials.json"
    - Copy credentials.json to folder "./utils/lib"
- Login to Google Drive and create new folder to store the images and google sheet
- Change the permision of image folder to "everyone can access with the link"
- Run command to install the dependencies
```
npm i
```

### Configuration
- Go to folder used to store images and get folder id.
    Example: with the share link https://drive.google.com/drive/folders/1W5i34qnrUd7l-DnNuABmcLxhlVSjZoLb?usp=drive_link, the id is 1W5i34qnrUd7l-DnNuABmcLxhlVSjZoLb. 
- Add this id to "gDriveFolders" in wdio-config.js.
- Get the Google Sheet id (same way as folder id) and add into "gSheetId" in wdio-config.js

### How to use
- Import the lib from utils/lib/gapi.js
- uploadFile function is used to upload file to Google Drive. Return is file id.
- insertImg2GS function is used to insert image into Google Sheet. The range should be in A1N format ("e.g. Sheet1!A1:A1).

## Commit your changes and push your code
- You can use VS Code Studio to manage your GIT or using CLI as below:
    - Go to project folder: ./test/specs/__[client_id]__/__[project_id]__
    - Run these commands:
        ```
            git pull
            git add -A
            git commit -m "add: spec [spec_id]"
            git push
        ```
    - Create merge request and ask your manager to merge the new records into main branch.
    - Go back to __bods-test-flow__ folder and run commands:
        ```
            git pull --recurse-submodules
            git add -A
            git commit -m "update: source code project [project_id]"
            git push
        ```
## NPM scripts
- When you converted the script from a recorder tool to Mocha, sometime the script is converted to Sync mode. You have to run the built-in npm script to convert it into Async mode.
    - Check the npm script and run __codemode__
    - Or run this command in terminal:
        ```
        jscodeshift -t ./node_modules/@wdio/codemod/async ./test/specs/
        ```
- To view Allure report, you have to start the Allure server. To do that, you can run the built-in npm script __allure__. The report will be generated and displayed automatically.

__Note__: you have to stop the Allure server and run again if you want to see new data.

## Auto scripts
- There are some scripts will be attached automatically into your script after you executed it. These scripts are used to integrate with the core framework so you can't remove or modify it.
- You can customize the image comparison algorithm by uncomment and change the value of following scripts (attached automatically into your spec after your 1st execution):
    - Custom full page scroll timeout: value is __milliseconds__
    <br> `await utils.addCaptureOpts("ssh-support.component-header", "fullPageScrollTimeout", 3000, "web");`

    - Ignore transparent pixel: value is __True/False__
    <br> `await utils.addCaptureOpts("ssh-support.component-header", "ignoreTransparentPixel", true, "web");`

    - Ignore anti aliasing: value is __True/False__
    <br> `await utils.addCaptureOpts("ssh-support.component-header", "ignoreAntialiasing", true, "web");`

    - Scale images to same size: value is __True/False__
    <br> `await utils.addCaptureOpts("ssh-support.component-header", "scaleImagesToSameSize", false, "web");`

    - Skips pixels when the image width or height is larger than largeImageThreshold pixels: value is __pixel__
    <br> `await utils.addCaptureOpts("ssh-support.component-header", "largeImageThreshold", 500, "web");`

    - Disable CSS animation: value is __True/False__
    <br> `await utils.addCaptureOpts("ssh-support.component-header", "disableCSSAnimation", true, "web");`

    - Compare images with Black/White: value is __True/False__
    <br> `await utils.addCaptureOpts("ssh-support.component-header", "ignoreColors", true, "web");`
    
    - Ignore alpha text: value is __True/False__
    <br> `await utils.addCaptureOpts("ssh-support.component-header", "ignoreAlpha", false, "web");`

- Refer [above](#manage-project-data) for the meaning of each option.

# VS Code Extensions that are useful
- GitLens
- Prettier
- Material Icon Theme

# For administrator, following instructions are used to manage the framework and GIT flow

## Add new submodule
- To add a new project, you have to add it as a submodule
    ```
    git submodule add --name [name] <repository> <path>
    ```
- With:
    - __name__: the project name
    - __repository__: project repository url
    - __path__: is the path to the project folder (e.g. _test/specs/dentsu-digital/chugai_)

## Utils
- The core lib is managed in repository [bods Test Flow Utils](github utils url)

## Init a new project
- Go to utils folder and add new project into data.json. The structure of json is something like:
    :"projects": {"__[client_id]__": { "__[project_id]__": {} }:

    ##### Example: "projects": {"sportshub-sg": { "ssh-support": {} }
    ##### Note: if the client is existing, just add a new project inside that client instead of creating duplicated clients.
- Run npm script __init__ or command below:
    ```
    npx wdio run wdio.conf.js --spec init.js
    ```
- The project folder will be created automatically with following default structure:
    - path: test/specs/__[client_id]__/__[project_id]__
    - data folder: contains 2 files
        - data.xlsx
        - capabilities.json
    - record folder: contains 3 sub-folders
        - fullpage
        - screen
        - mobile
    - inside 3 sub-folders, there is readme.txt file too.
- If there is any missing file or folder which means the script was failed. You can check the log to fix the issue and execute again.
- After executed, data.json will add the status "init":"done" to ignore for next time if it's running.

## Create package for AWS Farm Devices

### Preparation
- Clone the source code
```
git clone https://github.com/Bods-Inc/bods-functional-tests.git
git submodule update --init --remote utils
git submodule update --init --remote <specific_path_to_submodule>
```

- Remove all .git folder as example below for Windows & Powershell
```
Remove-Item -Path (".\.git\", ".\utils\.git", ".\<specific_path_to_submodule>\.git") -Recurse -Force
```

- Check the package.json and put all custom dependencies into "bundledDependencies"
- Move all devDependecies into dependencies
- Remove file package-lock.json
- Run following commands
```
npm cache clean --force
npm install
npm pack
```

- Zip bods-test-flow.tgz to bods-test-flow.zip

### AWS Farm Devices Workflow
- Upload mobile app
- Upload bods-test-flow.zip
- Update test spec (yml file)
- Schedule the test
- Run

## Working with Allure
- Remove all current Allure reports and caches
```
Remove-Item -Path (".\allure-report\", ".\allure-results\") -Recurse -Force
```
- Generate again the Allure report
```
npx allure generate allure-results --clean
```
- Run Allure
```
npx allure open
```

## Run build on Jenkins
- To run full test for all project
```
tests run
```
- To run full test for one project
```
tests run --exec-run-client=dentsu-digital --exec-run-project=chugai
```
- To run a specific test of one project
```
tests run --exec-run-client=dentsu-digital --exec-run-project=chugai --exec-run-testname=spec_file_name
```
- To run different wdio config file
```
tests run --exec-run-config=wdio.conf.js
```
- To deactivate one test
```
tests deactivate --exec-dis-testname=spec_file_name
```
- To activate one test
```
tests activate --exec-dis-testname=spec_file_name
```
- To change one test to manual
```
tests manual --exec-dis-testname=spec_file_name
```
- To change one test to support
```
tests support --exec-dis-testname=spec_file_name
```
- To generate report
```
tests report
```
- To override the screenshot
```
screenshot override --scr-testname=spec_file_name
```

## To clone the source and deploy on client environment
- Clone core
```
git clone https://github.com/Bods-Inc/bods-functional-tests.git
git submodule update --init --remote utils
```
- Clone project
```
git submodule update --init --remote <specific_path_to_submodule>
```
Note: replace <specific_path_to_submodule> by the project path (e.g. _test/specs/dentsu-digital/chugai_)
- Remove all .git folders
```
Remove-Item -Path (".\.git\", "<specific_path_to_submodule>/.git") -Recurse -Force
```
Note: replace <specific_path_to_submodule> by the project path (e.g. _test/specs/dentsu-digital/chugai_)
- Encrypt libs
```
npx javascript-obfuscator .\utils\utils.js --output .\utils\utils.js
npx javascript-obfuscator .\utils\common.js --output .\utils\common.js
npx javascript-obfuscator .\utils\lib\allure.js --output .\utils\lib\allure.js
npx javascript-obfuscator .\utils\lib\cap_handler.js --output .\utils\lib\cap_handler.js
npx javascript-obfuscator .\utils\lib\data_handler.js --output .\utils\lib\data_handler.js
npx javascript-obfuscator .\utils\lib\hook.js --output .\utils\lib\hook.js
npx javascript-obfuscator .\utils\lib\jira.js --output .\utils\lib\jira.js
```
- Remove unneccessary files
```
Remove-Item -Path (".\utils\sync_files.xlsm", ".\utils\.gitignore", ".\utils\capabilities_template.json", ".\utils\data_template.xlsx", ".\utils\test-cases_template.xlsx", ".\utils\test-cases.json", ".\utils\.git", ".\utils\tc2json.js") -Recurse -Force
Remove-Item -Path (".\.dockerignore", ".\.gitmodules", ".\aws-android.yml", ".\aws-ios.yml", ".\aws.farm.auto.mobile.heydj.sh", ".\JenkinsFile", ".\README.md", ".\selenium.appium.local.osx.install.yml", ".\wdio-bs.conf.js", ".\clone.bat") -Recurse -Force
```
- Remmove the projects in data.json