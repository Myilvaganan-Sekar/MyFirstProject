const dataHandler = require("./data_handler");
const allureCustom = require("./allure");
const capHandler = require("./cap_handler");
const common = require("../common");

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

class jiraIntegration {
  constructor() {}

  /**
   * Main job of Jira intergration, is used to connect and update Jira ticket
   * @param {String} specFileName spec file name
   * @param {String} specTitle spec title
   * @param {Boolean} passed test result
   * @param {Object} error error returned if failed
   */
  async jobs(specFileName, specTitle, passed, error) {
    if (common.isNormalSpec(specFileName)) {
      const info = await dataHandler.getInfoFromFilePath(specFileName);
      const excelData = await dataHandler.getProjectDataExcel(
        info.clientId,
        info.projectId
      );

      let jiraPrjKey = excelData["config"][0]["jira_key"];
      let isCreateJira = excelData["config"][0]["create_jira"];
      let issue = await this.getIssue(info);

      // CONDITIONS :: TICKET NOT EXISTING & FAILED CASE
      // CREATE NEW TICKET
      if (
        !passed &&
        specTitle.includes("image comparison") &&
        isCreateJira == "yes" &&
        jiraPrjKey != "" &&
        issue.key == ""
      ) {
        var createIssueRes = await browser.call(
          async () => await this.createIssue(info, error.message, jiraPrjKey)
        );

        if (
          typeof createIssueRes != "undefined" &&
          typeof createIssueRes["data"] != "undefined"
        ) {
          const newIssueKey = createIssueRes["data"].key;

          // UPDATE ISSUE KEY BACK TO GLOBAL JSON
          this.updateIssueKeyIntoJson(info, newIssueKey, "open");

          // ADD ATTACHMENTS
          await browser.call(
            async () => await this.addIssueAttachment(info, newIssueKey, "diff")
          );
          await browser.call(
            async () =>
              await this.addIssueAttachment(info, newIssueKey, "baseline")
          );
          await browser.call(
            async () =>
              await this.addIssueAttachment(info, newIssueKey, "actual")
          );
        }
      }

      // UPDATE TICKET IF EXISTING
      if (
        specTitle.includes("image comparison") &&
        isCreateJira == "yes" &&
        jiraPrjKey != "" &&
        issue.key != ""
      ) {
        const closedTranId = excelData["config"][0]["closed_transition_id"];
        const reopenTranId = excelData["config"][0]["reopen_transition_id"];

        // CLOSE TICKET IF PASSED
        if (passed && issue.status == "open") {
          await browser.call(
            async () => await this.transitionIssue(issue.key, closedTranId)
          );
          this.updateIssueKeyIntoJson(info, issue.key, "closed");
        }

        // REOPEN TICKET IF FAILED
        if (!passed && issue.status == "closed") {
          await browser.call(
            async () => await this.transitionIssue(issue.key, reopenTranId)
          );
          this.updateIssueKeyIntoJson(info, issue.key, "open");
        }

        // UPDATE ATTACHMENTS
        var jiraIssueRes = await browser.call(
          async () => await this.getJiraIssue(issue.key)
        );
        if (
          typeof jiraIssueRes != "undefined" &&
          typeof jiraIssueRes["data"] != "undefined"
        ) {
          var attachments = jiraIssueRes["data"].fields.attachment;

          // DELETE ALL ATTACHMENTS
          for (let index = 0; index < attachments.length; index++) {
            const attachment = attachments[index];
            await browser.call(
              async () => await this.delIssueAttachment(attachment.id)
            );
          }

          // ADD NEW ATTACHMENT
          if (!passed) {
            await browser.call(
              async () => await this.addIssueAttachment(info, issue.key, "diff")
            );
            await browser.call(
              async () =>
                await this.addIssueAttachment(info, issue.key, "baseline")
            );
            await browser.call(
              async () =>
                await this.addIssueAttachment(info, issue.key, "actual")
            );
          }
        }
      }

      await this.addIssueLink(info);
    }
  }

  /**
   * Get issue key from global data json
   * @param {Object} info spec information
   * @returns {String}
   */
  async getIssue(info) {
    const jsonData = await dataHandler.getGlobalDataJson();
    const projects = jsonData.projects;
    const specId = info.specId;
    const clientId = info.clientId;
    const projectId = info.projectId;
    let issueId = "";
    let status = "";

    if (
      typeof projects[clientId] != "undefined" &&
      typeof projects[clientId][projectId] != "undefined" &&
      typeof projects[clientId][projectId][specId] != "undefined" &&
      typeof projects[clientId][projectId][specId]["jira"] != "undefined"
    ) {
      issueId = projects[clientId][projectId][specId]["jira"];
      status = projects[clientId][projectId][specId]["status"];
    }

    return {
      key: issueId,
      status: status,
    };
  }

