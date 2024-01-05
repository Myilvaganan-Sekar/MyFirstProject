const dataHandler = require("./data_handler");
const utils = require("./../utils");
const common = require("./../common");

class hookCustom {
  constructor() {
    this.mobile_compare_config = {
      imageNameFormat: "{tag}",
      screenshotPath: `.tmp/`,
      savePerDevice: true,
      autoSaveBaseline: true,
      blockOutStatusBar: true,
      blockOutIphoneHomeBar: true,
      blockOutNavigationBar: true,
      // baselineFolder: this.getMobileBaselineFolder(),
    };
    this.web_compare_config = {
      formatImageName: "{tag}",
      screenshotPath: `.tmp/`,
      savePerInstance: true,
      autoSaveBaseline: true,
      blockOutStatusBar: true,
      blockOutToolBar: true,
      disableCSSAnimation: true,
      // NOTE: When you are testing a hybrid app please use this setting
      isHybridApp: false,
    };
    this.allure_config = {
      outputDir: "allure-results",
      disableWebdriverStepsReporting: true,
      disableWebdriverScreenshotsReporting: true,
      addConsoleLogs: true,
      issueLinkTemplate: "https://jira.sutrix.com/browse/{}",
      disableMochaHooks: true,
    };
  }

  /**
   * Get mobile comparison config
   * @returns {String}
   */
  getMobileCompareConfig() {
    return this.mobile_compare_config;
  }

  /**
   * Generate config for mobile image comparison
   * @param {Array} specs list of all spec files
   * @param {Object} args config will be merged into main config
   */
  async generateMobileCompareConfig(specs, args) {
    if (specs.length > 0) {
      const specFilePath = specs[0];
      if (common.isNormalSpec(specFilePath)) {
        const info = await dataHandler.getInfoFromFilePath(specFilePath);
        const baselineFolder = `./test/specs/${info.clientId}/${info.projectId}/baseline`;
        let compareConfig = this.getMobileCompareConfig();

        compareConfig.baselineFolder = baselineFolder;
        args.services = [["native-app-compare", compareConfig]];
      }
    }
  }

  /**
   * Get web comparison config
   * @returns {String}
   */
  getWebCompareConfig() {
    return this.web_compare_config;
  }

  /**
   * Get allure config
   * @returns {String}
   */
  getAllureConfig() {
    return this.allure_config;
  }

  /**
   * Get all suites from all projects and merged to config
   * @returns {JSON}
   */
  getSuites() {
    // 1. SEARCH ALL suites.json
    const allSuites = dataHandler.searchAllSuites();

    // 2. READ EACH JSON AND MERGE INTO ONE
    let suites = {};
    for (let i = 0; i < allSuites.length; i++) {
      const suiteJson = dataHandler.readFileJSONSync(allSuites[i], "utf8");
      suites = Object.assign({}, suites, suiteJson);
    }

    // 3. RETURN MERGED SUITES
    return suites;
  }

  /**
   * Auto fix spec code if it's not correct or latest version
   * @param {Array} specs List of running spec file paths
   */
  async autoFixCode(specs) {
    for (let i = 0; i < specs.length; i++) {
      const specFilePath = specs[i];

      if (common.isNormalSpec(specFilePath)) {
        // GET PROJECT DATA
        const info = await dataHandler.getInfoFromFilePath(specFilePath);
        const excelData = await dataHandler.getProjectDataExcel(
          info.clientId,
          info.projectId
        );
        const jsonData = await dataHandler.getGlobalDataJson();
        const newVersion = jsonData.version;

        // READ FILE
        let contents = await dataHandler.readFile(specFilePath, "utf8");
        contents = String(contents);

        // CHECK CAPTURE OPTS
        await this.checkCaptureOpts(info, contents);

        // SKIP IF LATEST VERSION
        if (contents.includes(`image comparison ${newVersion}`)) {
          // CHECK & UPDATE STATUS
          await this.checkStatus(info, specFilePath, contents);

          continue;
        }

        // GET COMMON INFO
        let clientName = excelData["config"][0]["client"];
        let prjName = excelData["config"][0]["project"];
        if (clientName == "") clientName = info.clientId;
        if (prjName == "") prjName = info.projectId;

        // ADD ASYNC BEFORE FUNCTION
        contents = this.addAsync2Func(contents);

        // UPDATE SPEC TITLE
        contents = this.updateSpecTitle(contents, prjName, info.captureType);

        // UPDATE CASE TITLE
        contents = this.updateCaseTitle(contents, info.caseId);

        // CONVERT COMMANDS
        contents = this.updateCommand(contents);

        // GENERATE CORE FRAMEWORK
        contents = await this.addCoreFramework(
          contents,
          clientName,
          prjName,
          info,
          jsonData
        );

        // WRITE CONTENTS BACK TO FILE
        if (contents != "") {
          // MAKE UP CODE
          contents = utils.codeMakeUp(contents);

          // CHECK & UPDATE STATUS
          contents = await this.checkStatus(
            info,
            specFilePath,
            contents,
            false
          );

          await dataHandler.writeSpec(specFilePath, contents);
        }
      }
    }
  }

