const path = require("path");

const dataHandler = require("./data_handler");
const common = require("../common");

class capHandler {
  constructor() {}

  /**
   * Generate capabilities from json into config
   * @param {Array} specs list of running spec files
   * @param {JSON} caps object contain capabilities that will be merged into config
   * @returns {JSON}
   */
  async generateCapabilities(specs, caps) {
    if (specs.length > 0) {
      const specFilePath = specs[0];

      if (common.isNormalSpec(specFilePath)) {
        const info = await dataHandler.getInfoFromFilePath(specFilePath);
        const projectCapabilities = await dataHandler.getProjectCapabilities(
          info.clientId,
          info.projectId
        );

        const dirPath = path.parse(specFilePath).dir;
        const dataPath = path.dirname(path.dirname(dirPath)) + `/data`;

        if (typeof projectCapabilities[caps["custom:cid"]] != "undefined") {
          const prjCaps = projectCapabilities[caps["custom:cid"]];

          for (var key in prjCaps) {
            var value = prjCaps[key];
            switch (key) {
              case "custom:enabled":
                if (!value) {
                  caps["appium:deviceName"] = prjCaps["appium:deviceName"];
                  return false;
                }
                break;
              case "appium:app":
                caps[key] = `${dataPath}/${value}`;
                break;

              default:
                caps[key] = value;
                break;
            }
          }
        }
      }
    }

    return caps;
  }

  /**
   * Get test capabilities used for Allure report
   * @param {String} specId spec id
   * @returns {Object}
   */
  async getCapabilities(specId) {
    const info = await dataHandler.getInfoFromSpecId(specId);
    let cap = {};

    if (info.captureType == "mobile") {
      // GET PLATFORM NAME - Android or iOS
      cap.platformName = driver.capabilities.platformName;
      if (typeof cap.platformName == "undefined" || cap.platformName == "") {
        cap.platformName = driver.capabilities.desired.platformName;
        if (typeof cap.platformName == "undefined" || cap.platformName == "") {
          cap.platformName = common.capitalize(info.captureType);
        }
      }

      // GET DEVICE INFO
      cap.deviceName = driver.capabilities.deviceName;
      cap.deviceModel = driver.capabilities.deviceModel;
      cap.deviceUDID = driver.capabilities.udid;
      cap.deviceManufacturer = driver.capabilities.deviceManufacturer;
      cap.platformVersion = driver.capabilities.platformVersion;
      if (cap.platformName.toLowerCase() != "ios") {
        cap.deviceScreenSize = driver.capabilities.deviceScreenSize;
        cap.deviceApiLevel = driver.capabilities.deviceApiLevel;

        // GET BASELINE FOLDER
        cap.baselineFolder = driver.capabilities.desired.deviceName;
      } else {
        // GET BASELINE FOLDER
        cap.baselineFolder = driver.capabilities.deviceName;
      }
    } else {
      // GET PLATFORM NAME
      cap.platformName = browser.capabilities.platformName.toLowerCase();
      if (typeof cap.platformName == "undefined" || cap.platformName == "") {
        cap.platformName = "desktop";
      }
      cap.platformName = common.capitalize(cap.platformName);

      // GET BROWSER INFO
      cap.browserName = browser.capabilities.browserName;
      cap.browserVersion = browser.capabilities.browserVersion;

      // GET BASELINE FOLDER
      cap.baselineFolder = `desktop_${browser.capabilities.browserName}`;
    }

    return cap;
  }
}
module.exports = new capHandler();
