const allureReporter = require("@wdio/allure-reporter").default;
const dataHandler = require("./data_handler");
const capHandler = require("./cap_handler");
const common = require("../common");

class allureCustom {
  constructor() {}

  /**
   * Custom Allure detail
   * @param {Object} info spec information
   * @param {Int} compareResult comparison result
   * @param {Object} captureOpts capture options
   */
  async customDetail(info, compareResult, captureOpts, severity = "critical") {
    const specId = info.specId;
    const status = info.status;
    const captureType = info.captureType;
    const caps = await capHandler.getCapabilities(specId);
    const screenshots = await dataHandler.getScreenshots(
      specId,
      caps.baselineFolder
    );
    const excelData = await dataHandler.getProjectDataExcel(
      info.clientId,
      info.projectId
    );
    let clientName = excelData["config"][0]["client"];
    let prjName = excelData["config"][0]["project"];
    if (clientName == "") clientName = info.clientId;
    if (prjName == "") prjName = info.projectId;

    // ADD ENV
    if (captureType == "mobile") {
      allureReporter.addEnvironment(
        `${prjName} :: ${common.capitalize(captureType)} :: ${
          caps.platformName
        }`,
        `${common.capitalize(caps.deviceManufacturer)} ${caps.deviceModel}`
      );
    } else {
      allureReporter.addEnvironment(
        `${prjName} :: ${common.capitalize(captureType)} :: ${
          caps.platformName
        }`,
        `${common.capitalize(caps.browserName)} ${caps.browserVersion}`
      );
    }

    // ADD FEATURES - USED TO DISPLAY UNDER "FEATURES BY STORIES"
    allureReporter.addFeature(`${clientName} :: ${prjName}`);

    // ADD CUSTOM INFO
    switch (status) {
      case "active":
        allureReporter.addStory(
          captureType.charAt(0).toUpperCase() + captureType.slice(1)
        );

        // ADD DETAIL --- ONLY FAILED CASE
        if (compareResult > 0) {
          allureReporter.addSeverity(severity);

          // ADD ATTACHMENTS
          allureReporter.addAttachment(
            `Baseline: ${specId}`,
            screenshots.contents.baseline,
            "image/png"
          );
          allureReporter.addAttachment(
            `Actual: ${specId}`,
            screenshots.contents.actual,
            "image/png"
          );
          allureReporter.addAttachment(
            `Diff: ${specId}`,
            screenshots.contents.diff,
            "image/png"
          );

          // GET PAGE HTML
          if (captureType != "mobile") {
            const body = await $("body");
            const html = await body.getHTML();
            allureReporter.addAttachment(`HTML: ${specId}`, html);
          }

          // ADD CONSOLE
          console.log({
            specId: specId,
            captureOpts: captureOpts,
            capabilities: driver.capabilities,
          });
        }
        break;
      case "manual":
        allureReporter.addStory("Manual Test");
        break;
      case "deactivate":
        allureReporter.addStory("Deactivated");
        break;
      case "support":
        allureReporter.addStory("Request support");
        break;
    }

    // ADD CASE ID
    allureReporter.addArgument("case", specId);

    // ADD ENV DETAIL
    await this.addEnvDetail(info);
  }

  /**
   * Add environment detail
   * @param {Object} info project information
   */
  async addEnvDetail(info) {
    if (info.status == "active") {
      const caps = await capHandler.getCapabilities(info.specId);

      if (info.captureType == "mobile") {
        allureReporter.addArgument("platform", caps.platformName);
        allureReporter.addArgument(
          "device name",
          `${common.capitalize(caps.deviceManufacturer)} ${caps.deviceModel}`
        );
        allureReporter.addArgument("device udid", caps.deviceUDID);
        allureReporter.addArgument("device screen size", caps.deviceScreenSize);
        allureReporter.addArgument("platform version", caps.platformVersion);
        allureReporter.addArgument("device api level", caps.deviceApiLevel);
      } else {
        allureReporter.addArgument("url", await browser.getUrl());
        allureReporter.addArgument("platform", caps.platformName);
        allureReporter.addArgument(
          "browser name",
          `${common.capitalize(caps.browserName)} ${caps.browserVersion}`
        );
      }
    }
  }