  /**
   * Auto update spec script based on new change
   * @param {Array} specs list of all running spec files
   * @param {String} pattern filter pattern
   * @param {Int} from start index
   * @param {Int} to end index
   */
  async autoBatchFixCode(specs, pattern = "", from = 0, to = 0) {
    if (specs.length > 0) {
      const specFilePath = specs[0];

      if (common.isNormalSpec(specFilePath)) {
        // SEARCH JS FILES
        const allSpecs = await dataHandler.searchAllSpecs(pattern);

        // GET GLOBAL DATA JSON
        const jsonData = await dataHandler.getGlobalDataJson();
        const newVersion = jsonData.version;

        if (to == 0) to = allSpecs.length;
        for (let i = from; i < to; i++) {
          const file = allSpecs[i];

          if (common.isNormalSpec(file)) {
            // GET PROJECT DATA
            const info = await dataHandler.getInfoFromFilePath(file);
            const excelData = await dataHandler.getProjectDataExcel(
              info.clientId,
              info.projectId
            );

            // GET COMMON INFO
            let clientName = excelData["config"][0]["client"];
            let prjName = excelData["config"][0]["project"];
            if (clientName == "") clientName = info.clientId;
            if (prjName == "") prjName = info.projectId;

            // READ FILE
            let contents = await dataHandler.readFile(file, "utf8");
            contents = String(contents);

            // SKIP IF LATEST VERSION
            if (contents.includes(`image comparison ${newVersion}`)) continue;

            // LOG FILE PATH OUT
            console.log(file);

            // ADD CORE FRAMEWORK
            contents = await this.addCoreFramework(
              contents,
              clientName,
              prjName,
              info,
              jsonData
            );

            // WRITE CONTENTS BACK TO FILE
            if (contents != "") {
              // MAKE UP CODE
              contents = utils.codeMakeUp(contents);

              await dataHandler.writeSpec(file, contents);
            }
          }
        }
      }
    }
  }

  /**
   * Convert unsupported commands exported from recorder tool to usable script in wdio
   * @param {String} lineOfCode line of code
   * @returns {String}
   */
  convertCommand(lineOfCode) {
    // WARNING: unsupported command runScript. Object= {"command":"runScript","target":"document.querySelector(\"#main > section.certified-partner > div > div > div.col-md-8.col-lg-7 > div.content\").scrollIntoView()","value":""}
    // WARNING: unsupported command deleteCookie. Object= {"command":"deleteCookie","target":"","value":""}
    // WARNING: unsupported command deleteAllVisibleCookies. Object= {"command":"deleteAllVisibleCookies","target":"","value":""}
    var objCommand = JSON.parse(
      lineOfCode
        .substring(lineOfCode.indexOf("="), lineOfCode.length)
        .replace("= ", "")
        .replace(`\r`, "")
    );

    if (typeof objCommand.command != "undefined") {
      switch (objCommand.command) {
        case "runScript":
          return `\t\tawait browser.execute(\`${objCommand.target}\`);\r`;
        case "deleteCookie":
          return `\t\tawait browser.deleteCookies(["${objCommand.target}"]);\r`;
        case "deleteAllVisibleCookies":
          return `\t\tawait browser.deleteCookies();\r`;
        case "":
          return "";
        default:
          return lineOfCode;
      }
    } else {
      return lineOfCode;
    }
  }

  /**
   * Generate code block for image comparison
   * @param {Object} info spec information
   * @param {String} version latest version of code
   * @returns {String}
   */
  async insertImageComparisonCode(info, version) {
    const codeBlocks = await this.hookGeneration(info, "img_comparison");
    let clsCodeBlock = ``;
    let functCodeBlock = ``;

    // GENERATE CLASS CODE LINE
    for (let i = 0; i < codeBlocks.cls.length; i++) {
      clsCodeBlock += codeBlocks.cls[i];
    }
    // GENERATE FUNCTION CODE LINE
    for (let i = 0; i < codeBlocks.funct.length; i++) {
      functCodeBlock += codeBlocks.funct[i];
    }

    let contents = `\r
    // ======= IMG_COMP : START =======
    /*
      * This is CORE function to do the image comparison.
      * This script is added automatically every time there is a new version released.
      * You can open the custom scripts for capture options to apply only for current spec.
      * Note: don't modify or remove any script here.
    */
    // ================================
    it("image comparison ${version} :: ${info.caseId}", async function () {
      ${clsCodeBlock}
      
      ${functCodeBlock}
    });
    // ==============================
    // ======= IMG_COMP : END =======\r`;

    return contents;
  }

