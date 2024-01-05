const path = require("path");
const fs = require("fs");
const glob = require("glob");
const util = require("node:util");
const excelToJson = require("simple-excel-2-json");

const beautify = require("js-beautify").js;
const jimp = require("jimp");

const common = require("../common");

const WebImageComparisonService =
  require("wdio-image-comparison-service").default;
let webImageComparisonService = new WebImageComparisonService({});

class dataHandler {
  constructor() {
    this.globalJsonPath = process.cwd() + `/utils/data.json`;
  }

  /**
   * Return data from ./utls/data.json
   * @param {String} opt default is utf8
   * @param {String} errMsg Error message will be thrown if failed
   * @returns {JSON}
   */
  async getGlobalDataJson(opt = "utf8", errMsg = "Failed to read file") {
    const data = await this.readFileJSON(this.globalJsonPath, opt, errMsg);
    return data;
  }

  /**
   * Get project excel data
   * @param {String} clientId client id
   * @param {String} projectId project id
   * @param {String} dataPath Path to excel file, default is data.xlsx
   * @returns {Object}
   */
  async getProjectDataExcel(clientId, projectId, dataPath = "") {
    if (dataPath == "")
      dataPath = `test/specs/${clientId}/${projectId}/data/data.xlsx`;
    let data = {};
    try {
      if (fs.existsSync(dataPath)) {
        data = excelToJson({
          sourceFile: dataPath,
          header: {
            rows: 1,
          },
          columnToKey: {
            "*": "{{columnHeader}}",
          },
        });
      }
    } catch (err) {
      console.error(err);
    }
    return data;
  }

  /**
   * Get project capabilities from json
   * @param {String} clientId client id
   * @param {String} projectId project id
   * @returns {Object}
   */
  async getProjectCapabilities(clientId, projectId) {
    const filePath = `./test/specs/${clientId}/${projectId}/data/capabilities.json`;
    const data = await this.readFileJSON(
      filePath,
      "utf8",
      "Failed to read file"
    );
    return data;
  }

  /**
   * Get screenshots file contents
   * @param {String} specId spec id or spec file name
   * @param {String} platform platform name
   * @returns {Object}
   */
  async getScreenshots(specId, platform) {
    const info = await this.getInfoFromSpecId(specId);
    const diffFolder = webImageComparisonService.folders.diffFolder;
    const actualFolder = webImageComparisonService.folders.actualFolder;
    const baselineFolder = info.baselineFolder;
    let diffImgContent;
    let baselineImgContent;
    let actualImgContent;
    let fileName = `${specId}.png`;

    // DEFINE IMAGE PATH
    const diffFilePath = `./${diffFolder}/${platform}/${fileName}`;
    const actualFilePath = `./${actualFolder}/${platform}/${fileName}`;
    const baselineFilePath = `${baselineFolder}/${platform}/${fileName}`;

    // READ IMAGE FILE
    diffImgContent = await this.readFile(diffFilePath);
    baselineImgContent = await this.readFile(baselineFilePath);
    actualImgContent = await this.readFile(actualFilePath);

    // RETURN
    return {
      filePaths: {
        diff: diffFilePath,
        actual: actualFilePath,
        baseline: baselineFilePath,
      },
      contents: {
        diff: diffImgContent,
        actual: actualImgContent,
        baseline: baselineImgContent,
      },
    };
  }

