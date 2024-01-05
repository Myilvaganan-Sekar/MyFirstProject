const Homepage = require('../../pageobjects/home_page');
const Productpage = require('../../pageobjects/product_page');

describe("BODS :: Fullpage", async () => {
   it("recorder :: 1627-ProductpagePolo_en", async () => {
    await Homepage.open();
    // On Raplauren Home page after handling warning overlay 
    await Homepage.warningOverlay();
    // On Classic Fit Mesh Polo Shirt Product home page After handling warning overlay
    await Productpage.clickpolofitmesh();
    // On Raplauren Home page after handling warning overlay 
    await Homepage.warningOverlay();
  });

  // ======= IMG_COMP : START =======
  /*
   * This is CORE function to do the image comparison.
   * This script is added automatically every time there is a new version released.
   * You can open the custom scripts for capture options to apply only for current spec.
   * Note: don't modify or remove any script here.
   */
  // ================================
  it("image comparison v1.1.4 :: 1627-ProductpagePolo_en", async function() {
    const utils = require(process.cwd() + "/utils/utils");

    // CORE (active) :: SKIP SPEC IF WRONG CAPABILITY
    let valid = await utils.checkValidCaps();
    if (!valid) await this.skip();

    // CORE (active) :: CHECK FIREWALL
    await utils.checkFireWall("001_bods.1627-ProductpagePolo_en");

    /**
     * Custom capture opts. Uncomment and change the value to use it.
     * The global config is set in data.xlsx and is applied by default for all specs.
     * Note: these config may be replaced if there is new version of Utils lib released.
     */

    // await utils.addCaptureOpts("001_bods.1627-ProductpagePolo_en", "fullPageScrollTimeout", 3000, "web");
    // await utils.addCaptureOpts("001_bods.1627-ProductpagePolo_en", "ignoreTransparentPixel", true, "web");
    // await utils.addCaptureOpts("001_bods.1627-ProductpagePolo_en", "ignoreAntialiasing", true, "web");
    // await utils.addCaptureOpts("001_bods.1627-ProductpagePolo_en", "scaleImagesToSameSize", false, "web");
    // await utils.addCaptureOpts("001_bods.1627-ProductpagePolo_en", "largeImageThreshold", 100, "web");
    // await utils.addCaptureOpts("001_bods.1627-ProductpagePolo_en", "disableCSSAnimation", true, "web");
    // await utils.addCaptureOpts("001_bods.1627-ProductpagePolo_en", "ignoreColors", true, "web");
    // await utils.addCaptureOpts("001_bods.1627-ProductpagePolo_en", "ignoreAlpha", false, "web");

    // CORE (active) :: IMG COMPARISON STEP
    await utils.imgCompare("bods", "001_bods.1627-ProductpagePolo_en");

  });
  // ==============================
  // ======= IMG_COMP : END =======

});