  /**
   * Generate before hook code block
   * @param {Object} info spec information
   * @returns {String}
   */
  async insertBeforeHookSpec(info) {
    const codeBlocks = await this.hookGeneration(info, "before");
    let clsCodeBlock = ``;
    let functCodeBlock = ``;
    let count = 0;
    let beforeBlock = ``;

    // GENERATE CLASS CODE LINE
    for (let i = 0; i < codeBlocks.cls.length; i++) {
      clsCodeBlock += codeBlocks.cls[i];
    }
    // GENERATE FUNCTION CODE LINE
    for (let i = 0; i < codeBlocks.funct.length; i++) {
      functCodeBlock += codeBlocks.funct[i];
      count++;
    }

    if (count > 0) {
      beforeBlock = `before(async function () {
        ${clsCodeBlock}
        
        ${functCodeBlock}
      });`;
    } else {
      beforeBlock = `// before(async function () {});`;
    }

    let contents = `\r
    // ======= BEFORE_HOOK : START =======
    /*
      * This is CORE function to be performed ONCE before the 1st test in current spec.
      * This script is added automatically every time there is a new version released.
      * Note: don't modify or remove any script here.
    */
    // ===================================
    ${beforeBlock}
    // =================================
    // ======= BEFORE_HOOK : END =======\r`;

    return contents;
  }

  /**
   * Generate after each hook code block
   * {Object} info spec information
   * @returns {String}
   */
  async insertAfterEachHookSpec(info) {
    const codeBlocks = await this.hookGeneration(info, "after_each");
    let clsCodeBlock = ``;
    let functCodeBlock = ``;
    let count = 0;
    let afterEachBlock = ``;

    // GENERATE CLASS CODE LINE
    for (let i = 0; i < codeBlocks.cls.length; i++) {
      clsCodeBlock += codeBlocks.cls[i];
    }
    // GENERATE FUNCTION CODE LINE
    for (let i = 0; i < codeBlocks.funct.length; i++) {
      functCodeBlock += codeBlocks.funct[i];
      count++;
    }

    if (count > 0) {
      afterEachBlock = `afterEach(async function () {
        ${clsCodeBlock}
        
        ${functCodeBlock}
      });`;
    } else {
      afterEachBlock = `// afterEach(async function () {});`;
    }

    let contents = `\r
    // ======= AFTER_EACH_HOOK : START =======
    /*
      * This is CORE function to be performed after EACH test in current spec.
      * This script is added automatically every time there is a new version released.
      * Note: don't modify or remove any script here.
    */
    // =======================================
    // runs after each test in this block
    ${afterEachBlock}
    // =====================================
    // ======= AFTER_EACH_HOOK : END =======\r`;

    return contents;
  }

