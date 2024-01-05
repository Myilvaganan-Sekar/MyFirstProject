@echo off

set "keepFolder=bods-us"
set "project=test/specs/bods-us/bods"
set "projectFolder=bods"

REM Clone the core framework
echo "Clone core framework..."
git clone https://github.com/Bods-Inc/bods-functional-tests.git

REM Clone libs
echo "Clone utils..."
cd sutrix-test-flow
git submodule update --init --remote utils

REM Clone project
echo "Clone project source code..."
git submodule update --init --remote %project%

REM Remove all unused folders
echo "Remove all unused folders..."
cd test/specs
for /d %%G in (*) do (
    REM Check if the current folder is not the specific folder
    if /i not "%%G"=="%keepFolder%" (
        REM Delete the current folder and all its contents
        rmdir /s /q "%%G"
    )
)
cd ..
cd ..

REM Remove all git folders
echo "Remove all git folders..."
rmdir /s /q ".\.git\"
cd test/specs/%keepFolder%/%projectFolder%
del /f /q /s /a .git
cd ..
cd ..
cd ..
cd ..
@REM dir /b /a-d /s

REM Install node modules
call npm install

REM Encrypt core libs
call npx javascript-obfuscator .\utils\utils.js --output .\utils\utils.js
call npx javascript-obfuscator .\utils\common.js --output .\utils\common.js
call npx javascript-obfuscator .\utils\lib\allure.js --output .\utils\lib\allure.js
call npx javascript-obfuscator .\utils\lib\cap_handler.js --output .\utils\lib\cap_handler.js
call npx javascript-obfuscator .\utils\lib\data_handler.js --output .\utils\lib\data_handler.js
call npx javascript-obfuscator .\utils\lib\hook.js --output .\utils\lib\hook.js
call npx javascript-obfuscator .\utils\lib\jira.js --output .\utils\lib\jira.js

REM Remove unneccessary files
@REM cd sutrix-test-flow
cd utils
del /f /q /s /a sync_files.xlsm
del /f /q /s /a .gitignore
del /f /q /s /a capabilities_template.json
del /f /q /s /a data_template.xlsx
del /f /q /s /a test-cases_template.xlsx
del /f /q /s /a test-cases.json
del /f /q /s /a .git
del /f /q /s /a tc2json.js
cd ..
del /f /q /s /a .dockerignore
del /f /q /s /a .gitmodules
del /f /q /s /a aws-android.yml
del /f /q /s /a aws-ios.yml
del /f /q /s /a aws.farm.auto.mobile.heydj.sh
del /f /q /s /a JenkinsFile
del /f /q /s /a README.md
del /f /q /s /a selenium.appium.local.osx.install.yml
del /f /q /s /a wdio-bs.conf.js
del /f /q /s /a clone.bat
rmdir /s /q ".\node_modules\"

pause
REM exit /b 0