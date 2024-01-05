/**
 * main page object containing all methods, selectors and functionality
 * that is shared across all page objects
 */

module.exports = class Page {
    // ========= Constances =========
    // ==============================
    // ========= Common Selectors =========
    get loadingelement(){
      return $('//div[@class="loading-label"]');
    }
    // ========== Common Methods ==========
    async waitForLoadingToDisappear() {
      const loadingElement = await this.loadingelement; 
  
      const startTime = Date.now();
      const timeout = 5000; // 5 seconds
  
      while (Date.now() - startTime < timeout) {
        const isDisplayed = await loadingElement.isDisplayed();
        if (!isDisplayed) {
            return; // Loading element has disappeared
        }
  
          await new Promise(resolve => setTimeout(resolve, 200)); // Wait for 200 milliseconds before checking again
      }
  
      throw new Error('Loading element did not disappear within 5 seconds.');
  }

  async verifyURLContainsText(text) {
    const currentUrl = await browser.getUrl();
    
    if (currentUrl.includes(text)) {
      console.log(`URL contains "${text}"`);
    } else {
      console.log(`URL does not contain "${text}"`);
    }
  }

};