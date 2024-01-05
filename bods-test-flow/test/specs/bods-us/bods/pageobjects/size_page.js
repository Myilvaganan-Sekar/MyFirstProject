const Page = require("./page");

class Sizepage extends Page {
    // ========= Selectors =========
    get sizeElement(){
        return $("//select[contains(@class,'input MuiInput-input')]");
    }    

    get listofsizeselement(){
        return $$('//select[contains(@class,"input MuiInput-input")]//option');
    }
    
    get nextsizelement(){
        return $('//select[contains(@class,"input MuiInput-input")]//option)[5]');
    }
    // ========== Methods ==========

    async clicksizedropdown() {
        const sizelist = await this.sizeElement;
        await sizelist.waitForDisplayed({ timeout: 5000 });   
        await browser.pause(1000); 
        await sizelist.click();
    }

    async getDropdownOptions() {
    const listofsizes = await this.listofsizeselement;

    let defaultSize;
    let availableSizeCount = 1;

    for (let i = 0; i < listofsizes.length; i++) {
        const listofsize = listofsizes[i];
        const value = await listofsize.getText();
        const isEnabled = !(await listofsize.getAttribute('disabled'));

        if (value.trim() !== '' && isEnabled) {
            if (!defaultSize) {
                defaultSize = value;
                console.log(`Default size: ${defaultSize}`);
            } else {
                console.log(`Available size ${availableSizeCount}: ${value}`);
                availableSizeCount++;
            }
        }
    }
    }
    
    async clickNextAvailableSize() {
        const listofsizes = await this.listofsizeselement; // Make sure this is correctly defined
    
        let availableSizeCount = 0;
        let selectedIndex = -1;
    
        for (let i = 0; i < listofsizes.length; i++) {
            const listofsize = listofsizes[i];
            const value = await listofsize.getText();
            const isEnabled = !(await listofsize.getAttribute('disabled'));
    
            if (value.trim() !== '' && isEnabled) {
                availableSizeCount++;
    
                if (selectedIndex === -1) {
                    selectedIndex = i;
                }
            }
        }
    
        if (availableSizeCount > 0) {
            const startIndex = (selectedIndex + 1) % listofsizes.length;
            let nextIndex = startIndex;
    
            do {
                const nextSizeOption = listofsizes[nextIndex];
                const isEnabled = !(await nextSizeOption.getAttribute('disabled'));
    
                if (isEnabled) {
                    const nextSize = await nextSizeOption.getText();
                    // Here, perform the action to actually select the next size, e.g., click the option
                    await nextSizeOption.click();
                    await browser.pause(2000);
                    await super.waitForLoadingToDisappear();
                    console.log(`Selected size: ${nextSize}`);
                    break;
                }
    
                nextIndex = (nextIndex + 1) % listofsizes.length;
            } while (nextIndex !== startIndex);
        } else {
            console.log('No available sizes.');
        }
    }   
} 
 
module.exports = new Sizepage();