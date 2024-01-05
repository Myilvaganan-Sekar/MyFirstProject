const assert = require("assert");

const beautify = require("js-beautify").js;
const https = require("https");

const allureCustom = require("./lib/allure");
const dataHandler = require("./lib/data_handler");
const capHandler = require("./lib/cap_handler");

class Utils {
  /**
   * Save and compare the screenshots between baseline and actual
   * @param {string} projId Project ID
   * @param {string} specId Spec ID
   */
  async imgCompare(projId, specId) {
    const info = await dataHandler.getInfoFromSpecId(specId);
    const captureOpts = await dataHandler.getCaptureOpts(info.clientId, projId);
    const excelData = await dataHandler.getProjectDataExcel(
      info.clientId,
      projId
    );

    // WAIT FOR CAPTURE LATENCY
    const waitForCapture = captureOpts.global["wait_for"];
    await browser.pause(waitForCapture);

    // GET ELEMENTS HIDDEN OR REMOVED
    const hideRevEle = await this.getHideRemoveEle(
      info,
      captureOpts,
      excelData
    );

    const status = info.status;
    const captureType = info.captureType;
    let webCaptureOpts = captureOpts.web;
    let mobileCaptureOpts = captureOpts.mobile;
    let result = 0;

    // CHECK STATUS
    if (status == "active") {
      // CHECK CAPTURE TYPE
      switch (captureType) {
        case "fullpage":
          // ADD HIDE REMOVE ELEMENT
          if (
            typeof hideRevEle.fullpageHideElements != "undefined" &&
            hideRevEle.fullpageHideElements.length > 0
          ) {
            webCaptureOpts["hideElements"] = hideRevEle.fullpageHideElements;
          }
          if (
            typeof hideRevEle.fullpageRemoveElements != "undefined" &&
            hideRevEle.fullpageRemoveElements.length > 0
          ) {
            webCaptureOpts["removeElements"] =
              hideRevEle.fullpageRemoveElements;
          }

          // DO COMPARISON --- AUTO SAVE BASELINE
          result = await browser.checkFullPageScreen(specId, webCaptureOpts);
          break;
        case "screen":
          // ADD HIDE REMOVE ELEMENT
          if (
            typeof hideRevEle.screenHideElements != "undefined" &&
            hideRevEle.screenHideElements.length > 0
          ) {
            webCaptureOpts["hideElements"] = hideRevEle.screenHideElements;
          }
          if (
            typeof hideRevEle.screenRemoveElements != "undefined" &&
            hideRevEle.screenRemoveElements.length > 0
          ) {
            webCaptureOpts["removeElements"] = hideRevEle.screenRemoveElements;
          }

          // DO COMPARISON --- AUTO SAVE BASELINE
          result = await browser.checkScreen(specId, webCaptureOpts);
          break;
        case "mobile":
          // ADD BLOCKOUT ELEMENT
          if (
            typeof hideRevEle.elementBlockOuts != "undefined" &&
            hideRevEle.elementBlockOuts.length > 0
          ) {
            mobileCaptureOpts["elementBlockOuts"] = hideRevEle.elementBlockOuts;
          }

          // ADD BLOCKOUTS
          if (
            typeof hideRevEle.blockOuts != "undefined" &&
            hideRevEle.blockOuts.length > 0
          ) {
            mobileCaptureOpts["blockOuts"] = hideRevEle.blockOuts;
          }

          // DO COMPARISON --- AUTO SAVE BASELINE
          let resultObj = await driver.compareScreen(specId, mobileCaptureOpts);

          // GET RESULT
          result = resultObj.misMatchPercentage;
          break;
      }
    }

    // CUSTOMIZE ALLURE REPORT
    await allureCustom.customDetail(info, result, captureOpts);
    allureCustom.customActions(specId, status);

    // THROW ERROR IF FAILED
    if (result > 0) {
      assert.fail(
        new Error(`Image comparison is failed. Diff percentage is ${result}%.`)
      );
    }
  }

  /**
   * Bypass page authentication
   * @param {String} clientId client id
   * @param {String} projectId project id
   */
  async pageAuth(clientId, projectId) {
    const excelData = await dataHandler.getProjectDataExcel(
      clientId,
      projectId
    );
    const enabled = excelData["auth"][0]["enabled"];

    if (enabled == "yes") {
      const baseUrl = excelData["config"][0]["base_url"];
      const handler = excelData["auth"][0]["handler"];
      let http = "http://";
      if (baseUrl.includes("https://")) http = "https://";

      await browser.url(
        `${http}${excelData["auth"][0]["usr"]}:${
          excelData["auth"][0]["pass"]
        }@${baseUrl.replace(http, "")}${handler}`
      );
      await browser.pause(`${excelData["auth"][0]["wait"]}`);
      await browser.url(`${baseUrl}${handler}`);
    }
  }