  /**
   * Custom Allure description and add custom actions
   * @param {String} specId spec id or spec file name
   * @param {String} status active, deactive, manual, support
   */
  customActions(specId, status) {
    const injectJS = `
      <script>
        var rvDefaultScreenshot = (timer) => {
          // Remove default screenshot
          var eles = document.getElementsByClassName("attachment-row__name long-line");
          var xPath = "//div[contains(text(),'Screenshot')]";
          var arr = [];
          for (let i = 0; i < eles.length; i++) {
            if(eles[i].textContent.includes("Screenshot")){
              arr.push(eles[i].parentNode.parentNode);
            }

            if(eles[i].textContent.includes("Diff")){
              var referenceNode = eles[i].parentNode.parentNode;
              var newNode = document.createElement("hr");
              referenceNode.after(newNode);
            }
          }
          for (let j = 0; j < arr.length; j++) {
            arr[j].remove();
          }

          // Remove default browser or device
          var browserXPath = "//span[contains(text(),'browser')]";
          var deviceXPath = "//span[contains(text(),'device')]";
          var browserEle = document.evaluate(browserXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          var deviceEle = document.evaluate(deviceXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          if(browserEle != null) {
            browserEle.parentNode.remove();
          }
          if(deviceEle != null) {
            deviceEle.parentNode.remove();
          }

          console.log("Timer is working");

          var matchingElement = document.evaluate(xPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          if(matchingElement == null) {
            clearInterval(timer);
            console.log("Timer is ended");
          }
        }

        var timer = setInterval(() => {
          rvDefaultScreenshot(timer);
        }, 100);
      </script>
    `;

    // Icons are defined here: https://fontawesome.com/v4/icons/
    let title = "";
    const deactivateCommand = `qatest=tests%20deactivate%20--exec-dis-testname=${specId}`;
    const deactivateHref = `${browser.config.jenkins}/job/${browser.config.jobName}/buildWithParameters?${deactivateCommand}`;
    const activateCommand = `qatest=tests%20activate%20--exec-dis-testname=${specId}`;
    const activateHref = `${browser.config.jenkins}/job/${browser.config.jobName}/buildWithParameters?${activateCommand}`;
    const manualCommand = `qatest=tests%20manual%20--exec-dis-testname=${specId}`;
    const manualHref = `${browser.config.jenkins}/job/${browser.config.jobName}/buildWithParameters?${manualCommand}`;
    const supportCommand = `qatest=tests%20support%20--exec-dis-testname=${specId}`;
    const supportHref = `${browser.config.jenkins}/job/${browser.config.jobName}/buildWithParameters?${supportCommand}`;
    const rebaselineCommand = `qatest=screenshot%20override%20--scr-testname=${specId}`;
    const rebaselineHref = `${browser.config.jenkins}/job/${browser.config.jobName}/buildWithParameters?${rebaselineCommand}`;

    let activeHTML = `
      <li>
        <span class="fa fa-check"></span>
        <a class="link" target="_blank" href="${activateHref}">Activate this spec for automation test</a>
      </li>
      </br>
    `;
    let deactiveHTML = `
      <li>
        <span class="fa fa-archive"></span>
        <a class="link" target="_blank" href="${deactivateHref}">Deactivate this spec</a>
      </li>
      </br>
    `;
    let manualHTML = `
      <li>
        <span class="fa fa-signing"></span>
        <a class="link" target="_blank" href="${manualHref}">Confirm this spec for manual test</a>
      </li>
      </br>
    `;
    let supportHTML = `
      <li>
        <span class="fa fa-support"></span>
        <a class="link" target="_blank" href="${supportHref}">Request support from QA Auto</a>
      </li>
      </br>
    `;
    let rebaselineHTML = `
      <li>
        <span class="fa fa-photo"></span>
        <a class="link" target="_blank" href="${rebaselineHref}">Update baseline</a>
      </li>
    `;

    switch (status) {
      case "active":
        title = `<span style="color: blue;">This spec is active for automation test. You can change the status by one of actions below.</span>`;
        activeHTML = "";
        break;
      case "manual":
        title = `<span style="color: red;">This spec is applied for manual test. You can change the status by one of actions below.</span>`;
        manualHTML = "";
        break;
      case "deactivate":
        title = `<span style="color: red;">This spec is deactivated. You can change the status by one of actions below.</span>`;
        deactiveHTML = "";
        break;
      case "support":
        title = `<span style="color: red;">This spec is required support from QA Automation. You can change the status by one of actions below.</span>`;
        supportHTML = "";
        break;
    }

    const desc = `
      <div style="font-size:16pt;">${title}</div>
      <ul style="list-style: none;margin-left: -1.5em;">
        ${activeHTML}
        ${deactiveHTML}
        ${manualHTML}
        ${supportHTML}
        ${rebaselineHTML}
      </ul>
    `;

    allureReporter.addDescription(injectJS + desc, "html");
  }

  /**
   * Group spec into recorder or image comparison
   * @param {String} specFileName spec file name
   * @param {String} specTitle spec title
   */
  async groupTest(specFileName, specTitle) {
    const info = await dataHandler.getInfoFromFilePath(specFileName);
    const excelData = await dataHandler.getProjectDataExcel(
      info.clientId,
      info.projectId
    );

    // Group all tests into recorder
    if (
      !specTitle.includes("image comparison") &&
      !specTitle.includes("init project") &&
      !specTitle.includes("generate spec files")
    ) {
      const clientName = excelData["config"][0]["client"];
      const prjName = excelData["config"][0]["project"];

      if (clientName == "") clientName = info.clientId;
      if (prjName == "") prjName = info.projectId;

      allureReporter.addFeature(`${clientName} :: ${prjName}`);
      allureReporter.addStory("Recorder");
    }
  }

  /**
   * Add custom link into Allure
   * @param {String} link link to be added into Allure
   */
  addIssue(link) {
    allureReporter.addIssue(link);
  }

  /**
   * Add a custom step to report
   * @param {String} msg Message throw out
   */
  addStep(msg) {
    allureReporter.startStep(msg);
  }

  /**
   * End step with status
   * @param {String} status "failed", "passed", "broken", "skipped" or "unknown"
   */
  endStep(status) {
    allureReporter.endStep(status);
  }

  /**
   * Add severity for test in Allure
   * @param {String} severity blocker, critical, normal, minor, trivial
   */
  addSeverity(severity) {
    allureReporter.addSeverity(severity);
  }

  /**
   * Add argument for test in Allure
   * @param {String} name name of argument
   * @param {String} value value of argument
   */
  addArgument(name, value) {
    allureReporter.addArgument(name, value);
  }

  /**
   * Add attachment into report
   * @param {String} contents screenshot binary
   */
  addAttachment(contents, type = "image/png") {
    allureReporter.addAttachment(
      `Screenshot`,
      Buffer.from(contents, "base64"),
      type
    );
  }
}
module.exports = new allureCustom();
