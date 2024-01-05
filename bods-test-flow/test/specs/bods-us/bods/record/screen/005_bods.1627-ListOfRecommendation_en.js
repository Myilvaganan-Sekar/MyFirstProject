const Homepage = require('../../pageobjects/home_page');
const Productpage = require('../../pageobjects/product_page');
const avatarpage = require('../../pageobjects/avatar_page');
const myProfile = require('../../pageobjects/myProfile');

describe("BODS :: Screen", async () => {
  it("recorder :: 1627-ListOfRecommendation_en", async () => {
    await Homepage.open();
    // On Raplauren Home page after handling warning overlay 
    await Homepage.warningOverlay();
    // On Classic Fit Mesh Polo Shirt Product home page After handling warning overlay
    await Productpage.clickpolofitmesh();
    // On Raplauren Home page after handling warning overlay 
    await Homepage.warningOverlay();
    // land on profile page
    await avatarpage.clickbods3D();
    // land on login page
    await avatarpage.clickLoginlink();
    // login with existing account
    await avatarpage.login();
    // wait for avatar to be displayed
    await avatarpage.avatardisplayed();
    // scroll to list of recommendation
    await myProfile.scrolltoListOfRecommendation();
  });

  // ======= IMG_COMP : START =======
  /*
   * This is CORE function to do the image comparison.
   * This script is added automatically every time there is a new version released.
   * You can open the custom scripts for capture options to apply only for current spec.
   * Note: don't modify or remove any script here.
   */
  // ================================
  it("image comparison v1.1.4 :: 1627-ListOfRecommendation_en", async function() {
    const utils = require(process.cwd() + "/utils/utils");

    // CORE (active) :: SKIP SPEC IF WRONG CAPABILITY
    let valid = await utils.checkValidCaps();
    if (!valid) await this.skip();

    // CORE (active) :: CHECK FIREWALL
    await utils.checkFireWall("005_bods.1627-ListOfRecommendation_en");

    /**
     * Custom capture opts. Uncomment and change the value to use it.
     * The global config is set in data.xlsx and is applied by default for all specs.
     * Note: these config may be replaced if there is new version of Utils lib released.
     */

    // await utils.addCaptureOpts("005_bods.1627-ListOfRecommendation_en", "fullPageScrollTimeout", 3000, "web");
    // await utils.addCaptureOpts("005_bods.1627-ListOfRecommendation_en", "ignoreTransparentPixel", true, "web");
    // await utils.addCaptureOpts("005_bods.1627-ListOfRecommendation_en", "ignoreAntialiasing", true, "web");
    // await utils.addCaptureOpts("005_bods.1627-ListOfRecommendation_en", "scaleImagesToSameSize", false, "web");
    // await utils.addCaptureOpts("005_bods.1627-ListOfRecommendation_en", "largeImageThreshold", 100, "web");
    // await utils.addCaptureOpts("005_bods.1627-ListOfRecommendation_en", "disableCSSAnimation", true, "web");
    // await utils.addCaptureOpts("005_bods.1627-ListOfRecommendation_en", "ignoreColors", true, "web");
    // await utils.addCaptureOpts("005_bods.1627-ListOfRecommendation_en", "ignoreAlpha", false, "web");

    // CORE (active) :: IMG COMPARISON STEP
    await utils.imgCompare("bods", "005_bods.1627-ListOfRecommendation_en");

  });
  // ==============================
  // ======= IMG_COMP : END =======

});