  /**
   * Initialize a new project
   * @param {Array} specs list of running spec file paths
   */
  async initProject(specs) {
    for (let i = 0; i < specs.length; i++) {
      const specFilePath = specs[i];

      if (specFilePath.includes(`init.js`)) {
        let jsonData = await dataHandler.getGlobalDataJson();
        const projects = jsonData.projects;

        for (var clientId in projects) {
          for (var projectId in projects[clientId]) {
            if (
              typeof projects[clientId][projectId]["init"] == "undefined" ||
              projects[clientId][projectId]["init"] != "done"
            ) {
              let basePath =
                process.cwd() + `/test/specs/${clientId}/${projectId}`;
              let dataPath = basePath + `/data`;
              let fullpagePath = basePath + `/record/fullpage`;
              let screenPath = basePath + `/record/screen`;
              let mobilePath = basePath + `/record/mobile`;

              // CREATE FOLDERS
              dataHandler.createFolder(dataPath);
              dataHandler.createFolder(fullpagePath);
              dataHandler.createFolder(screenPath);
              dataHandler.createFolder(mobilePath);

              // COPY data.xlsx
              const excelPath = `${dataPath}/data.xlsx`;
              const dataExisting = await dataHandler.fileExists(excelPath);
              if (!dataExisting) {
                dataHandler.copyFile("./utils/data_template.xlsx", excelPath);
              }

              // COPY capabilities_template.json
              const capsPath = `${dataPath}/capabilities.json`;
              const capsExisting = await dataHandler.fileExists(capsPath);
              if (!capsExisting) {
                dataHandler.copyFile(
                  "./utils/capabilities_template.json",
                  capsPath
                );
              }

              // COPY test-cases.xlsx
              const tcPath = `${dataPath}/test-cases.xlsx`;
              const tcExisting = await dataHandler.fileExists(tcPath);
              if (!tcExisting) {
                dataHandler.copyFile(
                  "./utils/test-cases_template.xlsx",
                  tcPath
                );
              }

              // COPY test-cases.json
              const tcJsonPath = `${dataPath}/test-cases.json`;
              const tcJsonExisting = await dataHandler.fileExists(tcJsonPath);
              if (!tcJsonExisting) {
                dataHandler.copyFile("./utils/test-cases.json", tcJsonPath);
              }

              // COPY tc2json.js
              const tc2jsonPath = `${dataPath}/tc2json.js`;
              const tc2jsonExisting = await dataHandler.fileExists(tc2jsonPath);
              if (!tc2jsonExisting) {
                dataHandler.copyFile("./utils/tc2json.js", tc2jsonPath);
              }

              // DELETE ALL readme.txt - USED FOR REGENERATION
              const fullpageReadmePath = `${fullpagePath}/readme.txt`;
              const screenReadmePath = `${screenPath}/readme.txt`;
              const mobileReadmePath = `${mobilePath}/readme.txt`;
              await dataHandler.deleteFile(fullpageReadmePath);
              await dataHandler.deleteFile(screenReadmePath);
              await dataHandler.deleteFile(mobileReadmePath);

              // CREATE readme.txt
              dataHandler.createFile(
                fullpageReadmePath,
                `Put the records into the corresponding folder:
  - fullpage: the baseline and actual are captured with full web page from top to bottom.
  - screen: the baseline and actual are captures with the screen of current position.
  - mobile: used for mobile image comparison.
  - Record file name must be unique and following this format: [project_id].[user_story_id]-[case_id]_[localization].js
      Example: ${projectId}.001-C001_en.js
                
How to use ${projectId}.spec-generation.js?
  - Change the config "spec_generation" in data/data.xlsx to "yes" if you want to enable it.
  - Update the list of pages in data/data.xlsx before generating with:
    - page_id: is unique id
    - domain: website domain
    - handler: path to page
    - status: active, deactive, support or manual
    - flow: the id to match to your flow in ${projectId}.spec-generation.js
  - Each spec is generated based on the flows with structure below. Depending on your purpose, you can define flexible custom preStep and addStep for each spec.
    preStep
    await browser.url(link);
    addStep
  - Keep the flow id to be "0" if you want to apply for all pages.
  - Remove spec-generation out of excluded spec in wdio.config`
              );
              dataHandler.copyFile(fullpageReadmePath, screenReadmePath);
              dataHandler.copyFile(fullpageReadmePath, mobileReadmePath);

              // CREATE SPEC GENERATION
              const specGenerationPath = `${fullpagePath}/${projectId}.spec-generation.js`;
              const specGenerationExisting = await dataHandler.fileExists(
                specGenerationPath
              );
              if (!specGenerationExisting) {
                let generationContent = `describe("spec-generation", async function () {
                  it("generate spec files", async function () {
                    const flows = [
                      {
                        id: "0",
                        preStep: "",
                        addStep: "",
                      },
                    ];

                    const utils = require(process.cwd() + "/utils/utils");
                    await utils.specGeneration(this.test.file, flows, -1, false);
                  });
                });`;
                generationContent = utils.codeMakeUp(generationContent);
                dataHandler.createFile(specGenerationPath, generationContent);
              }

              // CREATE .gitignore
              const gitIgnorePath = `${basePath}/.gitignore`;
              const gitIgnoreExisting = await dataHandler.fileExists(
                gitIgnorePath
              );
              if (!gitIgnoreExisting) {
                dataHandler.createFile(gitIgnorePath, `data/~$*`);
              }

              // UPDATE data.json
              jsonData.projects[clientId][projectId]["init"] = "done";
              await dataHandler.updateDataJsonFile(jsonData);
            }
          }
        }
      }
    }
  }

  /**
   * Convert test cases excel to json
   * @param {String} specs list of all spec file paths
   */
  async tc2json(specs) {
    for (let i = 0; i < specs.length; i++) {
      const specFilePath = specs[i];
      if (specFilePath.includes(`tc2json.js`)) {
        // READ EXCEL DATA
        const info = await dataHandler.getInfoFromFilePath(specFilePath);
        const tcPath = `test/specs/${info.clientId}/${info.projectId}/data/test-cases.xlsx`;
        const excelData = await dataHandler.getProjectDataExcel(
          info.clientId,
          info.projectId,
          tcPath
        );

        // CREATE JSON
        let json = { data: [] };
        let testCase = { test_data: {}, steps: [] };
        for (let i = 0; i < excelData["test_cases"].length; i++) {
          const row = excelData["test_cases"][i];
          const caseId = row["case_id"];
          const userType = row["user_type"];
          const feature = row["feature"];
          const caseName = row["case"];
          const localization = row["localization"];
          const desc = row["description"];
          const testData = row["test_data"];
          const steps = row["steps"];

          // GET CASE INFO
          if (!common.emptyOrUndefined(caseId)) {
            testCase["case_id"] = caseId;
          }
          if (!common.emptyOrUndefined(userType)) {
            testCase["user_type"] = userType;
          }
          if (!common.emptyOrUndefined(feature)) {
            testCase["feature"] = feature;
          }
          if (!common.emptyOrUndefined(caseName)) {
            testCase["case"] = caseName;
          }
          if (!common.emptyOrUndefined(localization)) {
            testCase["localization"] = localization;
          }
          if (!common.emptyOrUndefined(desc)) {
            testCase["description"] = desc;
          }

          // GET TEST DATA
          if (!common.emptyOrUndefined(testData)) {
            const key = testData.split(":")[0].trim();
            const value = testData.split(":")[1].trim();
            testCase["test_data"][key] = value;
          }

          // GET STEPS
          if (!common.emptyOrUndefined(steps)) {
            if (steps.toLowerCase() != "[end]") {
              testCase["steps"].push(steps);
            } else {
              // PUSH TO JSON
              json.data.push(testCase);

              // RESET
              testCase = { test_data: {}, steps: [] };
            }
          }
        }

        // SAVE JSON TO test-cases.json
        const jsonPath = `test/specs/${info.clientId}/${info.projectId}/data/test-cases.json`;
        await dataHandler.updateDataJsonFile(json, jsonPath);
      }
    }
  }