  /**
   * Create new Jira issue and return issue key
   * @param {Object} info spec information
   * @param {String} errMsg error message will be thrown
   * @param {String} jiraPrjKey Jira project key
   * @returns {Object}
   */
  async createIssue(info, errMsg, jiraPrjKey) {
    if (errMsg.includes("Image comparison is failed")) {
      let issue = await this.getIssue(info);
      const jiraUrl = browser.config.jira;
      const jiraAuth = browser.config.jiraAuth;
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Basic ${jiraAuth}`,
      };
      const bodyData = {
        fields: {
          summary: `${info.specId} - Auto test flow is failed`,
          issuetype: {
            name: "Automation Bug",
          },
          project: {
            key: jiraPrjKey,
          },
          description: errMsg,
          labels: ["img_comparison"],
        },
      };
      let response = "";

      // ONLY CREATE IF NOT EXISTING
      if (issue.key == "") {
        response = await axios
          .post(`${jiraUrl}rest/api/2/issue`, bodyData, {
            headers: headers,
          })
          .catch((err) => {
            console.log(err);
          });
      }

      return response;
    }
  }

  /**
   * Update status and issue key into data json
   * @param {Object} info spec information
   * @param {String} issueKey issue key
   * @param {String} status closed or open
   */
  async updateIssueKeyIntoJson(info, issueKey, status) {
    let jsonData = await dataHandler.getGlobalDataJson();
    const specId = info.specId;
    const clientId = info.clientId;
    const projectId = info.projectId;

    if (typeof jsonData.projects[clientId] == "undefined")
      jsonData.projects[clientId] = {};
    if (typeof jsonData.projects[clientId][projectId] == "undefined")
      jsonData.projects[clientId][projectId] = {};
    if (typeof jsonData.projects[clientId][projectId][specId] == "undefined")
      jsonData.projects[clientId][projectId][specId] = {};

    jsonData.projects[clientId][projectId][specId]["jira"] = issueKey;
    jsonData.projects[clientId][projectId][specId]["status"] = status;

    await dataHandler.updateDataJsonFile(jsonData);
  }

  /**
   * Add attachments into Jira issue
   * @param {Object} info spec information
   * @param {String} issueKey Jira issue key
   * @param {String} type diff, actual or baseline
   * @returns {Object}
   */
  async addIssueAttachment(info, issueKey, type) {
    const specId = info.specId;
    const caps = await capHandler.getCapabilities(specId);
    const captureOpts = await dataHandler.getCaptureOpts(
      info.clientId,
      info.projectId
    );

    if (issueKey != "") {
      try {
        const form = new FormData();
        let screenshots = await dataHandler.getScreenshots(
          specId,
          caps.baselineFolder
        );
        const stats = fs.statSync(screenshots.filePaths[type]);
        const fileSizeInBytes = stats.size;
        const fileStream = fs.createReadStream(screenshots.filePaths[type]);
        form.append("file", fileStream, {
          knownLength: fileSizeInBytes,
          filename: type + ".png",
        });

        const jiraUrl = browser.config.jira;
        const jiraAuth = browser.config.jiraAuth;
        const headers = {
          Accept: "application/json",
          Authorization: `Basic ${jiraAuth}`,
          "X-Atlassian-Token": "no-check",
        };

        let response = await axios
          .post(`${jiraUrl}rest/api/2/issue/${issueKey}/attachments`, form, {
            headers: headers,
          })
          .catch((err) => {
            console.log(err);
          });

        return response;
      } catch (error) {
        return error;
      }
    }
  }

  /**
   * Change Jira issue status
   * @param {String} issueKey Jira issue key
   * @param {String} transitionId Jira tranistion id
   * @returns {Object}
   */
  async transitionIssue(issueKey, transitionId) {
    const jiraUrl = browser.config.jira;
    const jiraAuth = browser.config.jiraAuth;

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${jiraAuth}`,
    };
    const bodyData = {
      transition: {
        id: transitionId,
      },
    };

    let response = await axios
      .post(`${jiraUrl}rest/api/2/issue/${issueKey}/transitions`, bodyData, {
        headers: headers,
      })
      .catch((err) => {
        console.log(err);
      });

    return response;
  }

  /**
   * Get Jira issue ticket
   * @param {String} issueKey Jira issue key
   * @returns {Object}
   */
  async getJiraIssue(issueKey) {
    const jiraUrl = browser.config.jira;
    const jiraAuth = browser.config.jiraAuth;
    const headers = {
      Authorization: `Basic ${jiraAuth}`,
    };
    let response = await axios
      .get(`${jiraUrl}rest/api/2/issue/${issueKey}`, {
        headers: headers,
      })
      .catch((err) => {
        console.log(err);
      });

    return response;
  }

  /**
   * Delete Jira issue attachment
   * @param {String} attachmentId Jira attachment id
   * @returns {Object}
   */
  async delIssueAttachment(attachmentId) {
    const jiraUrl = browser.config.jira;
    const jiraAuth = browser.config.jiraAuth;
    const headers = {
      Authorization: `Basic ${jiraAuth}`,
    };

    let response = await axios
      .delete(`${jiraUrl}rest/api/2/attachment/${attachmentId}`, {
        headers: headers,
      })
      .catch((err) => {
        console.log(err);
      });

    return response;
  }

  /**
   * Add issue link to data json and Allure
   * @param {Object} info spec information
   */
  async addIssueLink(info) {
    const jsonData = await dataHandler.getGlobalDataJson();
    const projects = jsonData.projects;
    const specId = info.specId;
    const clientId = info.clientId;
    const projectId = info.projectId;

    if (
      typeof projects[clientId] != "undefined" &&
      typeof projects[clientId][projectId] != "undefined" &&
      typeof projects[clientId][projectId][specId] != "undefined" &&
      typeof projects[clientId][projectId][specId]["jira"] != "undefined" &&
      projects[clientId][projectId][specId]["jira"] != ""
    ) {
      allureCustom.addIssue(projects[clientId][projectId][specId]["jira"]);
    }
  }
}
module.exports = new jiraIntegration();
