class Common {
  /**
   * Capitalize the 1st character of a string
   * @param {String} str string to be capitalized
   * @returns {String}
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Check if spec file is ignored
   * @param {String} specFilePath Spec full file path
   * @returns {Boolean}
   */
  isNormalSpec(specFilePath) {
    if (
      specFilePath.includes("init.js") ||
      specFilePath.includes("tc2json.js") ||
      specFilePath.includes("spec-generation.js")
    ) {
      return false;
    }

    return true;
  }

  /**
   * Check if String is undefined, or blank
   * @param {String} text String to be checked if undefined or blank
   * @returns {Boolean}
   */
  emptyOrUndefined(text) {
    if (typeof text == "undefined" || text == "") {
      return true;
    }

    return false;
  }
}

module.exports = new Common();