  /**
   * Add core funtions into every spec
   * @param {String} contents spec file script
   * @param {String} clientName client name
   * @param {String} prjName project name
   * @param {Object} info spec information
   * @param {Object} jsonData global json data
   * @returns {String}
   */
  async addCoreFramework(contents, clientName, prjName, info, jsonData) {
    // REMOVE OLD COMMENTS
    const oldComment = `// BYPASS PAGE AUTH --- DON'T REMOVE THIS COMMENT`;
    if (contents.includes(oldComment)) {
      contents = contents.replaceAll(oldComment, "");
    }

    // REMOVE BEFORE HOOK CODE BLOCK
    const beforeHookStart = `// ======= BEFORE_HOOK : START =======`;
    const beforeHookEnd = `// ======= BEFORE_HOOK : END =======`;
    if (contents.includes(beforeHookStart)) {
      // FROM v.1.0.7
      const startIndex = contents.indexOf(beforeHookStart);
      const endIndex = contents.indexOf(beforeHookEnd);
      const codeBlock = contents.substring(
        startIndex,
        endIndex + beforeHookEnd.length
      );
      contents = contents.replace(codeBlock, "");
    } else {
      // BEFORE v1.0.7
      const startIndex = contents.indexOf(`before(async function`);
      const codeBlock = this.getFullCodeBlock(startIndex, contents);

      contents = contents.replace(codeBlock, "");
    }

    // REMOVE AFTER EACH HOOK CODE BLOCK
    const afterEachHookStart = `// ======= AFTER_EACH_HOOK : START =======`;
    const afterEachHookEnd = `// ======= AFTER_EACH_HOOK : END =======`;
    if (contents.includes(afterEachHookStart)) {
      // FROM v.1.0.7
      const startIndex = contents.indexOf(afterEachHookStart);
      const endIndex = contents.indexOf(afterEachHookEnd);
      const codeBlock = contents.substring(
        startIndex,
        endIndex + afterEachHookEnd.length
      );
      contents = contents.replace(codeBlock, "");
    }

    // REMOVE IMG COMP CODE BLOCK
    const imgStart = `// ======= IMG_COMP : START =======`;
    const imgEnd = `// ======= IMG_COMP : END =======`;
    if (contents.includes(imgStart)) {
      // FROM v.1.0.7
      const startIndex = contents.indexOf(imgStart);
      const endIndex = contents.indexOf(imgEnd);
      const codeBlock = contents.substring(
        startIndex,
        endIndex + imgEnd.length
      );
      contents = contents.replace(codeBlock, "");
    } else {
      // BEFORE v1.0.7
      const startIndex = contents.indexOf(`it("image comparison`);
      const codeBlock = this.getFullCodeBlock(startIndex, contents);

      contents = contents.replace(codeBlock, "");
    }

    // GENERATE CORE FRAMEWORK
    // 1. MAKE UP CODE
    contents = utils.codeMakeUp(contents);

    // 2. IDENTIFY THE POSITION TO ADD CODE BLOCKS
    const capType = common.capitalize(info.captureType);
    let specTitleCode = `describe("${prjName} :: ${capType}", async function() {`;
    let specTitleIndex = contents.indexOf(specTitleCode);

    // 3. REVISE IF FACING WRONG FORMAT CODE
    if (specTitleIndex < 0) {
      specTitleCode = `describe("${prjName} :: ${capType}", async function () {`;
      specTitleIndex = contents.indexOf(specTitleCode);
    }

    // 4. ADD AFTER EACH HOOK CODE BLOCK
    if (specTitleIndex >= 0) {
      const afterEachHookCodeBlock = await this.insertAfterEachHookSpec(info);
      contents = contents.replace(
        specTitleCode,
        specTitleCode + afterEachHookCodeBlock
      );
    }

    // 5. ADD BEFORE HOOK CODE BLOCK
    if (specTitleIndex >= 0) {
      const beforeHookCodeBlock = await this.insertBeforeHookSpec(info);
      contents = contents.replace(
        specTitleCode,
        specTitleCode + beforeHookCodeBlock
      );
    }

    // 6. ADD IMAGE COMPARISON CODE BLOCK
    var count = utils.getIndicesOf("});", contents.slice(-12)).length;
    if (count == 2) {
      var lastLineIndex = contents.lastIndexOf("});");
      contents = contents.substring(0, lastLineIndex);
    }
    contents += await this.insertImageComparisonCode(info, jsonData.version);
    contents += `\r});`;

    // 7. MAKE UP CODE
    contents = utils.codeMakeUp(contents);

    // 8. RETURN
    return contents;
  }