  /**
   * Check if current capability is valid
   * @returns {boolean}
   */
  async checkValidCaps() {
    const platform = await browser.capabilities.platformName;
    const browserName = await browser.capabilities.browserName;
    let desiredCaps = await browser.capabilities.desired;
    let valid = true;

    if (typeof desiredCaps == "undefined")
      desiredCaps = await driver.capabilities;

    // DETECT WEB OR MOBILE
    if (browserName == "" || typeof browserName == "undefined") {
      switch (platform) {
        case "Android":
          if (
            (typeof desiredCaps["udid"] == "undefined" &&
              typeof desiredCaps["appium:udid"] == "undefined") ||
            (typeof desiredCaps["appPackage"] == "undefined" &&
              typeof desiredCaps["appium:appPackage"] == "undefined") ||
            (typeof desiredCaps["appActivity"] == "undefined" &&
              typeof desiredCaps["appium:appActivity"] == "undefined")
          )
            valid = false;
          break;

        case "iOS":
          break;
      }
    }

    return valid;
  }

  /**
   * Get list of elements to hide or remove or blockout
   * @param {Object} info spec information
   * @param {Object} captureOpts capture options
   * @param {Object} excelData excel data
   * @returns {Object}
   */
  async getHideRemoveEle(info, captureOpts, excelData) {
    const captureDataSheet = excelData["img_compare"];
    const caps = await capHandler.getCapabilities(info.specId);
    let result = {
      // WEB
      fullpageHideElements: [],
      fullpageRemoveElements: [],
      screenHideElements: [],
      screenRemoveElements: [],
      // MOBILE
      elementBlockOuts: [],
      blockOuts: [],
    };

    // DEFINE PLATFORM
    let platform = "web";
    if (info.captureType == "mobile") platform = "mobile";

    for (let i = 0; i < captureDataSheet.length; i++) {
      const row = captureDataSheet[i];
      const fullHide = row["fullpage_hide_element"];
      const screenHide = row["screen_hide_element"];
      const fullRemove = row["fullpage_remove_element"];
      const screenRemove = row["screen_remove_element"];
      const mobileEleBlockout = row["mobile_element_blockout"];
      const mobileBlockout = row["mobile_blockouts"];

      switch (platform) {
        case "web":
          // HIDE ELEMENT --- VISIBILITY = HIDDEN
          if (typeof fullHide != "undefined" && fullHide != "") {
            const fullHideEle = await $(fullHide);
            if (typeof fullHideEle.error == "undefined")
              result["fullpageHideElements"].push(fullHideEle);
          }
          if (typeof screenHide != "undefined" && screenHide != "") {
            const screenHideEle = await $(screenHide);
            if (typeof screenHideEle.error == "undefined")
              result["screenHideElements"].push(screenHideEle);
          }

          // REMOVE ELEMENT --- DISPLAY = NONE
          if (typeof fullRemove != "undefined" && fullRemove != "") {
            const fullRemoveEle = await $(fullRemove);
            if (typeof fullRemoveEle.error == "undefined")
              result["fullpageRemoveElements"].push(fullRemoveEle);
          }
          if (typeof screenRemove != "undefined" && screenRemove != "") {
            const screenRemoveEle = await $(screenRemove);
            if (typeof screenRemoveEle.error == "undefined")
              result["screenRemoveElements"].push(screenRemoveEle);
          }
          break;
        case "mobile":
          const blockoutMargin = captureOpts.global["element_blockout_margin"];
          // ELEMENT BLOCKOUTS
          if (
            typeof mobileEleBlockout != "undefined" &&
            mobileEleBlockout != ""
          ) {
            if (
              (caps.platformName.toLowerCase() == "android" &&
                mobileEleBlockout.includes("android=")) ||
              (caps.platformName.toLowerCase() == "ios" &&
                mobileEleBlockout.includes("-ios")) ||
              mobileEleBlockout.substring(0, 1) == "~" ||
              mobileEleBlockout.substring(0, 2) == "//"
            ) {
              const ele = await $(mobileEleBlockout);
              if (await ele.isExisting())
                result["elementBlockOuts"].push({
                  element: ele,
                  margin: blockoutMargin,
                });
            }
          }
          // BLOCKOUTS
          if (typeof mobileBlockout != "undefined" && mobileBlockout != "") {
            const arg = JSON.parse(mobileBlockout);

            // GET IMG DIMENSIONS
            let dimensions = {};
            if (caps.platformName.toLowerCase() == "android") {
              const { width, height } = await driver.getWindowRect();
              dimensions.width = width;
              dimensions.height = height;
            }
            if (caps.platformName.toLowerCase() == "ios") {
              const imgDimensions = await dataHandler.getImgSize(
                info,
                caps.baselineFolder
              );
              dimensions.width = imgDimensions.width;
              dimensions.height = imgDimensions.height;
            }

            if (dimensions.width > 0 || dimensions.height > 0) {
              let param = {
                x: arg.x * dimensions.width,
                y: arg.y * dimensions.height,
                width: dimensions.width,
                height: dimensions.height,
              };
              if (typeof arg.height != "undefined") {
                param.height = arg.height;
              }
              if (typeof arg.width != "undefined") {
                param.width = arg.width;
              }

              result["blockOuts"].push(param);
            }
          }

          break;
      }
    }

    return result;
  }