  /**
   * Get spec information based on spec file path
   * @param {String} filePath spec file path
   * @returns {Object}
   */
  getInfoFromFilePath(filePath) {
    if (
      common.isNormalSpec(filePath) ||
      filePath.includes(`.spec-generation`)
    ) {
      // test\\specs\\jp-dentsu\\chugai\\record\\fullpage\\chugai.11598-S001.deactivate.js
      const captureTypePath = path.dirname(filePath); // test\\specs\\jp-dentsu\\chugai\\record\\fullpage
      const captureType = path.basename(captureTypePath);
      const prjPath = path.dirname(path.dirname(captureTypePath)); // test\\specs\\jp-dentsu\\chugai
      const projectId = path.basename(prjPath);
      const clientPath = path.dirname(prjPath); // test\\specs\\jp-dentsu
      const clientId = path.basename(clientPath);
      const specId = path.parse(filePath).name; // [project_id].[user_story_id]-[case_id].js

      var arrSpecId = specId.split(".");
      const caseId = arrSpecId[1];

      // THROW ERROR IF FILE NAME FORMAT IS INCORRECT
      if (typeof caseId == "undefined") {
        throw new Error(`Spec file name format is incorrect.`);
      }

      var status = "";
      if (arrSpecId.length > 2) {
        status = arrSpecId[2];
      } else {
        status = "active";
      }

      return {
        clientId: clientId,
        projectId: projectId,
        specId: `${arrSpecId[0]}.${caseId}`,
        caseId: caseId,
        captureType: captureType,
        status: status,
        fileName: `${specId}.js`,
        baselineFolder: `./test/specs/${clientId}/${projectId}/baseline`,
      };
    } else {
      if (filePath.includes(`init.js`)) {
        // test\\specs\\init.js
        return { specId: "init", fileName: `init.js` };
      } else {
        // test\\specs\\jp-dentsu\\chugai\\data\\tc2json.js
        const prjPath = path.dirname(path.dirname(filePath)); // test\\specs\\jp-dentsu\\chugai
        const projectId = path.basename(prjPath);
        const clientPath = path.dirname(prjPath); // test\\specs\\jp-dentsu
        const clientId = path.basename(clientPath);
        return { clientId: clientId, projectId: projectId };
      }
    }
  }

  /**
   * Get spec information based on spec id
   * @param {String} specId spec id or spec file name
   * @returns {Object}
   */
  async getInfoFromSpecId(specId) {
    const globPromise = util.promisify(glob);
    let info = {};

    // TRY TO FIND WITH NORMAL PATTERN
    var files = await globPromise(
      `./test/specs/**/record/**/${specId}.js`
    ).catch((err) => console.error(err));

    // TRY TO FIND WITH FILE NAME INCLUDED STATUS
    if (files.length <= 0) {
      files = await globPromise(
        `./test/specs/**/record/**/${specId}.*.js`
      ).catch((err) => console.error(err));
    }

    if (files.length > 0) {
      info = this.getInfoFromFilePath(files[0]);
    }

    return info;
  }

  /**
   * Search specs based on filter pattern
   * @param {String} pattern filter pattern
   * @returns {Array}
   */
  async searchAllSpecs(pattern = "") {
    const globPromise = util.promisify(glob);

    if (pattern == "") pattern = `./test/specs/**/record/**/*.js`;

    var files = await globPromise(pattern).catch((err) => console.error(err));

    return files;
  }

  /**
   * Search suites based on filter pattern
   * @param {String} pattern filter pattern
   * @returns {Array}
   */
  searchAllSuites(pattern = "") {
    if (pattern == "") pattern = `./test/specs/**/data/suites.json`;

    const files = glob.sync(pattern);

    return files;
  }

  /**
   * Get capture options
   * @param {String} clientId client id
   * @param {String} projectId project id
   * @returns {Object}
   */
  async getCaptureOpts(clientId, projectId) {
    const prjPath = process.cwd() + `/test/specs/${clientId}/${projectId}`;
    const baselinePath = prjPath + `/baseline/`;
    const excelData = await this.getProjectDataExcel(clientId, projectId);

    let webOpts = { baselineFolder: baselinePath };
    let mobileOpts = {};
    let globalOpts = {};
    const captureOptsDataSheet = excelData["img_compare"];
    for (let j = 0; j < captureOptsDataSheet.length; j++) {
      let config = captureOptsDataSheet[j]["config"];
      let value = captureOptsDataSheet[j]["value"];
      let type = captureOptsDataSheet[j]["type"];

      value = this.excelDataConverter(value);

      if (type != "") {
        switch (type) {
          case "web":
            webOpts[config] = value;
            break;
          case "mobile":
            mobileOpts[config] = value;
            break;
          case "global":
            globalOpts[config] = value;
            break;
        }
      }
    }
    return {
      web: webOpts,
      mobile: mobileOpts,
      global: globalOpts,
    };
  }