  /**
   * Search the code block by go until found end of block
   * @param {Int} index start index
   * @param {String} text string is used for searching
   * @returns {String}
   */
  getCodeBlock(index, text, end = "});") {
    let condition = true;
    let next = index + 1;
    let tmpString = "";

    while (condition) {
      tmpString = text.substring(index, next);
      if (
        tmpString.includes(end) ||
        tmpString == "" ||
        tmpString.length >= text.length
      ) {
        condition = false;
      }
      next++;
    }

    return tmpString;
  }

  /**
   * Same as getCodeBlock but ensure the full function is returned
   * @param {Int} index start index
   * @param {String} text contents to be searched for
   * @param {String} end end signal
   * @returns {String}
   */
  getFullCodeBlock(index, text, end = "});") {
    let condition = true;
    let next = index + 1;
    let tmpString = "";
    let openBracket = 0;
    let closeBracket = 0;

    while (condition) {
      // GO TO EACH CHARACTER
      tmpString = text.substring(index, next);

      // IF LAST CHARACTER IS "{"
      if (tmpString.slice(-1) == "{") openBracket++;
      // IF LAST CHARACTER IS "}"
      if (tmpString.slice(-1) == "}") closeBracket++;

      // STOP FINDING
      if (
        tmpString.length >= text.length ||
        ((tmpString.slice(-3).includes(end) || tmpString == "") &&
          openBracket == closeBracket)
      ) {
        condition = false;
      }
      next++;
    }

    return tmpString;
  }

  /**
   * Add async before function if not existing
   * @param {String} contents file contents
   * @returns {String}
   */
  addAsync2Func(contents) {
    let indexes = utils.getIndicesOf(`function`, contents, false);
    const funcText = `function`;
    const asyncText = `async`;
    for (let i = indexes.length - 1; i >= 0; i--) {
      const text = contents.substring(
        indexes[i],
        indexes[i] - asyncText.length - 1
      );
      if (!text.trim().includes(asyncText)) {
        contents =
          contents.slice(0, indexes[i]) +
          asyncText +
          " " +
          contents.slice(indexes[i]);
      }
    }

    return contents;
  }

  /**
   * Fix and update the title of spec
   * @param {String} contents spec file script
   * @param {String} clientName client name
   * @param {String} prjName project name
   * @returns {String}
   */
  updateSpecTitle(contents, prjName, captureType) {
    let indexes = utils.getIndicesOf(`describe(`, contents, false);
    for (let i = indexes.length - 1; i >= 0; i--) {
      let text = this.getCodeBlock(indexes[i], contents, ",");
      contents = contents.replace(
        text,
        `describe("${prjName} :: ${common.capitalize(captureType)}", `
      );
    }

    return contents;
  }

  /**
   * Fix and update test case title
   * @param {String} contents spec file script
   * @param {String} caseId test case id
   * @returns {String}
   */
  updateCaseTitle(contents, caseId) {
    let indexes = utils.getIndicesOf(`it(`, contents, false);
    for (let i = indexes.length - 1; i >= 0; i--) {
      let text = this.getCodeBlock(indexes[i], contents, ",");
      if (!text.includes(`image comparison`))
        contents = contents.replace(text, `it("recorder :: ${caseId}", `);
    }

    return contents;
  }

  /**
   * Check and convert unsupport commands into WDIO commands
   * @param {String} contents spec file script
   * @returns {String}
   */
  updateCommand(contents) {
    let indexes = utils.getIndicesOf(
      `// WARNING: unsupported command`,
      contents,
      false
    );
    for (let i = indexes.length - 1; i >= 0; i--) {
      let text = this.getCodeBlock(indexes[i], contents, "}");
      let newText = this.convertCommand(text);
      contents = contents.replace(text, newText);
    }

    return contents;
  }