  /**
   * Add custom capture option
   * @param {string} specId Spec id
   * @param {string} key option name
   * @param {string} value option value
   * @param {string} type web or mobile
   */
  async addCaptureOpts(specId, key, value, type = "web") {
    const info = await dataHandler.getInfoFromSpecId(specId);
    let jsonData = await dataHandler.getGlobalDataJson();
    var data = jsonData.projects[info.clientId][info.projectId]["cpt_opt"];
    let changed = false;

    let opts = {
      id: specId,
      values: [],
    };

    if (typeof data == "undefined" || data.length <= 0) {
      data = [];
      data.push(opts);
    }

    // LOOP DATA
    for (let i = 0; i < data.length; i++) {
      // DEFINE DETAIL OPT
      const deOpt = {
        key: key,
        enabled: true,
        arg: {
          type: type,
          value: value,
        },
      };

      if (data[i]["id"] == specId) {
        // CHECK OPT EXIST
        if (
          typeof data[i].values == "undefined" ||
          data[i].values.length <= 0
        ) {
          data[i].values = [];
          data[i].values.push(deOpt);
          changed = true;
        } else {
          let found = false;
          for (let n = 0; n < data[i].values.length; n++) {
            if (data[i].values[n].key == key) {
              data[i].values[n] = deOpt;
              found = true;
              changed = true;
              break;
            }
          }
          if (!found) {
            data[i].values.push(deOpt);
            changed = true;
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

  /**
   * Search all indexes of substring in string
   * @param {string} searchStr Search substring
   * @param {string} str Target string
   * @param {boolean} caseSensitive Case sensitive
   * @returns {Array} found indexes
   */
  getIndicesOf(searchStr, str, caseSensitive) {
    var searchStrLen = searchStr.length;
    if (searchStrLen == 0) {
      return [];
    }
    var startIndex = 0,
      index,
      indices = [];
    if (!caseSensitive) {
      str = str.toLowerCase();
      searchStr = searchStr.toLowerCase();
    }
    while ((index = str.indexOf(searchStr, startIndex)) > -1) {
      indices.push(index);
      startIndex = index + searchStrLen;
    }
    return indices;
  }

  /**
   * Customize the allure report for current spec
   * @param {Object} arg included reportId, excelData, msg and info object
   */
  async customReport(arg = {}) {
    for (let i = 0; i < arg.excelData["custom_report"].length; i++) {
      const row = arg.excelData["custom_report"][i];

      if (row["id"] == arg.reportId) {
        // CUSTOMIZE ALLURE REPORT
        allureCustom.addSeverity(row["severity"]);

        // ADD ENV DETAIL
        await allureCustom.addEnvDetail(arg.info);

        // ADD CASE ID
        allureCustom.addArgument("case", arg.info.specId);

        // ADD IP ADDR
        await this.getIPAddr()
          .then((publicIp) => {
            console.log(publicIp); // prints the public IP address to the console
            allureCustom.addArgument("ip", publicIp);
          })
          .catch((err) => {
            console.error(err);
          });

        // ADD STEP
        allureCustom.addStep(arg.msg);

        // ADD ATTACHMENT
        const screenshot = await browser.takeScreenshot();
        allureCustom.addAttachment(screenshot);

        // END STEP
        allureCustom.endStep(row["status"]);

        return row["status"];
      }
    }
  }

  /**
   * Check if firewall rejected the access
   * @param {String} specId spec id
   */
  async checkFireWall(specId) {
    const info = await dataHandler.getInfoFromSpecId(specId);
    const excelData = await dataHandler.getProjectDataExcel(
      info.clientId,
      info.projectId
    );

    if (info.captureType != "mobile") {
      for (let i = 0; i < excelData["firewall"].length; i++) {
        const row = excelData["firewall"][i];

        if (row["enabled"] == "yes") {
          switch (row["type"]) {
            case "security":
              const eleMsg = await $(
                `//body//*[contains(text(), '${row["msg"]}')]`
              );

              // IF ERROR MESSAGE IS RETURNED
              if (typeof eleMsg.error == "undefined") {
                const msg = await eleMsg.getText();
                const arg = {
                  reportId: row["custom_report"],
                  excelData: excelData,
                  msg: msg,
                  info: info,
                };

                // SCROLL INTOVIEW
                await eleMsg.scrollIntoView({
                  block: "center",
                  inline: "center",
                });

                // CUSTOM REPORT
                const status = await this.customReport(arg);

                // THROW ERROR
                switch (status) {
                  case "failed":
                    await expect(eleMsg).not.toBeExisting();
                    break;
                  case "broken":
                    assert.fail(new Error(msg));
                    break;
                }
              }
              break;
            default:
              if (
                row["type"] == "error_404" ||
                row["type"] == "access_denied"
              ) {
                if ((await browser.getTitle()).includes(row["msg"])) {
                  const arg = {
                    reportId: row["custom_report"],
                    excelData: excelData,
                    msg: row["msg"],
                    info: info,
                  };

                  // SCROLL INTOVIEW
                  await $(
                    `//body//*[contains(text(), '${row["msg"]}')]`
                  ).scrollIntoView({ block: "center", inline: "center" });

                  // CUSTOM REPORT
                  const status = await this.customReport(arg);

                  // THROW ERROR
                  switch (status) {
                    case "failed":
                      await expect(browser).not.toHaveTitleContaining(
                        row["msg"]
                      );
                      break;
                    case "broken":
                      assert.fail(new Error(row["msg"]));
                      break;
                  }
                }
              }
              break;
          }
        }
      }
    }
  }

  /**
   * Make up the code with beauty format
   * @param {String} contents spec file script
   * @param {Int} indent_size indent size
   * @param {Boolean} space_in_empty_paren keep or remove space in empty paren
   * @param {Boolean} preserve_newlines keep or remove empty lines
   * @param {Int} max_preserve_newlines number of empty lines can be kept
   * @param {String} eol character defined for breakline
   * @returns {String}
   */
  codeMakeUp(
    contents,
    indent_size = 2,
    space_in_empty_paren = true,
    preserve_newlines = true,
    max_preserve_newlines = 2,
    eol = "\r"
  ) {
    return beautify(contents, {
      indent_size: indent_size,
      space_in_empty_paren: space_in_empty_paren,
      preserve_newlines: preserve_newlines,
      max_preserve_newlines: max_preserve_newlines,
      eol: eol,
    });
  }

  /**
   * Generate spec files automatically based on list of pages in excel
   * @param {String} clientId client id
   * @param {String} projectId project id
   * @param {String} addStep custom additional step
   */
  async specGeneration(file, flows = [], total = -1, dynamicBaseUrl = false) {
    const info = await dataHandler.getInfoFromFilePath(file);
    const clientId = info.clientId;
    const projectId = info.projectId;
    const captureType = "fullpage";
    const excelData = await dataHandler.getProjectDataExcel(
      clientId,
      projectId
    );

    // CHECK IF CONFIG IS ENABLED
    const enabled = excelData["config"][0]["spec_generation"];
    if (typeof enabled == "undefined" || enabled != "yes") {
      console.log(`The config is set to ${enabled}.`);
      return false;
    }

    // GET TOTAL
    if (total == -1) total = excelData["pages"].length;

    // REMOVE OLD FILES
    await this.removeFiles(clientId, projectId, captureType);

    // CREATE NEW FILES
    for (let i = 0; i < total; i++) {
      const row = excelData["pages"][i];

      if (row["domain"] != "" && typeof row["domain"] != "undefined") {
        const domain = row["domain"].replace(/\/+$/, "");
        let handler = ``;
        const pageId = row["page_id"];

        if (typeof row["handler"] != "undefined") {
          handler = row["handler"].replace(/^\/+/, "");
        }

        let link = domain + "/" + handler;
        let coreScript = `await browser.url("${link}");`;

        if (dynamicBaseUrl) {
          link = "`${global.dynamicBaseUrl}/" + handler + "`";
          coreScript = `await browser.url(${link});`;
        }

        // DEFINE FILE PATH
        const fileName = `${projectId}.${captureType}-${pageId}.js`;
        const filePath =
          process.cwd() +
          `/test/specs/${clientId}/${projectId}/record/${captureType}/${fileName}`;

        // DEFINE CONTENTS
        for (let j = 0; j < flows.length; j++) {
          const flow = flows[j];
          if (flow.id == "0" || flow.id == row["flow"]) {
            if (flow.preStep != "") {
              coreScript = flow.preStep + "\n" + coreScript;
            }
            if (flow.addStep != "") {
              coreScript = coreScript + "\n" + flow.addStep;
            }
          }
        }

        const contents = `var assert = require("assert");
        describe("${captureType}-${pageId}",async function(){
          it("recorder :: ${captureType}-${pageId}",async function(){
            ${coreScript}
          });
        });`;

        // CHECK STATUS
        if (row["status"] != "active") {
          // RENAME
          const newFilePath =
            process.cwd() +
            `/test/specs/${clientId}/${projectId}/record/${captureType}/${projectId}.${captureType}-${pageId}.${row["status"]}.js`;
          await dataHandler.writeSpec(newFilePath, this.codeMakeUp(contents));
        } else {
          // WRITE FILE
          await dataHandler.writeSpec(filePath, this.codeMakeUp(contents));
        }
      }
    }
  }

  /**
   * Remove all current specs before generation
   * @param {String} clientId client id
   * @param {String} projectId project id
   * @param {String} captureType capture type
   */
  async removeFiles(clientId, projectId, captureType) {
    const pathPattern = `./test/specs/${clientId}/${projectId}/record/${captureType}/*.fullpage-*.js`;
    const searchFiles = await dataHandler.searchAllSpecs(pathPattern);
    for (let i = 0; i < searchFiles.length; i++) {
      const f = searchFiles[i];
      await dataHandler.deleteFile(f);
    }
  }

  /**
   * Get current public IP Address
   * @returns {String}
   */
  async getIPAddr() {
    return new Promise((resolve, reject) => {
      https
        .get("https://api.ipify.org", (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            const publicIp = data.trim();
            resolve(publicIp);
          });
        })
        .on("error", (err) => {
          reject(err);
        });
    });
  }

  /**
   * Get localization from spec id
   * @param {String} specId spec id
   * @returns {String}
   */
  async getLocalization(specId) {
    const info = await dataHandler.getInfoFromSpecId(specId);
    const caseId = info.caseId;
    const excelData = await dataHandler.getProjectDataExcel(
      info.clientId,
      info.projectId
    );

    const arrCaseId = caseId.split("_");
    let country = arrCaseId[arrCaseId.length - 1];

    for (let i = 0; i < excelData["localization_map"].length; i++) {
      const row = excelData["localization_map"][i];
      if (row["key"] === country.toLowerCase()) {
        country = row["mapping"];
        break;
      }
    }

    return country;
  }

  /**
   * Auto get dynamic base url
   * @param {String} specId Spec id
   * @returns {String}
   */
  async getDynamicUrl(specId) {
    const info = await dataHandler.getInfoFromSpecId(specId);
    const excelData = await dataHandler.getProjectDataExcel(
      info.clientId,
      info.projectId
    );

    // CHECK IF ACTUAL URL IS DEFINED
    const baseUrl = excelData["config"][0]["base_url"];
    const actualUrl = excelData["config"][0]["actual_url"];
    if (
      typeof actualUrl != "undefined" &&
      (actualUrl != "") & (actualUrl != baseUrl)
    ) {
      // ACTUAL URL IS DEFINED
      const caps = await capHandler.getCapabilities(info.specId);
      const baselineFolder = caps.baselineFolder;
      const pathPattern = `${info.baselineFolder}/${baselineFolder}/${specId}.png`;
      const searchFiles = await dataHandler.searchAllSpecs(pathPattern);

      // CHECK IF BASELINE IS EXISTING
      if (searchFiles.length > 0) {
        // BASELINE IS EXISTING
        return actualUrl;
      } else {
        // BASELINE IS NOT EXISTING
        return baseUrl;
      }
    } else {
      // ACTUAL URL IS NOT DEFINED
      return baseUrl;
    }
  }
}

module.exports = new Utils();