  /**
   * Write code back to spec file
   * @param {String} specFilePath spec file path
   * @param {String} contents file content
   */
  writeSpec(specFilePath, contents) {
    fs.writeFile(specFilePath, contents, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }

  /**
   * Update global data json
   * @param {Object} jsonData global data json
   * @param {Object} jsonPath json file path, default is global data json
   */
  async updateDataJsonFile(jsonData, jsonPath = "") {
    if (jsonPath == "") jsonPath = this.globalJsonPath;

    // FORMAT
    const formatJson = beautify(JSON.stringify(jsonData), { indent_size: 2 });

    // WRITE
    const fsPromises = fs.promises;
    await fsPromises
      .writeFile(jsonPath, formatJson)
      .catch((err) => console.error(err));
  }

  /**
   * Read JSON file and return JSON object
   * @param {String} path full file path
   * @param {String} opt default is utf8
   * @param {String} errMsg Error message will be thrown if failed
   * @returns {JSON}
   */
  async readFileJSON(path, opt = "utf8", errMsg = "") {
    const fsPromises = fs.promises;
    const data = await fsPromises
      .readFile(path, opt)
      .catch((err) => console.error(errMsg, err));

    return JSON.parse(data.toString());
  }

  /**
   * Read JSON file sync and return JSON object
   * @param {String} path full file path
   * @param {String} opt default is utf8
   * @returns {JSON}
   */
  readFileJSONSync(path, opt = "utf8") {
    try {
      const data = fs.readFileSync(path, opt);
      return JSON.parse(data.toString());
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Ensure data returned from Excel is usable
   * @param {String} value cell value from excel
   * @returns {String}
   */
  excelDataConverter(value) {
    if (typeof value == "undefined") value = 0;
    if (String(value).toLowerCase() == "true") value = true;
    if (String(value).toLowerCase() == "false") value = false;

    return value;
  }

  /**
   * Create folder if not existing
   * @param {String} path folder path
   */
  createFolder(path) {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }
  }

  /**
   * Create file with input content
   * @param {String} path file path
   * @param {String} content file content
   */
  createFile(path, content, encode = "") {
    if (encode == "") fs.writeFileSync(path, content);
    else fs.writeFileSync(path, content, encode);
  }

  /**
   * Copy file from source to destination
   * @param {String} from source file path
   * @param {String} to destination file path
   */
  copyFile(from, to) {
    fs.copyFile(from, to, (err) => {
      if (err) throw err;
    });
  }

  /**
   * Read file and get file content
   * @param {String} path file path
   * @returns {String}
   */
  async readFile(path, opt = "") {
    const fsPromises = fs.promises;
    let data = null;

    if (opt != "") {
      data = await fsPromises.readFile(path, opt).catch((err) => {
        // console.log(err);
      });
    } else {
      data = await fsPromises.readFile(path).catch((err) => {
        // console.log(err);
      });
    }

    return data;
  }

  /**
   * Rename a file
   * @param {String} oldPath old file path
   * @param {String} newPath new file path
   */
  async renameFile(oldPath, newPath) {
    const fsPromises = fs.promises;
    try {
      await fsPromises.rename(oldPath, newPath);
    } catch (err) {
      // console.error(err);
    }
  }

  /**
   * Check if file is existing async
   * @param {String} filePath file path
   * @returns {Boolean}
   */
  async fileExists(filePath) {
    const fsPromises = fs.promises;
    try {
      await fsPromises.access(filePath);
      return true;
    } catch (err) {
      if (err.code === "ENOENT") {
        return false;
      } else {
        throw err;
      }
    }
  }

  /**
   * Delete file async
   * @param {String} filePath file path
   */
  async deleteFile(filePath) {
    const fsPromises = fs.promises;
    try {
      await fsPromises.unlink(filePath);
    } catch (err) {
      // console.log(err);
    }
  }

  /**
   * Get the image dimensions
   * @param {Object} info Spec information
   * @param {String} platform android or iphone
   * @returns {Object}
   */
  async getImgSize(info, platform) {
    const prjPath =
      process.cwd() + `/test/specs/${info.clientId}/${info.projectId}`;
    const filePath = prjPath + `/baseline/${platform}/${info.specId}.png`;

    try {
      const image = await jimp.read(filePath);
      return {
        width: image.getWidth(),
        height: image.getHeight(),
      };
    } catch (error) {
      return {
        width: 0,
        height: 0,
      };
    }
  }
}
module.exports = new dataHandler();