  /**
   * Generate hook functions for each spec
   * @param {Object} info spec information
   * @param {String} hookType type of Hook defined in excel data
   * @returns {String}
   */
  async hookGeneration(info, hookType) {
    const clientId = info.clientId;
    const projectId = info.projectId;
    const specId = info.specId;
    const excelData = await dataHandler.getProjectDataExcel(
      clientId,
      projectId
    );
    const jsonData = await dataHandler.getGlobalDataJson();
    const cptOptData = jsonData.projects[clientId][projectId]["cpt_opt"];
    let codeBlocks = { cls: [], funct: [] };

    for (let i = 0; i < excelData["hook"].length; i++) {
      const row = excelData["hook"][i];
      const type = row["type"];
      const cls = row["class"];
      const funct = row["function"];
      const status = row["status"];
      let script = ``;

      if (hookType == type) {
        // IMPORT CLASS
        switch (cls) {
          case "utils":
            codeBlocks.cls.push(
              `const utils = require(process.cwd() + "/utils/utils");\r`
            );
            break;
          case "hook":
            codeBlocks.cls.push(
              `const utils = require(process.cwd() + "/utils/lib/hook");\r`
            );
            break;
          case "allure":
            codeBlocks.cls.push(
              `const utils = require(process.cwd() + "/utils/lib/allure");\r`
            );
            break;
          case "data_handler":
            codeBlocks.cls.push(
              `const utils = require(process.cwd() + "/utils/lib/data_handler");\r`
            );
            break;
          case "jira":
            codeBlocks.cls.push(
              `const utils = require(process.cwd() + "/utils/lib/jira");\r`
            );
            break;
        }

        // IMPORT FUNCTION
        switch (funct) {
          case "pageAuth":
            script = `await utils.pageAuth("${clientId}", "${projectId}");\r`;
            if (status == "inactive") {
              script = `// await utils.pageAuth("${clientId}", "${projectId}");\r`;
            }
            codeBlocks.funct.push(`// CORE (${status}) :: BYPASS PAGE AUTH
            ${script}
            `);
            break;
          case "checkValidCaps":
            script = `let valid = await utils.checkValidCaps();
            if (!valid) await this.skip();
            `;
            if (status == "inactive") {
              script = `// let valid = await utils.checkValidCaps();
              // if (!valid) await this.skip();
              `;
            }
            codeBlocks.funct
              .push(`// CORE (${status}) :: SKIP SPEC IF WRONG CAPABILITY
            ${script}
            `);
            break;
          case "imgCompare":
            script = `await utils.imgCompare("${projectId}", "${specId}");`;
            if (status == "inactive") {
              script = `// await utils.imgCompare("${projectId}", "${specId}");`;
            }
            codeBlocks.funct.push(`\r
            // CORE (${status}) :: IMG COMPARISON STEP
            ${script}
            `);
            break;
          case "addCaptureOpts":
            const captureOpts = await dataHandler.getCaptureOpts(
              clientId,
              projectId
            );
            let platform = "web";
            if (info.captureType == "mobile") platform = info.captureType;

            script = `
            /**
             * Custom capture opts. Uncomment and change the value to use it.
             * The global config is set in data.xlsx and is applied by default for all specs.
             * Note: these config may be replaced if there is new version of Utils lib released.
             */\r\r`;
            for (var key in captureOpts[platform]) {
              let value = captureOpts[platform][key];
              if (key != "baselineFolder") {
                // CHECK JSON DATA
                if (typeof cptOptData != "undefined" && cptOptData.length > 0) {
                  for (let i = 0; i < cptOptData.length; i++) {
                    if (cptOptData[i]["id"] == specId) {
                      for (let j = 0; j < cptOptData[i].values.length; j++) {
                        const o = cptOptData[i].values[j];
                        if (o.key == key) {
                          const enabled = !o.enabled ? "// " : "";
                          script += `\t${enabled}await utils.addCaptureOpts("${specId}", "${key}", ${o.arg.value}, "${o.arg.type}");\r`;
                          break;
                        }
                      }
                      break;
                    }
                  }
                }

                // CHECK GLOBAL STATUS
                const searchText = `await utils.addCaptureOpts("${specId}", "${key}",`;
                if (!script.includes(searchText)) {
                  if (status == "inactive") {
                    script += `\t// await utils.addCaptureOpts("${specId}", "${key}", ${value}, "${platform}");\r`;
                  } else {
                    script += `\tawait utils.addCaptureOpts("${specId}", "${key}", ${value}, "${platform}");\r`;
                  }
                }
              }
            }
            codeBlocks.funct.push(script);
            break;
          case "checkFireWall":
            script = `await utils.checkFireWall("${specId}");`;
            if (status == "inactive") {
              script = `// await utils.checkFireWall("${specId}");`;
            }
            codeBlocks.funct.push(`\r
              // CORE (${status}) :: CHECK FIREWALL
              ${script}
            `);
            break;
          case "localize":
            script = `global.localization = await utils.getLocalization("${specId}");`;
            if (status == "inactive") {
              script = `// ` + script;
            }
            codeBlocks.funct
              .push(`\r// CORE (${status}) :: GET LOCALIZATION FROM SPEC ID
              ${script}
              `);
            break;
          case "dynamicBaseUrl":
            script = `global.dynamicBaseUrl = await utils.getDynamicUrl("${specId}");`;
            if (status == "inactive") {
              script = `// ` + script;
            }
            codeBlocks.funct.push(`\r// CORE (${status}) :: GET DYNAMIC BASE URL
              ${script}
              `);
            break;
        }
      }
    }

    return {
      cls: Array.from(new Set(codeBlocks.cls)),
      funct: Array.from(new Set(codeBlocks.funct)),
    };
  }

