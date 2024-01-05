const Page = require("./page");

class Homepage extends Page {
   // ========= Selectors =========
   get warningCloseicon(){
       return $('//button[@class="close"]');
   }    

   // ========== Methods ==========
   open(){
    return browser.url('https://ralphlauren.feature.dev.bods.me/');
   }
   async warningOverlay() {
   await browser.pause(1000);
   const warningCloseicon = await this.warningCloseicon;
   await warningCloseicon.waitForDisplayed({ timeout: 5000 });   
   await browser.pause(1000); 
   await this.warningCloseicon.click();
   }
} 

module.exports = new Homepage();