describe("spec-generation", async function() {
  it("generate spec files", async function() {
    const flows = [{
      id: "0",
      preStep: "",
      addStep: "",
    }, ];

    const utils = require(process.cwd() + "/utils/utils");
    await utils.specGeneration(this.test.file, flows, -1, false);
  });
});