  /**
   * Check spec status and update spec file
   * @param {Object} info spec information
   * @param {String} specFilePath spec file path
   * @param {String} contents spec file contents
   * @param {Boolean} write write file or return contents
   * @returns {String}
   */
  async checkStatus(info, specFilePath, contents, write = true) {
    // status: "active | manual | deactivate | support"

    const caseId = info.caseId;
    let changed = false;
    const skipComment = `/* ======= SKIPPED =======`;
    const startIndex = contents.indexOf(`it("recorder :: ${caseId}",`);
    const codeBlock = this.getFullCodeBlock(startIndex, contents);
    let newCodeBlock = codeBlock;
    const blockStartIndex = newCodeBlock.indexOf(`it("recorder :: ${caseId}",`);
    const firstCodeLine = this.getCodeBlock(blockStartIndex, newCodeBlock, "{");

    if (info.status != "active" && !codeBlock.includes(skipComment)) {
      // 1. ADD SKIPPED OPEN
      newCodeBlock = newCodeBlock.replace(
        firstCodeLine,
        firstCodeLine + `\r${skipComment}`
      );

      // 2. ADD SKIPPED CLOSE
      const count = utils.getIndicesOf("});", codeBlock.slice(-5)).length;
      if (count == 1) {
        const lastLineIndex = newCodeBlock.lastIndexOf("});");
        newCodeBlock = newCodeBlock.substring(0, lastLineIndex);
        newCodeBlock += `*/\r});`;
      }

      changed = true;
    } else if (info.status == "active" && codeBlock.includes(skipComment)) {
      // REMOVE SKIPPED OPEN
      const lineWithComment = this.getCodeBlock(
        blockStartIndex,
        newCodeBlock,
        skipComment
      );
      newCodeBlock = newCodeBlock.replace(lineWithComment, firstCodeLine);

      // REMOVE SKIPPED CLOSE
      const lastLine = newCodeBlock.slice(-10);
      let newLastLine = lastLine;
      if (newLastLine.includes(`*/`)) {
        newLastLine = newLastLine
          .replace(`*/`, "")
          .replace(`\r`, "")
          .replace(`\n`, "");
        newCodeBlock = newCodeBlock.replace(lastLine, newLastLine);
      }

      changed = true;
    }

    if (changed) {
      contents = contents.replace(codeBlock, newCodeBlock);
      contents = utils.codeMakeUp(contents);
      if (write) {
        await dataHandler.writeSpec(specFilePath, contents);
      }
    }

    return contents;
  }

  /**
   * Check custom capture options code block and update Json data
   * @param {Object} info spec information
   * @param {String} contents spec contents
   */
  async checkCaptureOpts(info, contents) {
    const arrOpts = [
      "fullPageScrollTimeout",
      "ignoreTransparentPixel",
      "ignoreAntialiasing",
      "scaleImagesToSameSize",
      "largeImageThreshold",
      "disableCSSAnimation",
      "ignoreColors",
      "ignoreAlpha",
    ];
    let jsonData = await dataHandler.getGlobalDataJson();
    var data = jsonData.projects[info.clientId][info.projectId]["cpt_opt"];
    let changed = false;

    let opts = {
      id: info.specId,
      values: [],
    };

    if (typeof data == "undefined" || data.length <= 0) {
      data = [];
      data.push(opts);
    }

    for (let j = 0; j < arrOpts.length; j++) {
      let searchText = `//await utils.addCaptureOpts("${info.specId}", "${arrOpts[j]}",`;

      // TRY TO SEARCH WITH DEFAULT SEARCH TEXT
      if (!contents.includes(searchText)) {
        searchText = `// await utils.addCaptureOpts("${info.specId}", "${arrOpts[j]}",`;
      }

      // REMOVE OPT FROM JSON
      if (contents.includes(searchText)) {
        // LOOP DATA
        for (let i = 0; i < data.length; i++) {
          if (data[i]["id"] == info.specId) {
            const tmpArr = data[i].values.filter(
              (obj) => !(obj.key === arrOpts[j])
            );
            if (tmpArr.length != data[i].values.length) {
              data[i].values = tmpArr;
              changed = true;
            }
            break;
          }
        }
      }
    }

    // WRITE JSON
    if (changed) {
      jsonData.projects[info.clientId][info.projectId]["cpt_opt"] = data;
      await dataHandler.updateDataJsonFile(jsonData);
    }
  }
}
module.exports = new hookCustom();
