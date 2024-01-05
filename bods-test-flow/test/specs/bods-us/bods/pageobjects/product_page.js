const Page = require("./page");

class Productpage extends Page {
    // ========= Selectors =========
    get polofitmeshElement(){
        return $("(//div[@id='home']//descendant::div[@class='col-6 col-lg-4'])[5]");
    }    
 
    // ========== Methods ==========
    async clickpolofitmesh() {
        const polofitmesh = await this.polofitmeshElement;
        await polofitmesh.waitForDisplayed({ timeout: 5000 });   
        await browser.pause(1000); 
        await polofitmesh.click();
    }
 } 
 
 module.exports = new Productpage();