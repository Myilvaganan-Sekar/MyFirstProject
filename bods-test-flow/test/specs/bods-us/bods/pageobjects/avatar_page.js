const Page = require("./page");

class avatarpage extends Page {
    // ========= Selectors =========
    get bods3DButtonElement(){
        //return $('//a[@class="btn.btn-lg.btn-dark"][text()="BODS 3D Fitting"]');
        return $('.btn.btn-lg.btn-dark');
    }    
    
    get loginElement(){
        return $('//a[text()="Log in"]');
    }

    get emailelement(){
        return $('#filled-hidden-label-small');
    }

    get passwordelement(){
        //return $('//div[contains(@class,"adornedEnd MuiInputBase-hiddenLabel css-k72cy0")]');
        return $('//*[@type="password"]');
    }

    get signinelement(){
        return $('.bods__card__cta');
    }

    get loadingelement(){
        return $('//div[@class="loading-label"]');
    }

    get avatarelement(){
        return $('.bods__avatar video');
    }

    get fitmapelement(){
        return $("//div[contains(@class,'bods__fitmap')]//div");
    }

    get myprofileelelment(){
        return $("//*[contains(@class,'bods__profile')]");
    }

    get cupsizeelement(){
        //return $('//p[text()="Cup Size"]');
        let cupsizeele = "#simple-tabpanel-0 > div > div > div > div > div.sc-tsFYE.dpEMol.MuiBox-root.css-0 > div:nth-child(3) > p.MuiTypography-root.MuiTypography-body1.sc-kYWVYA.iEZYW.css-1iqywp9";    
        return $(cupsizeele);
    }

    get bodsOverlay(){
        return $('(//div[@id="bods-app"]//descendant::div)[2]');
    }

    // ========== Methods ==========
    async clickWithRetry(elementGetter, retryCount = 5, delay = 1000) {
        for (let retry = 0; retry < retryCount; retry++) {
            try {
                const element = await elementGetter();
                const overlay = await this.bodsOverlay;
                await browser.pause(3000);
                await element.waitForDisplayed({ timeout: 30000 });
                await element.waitForClickable({ timeout: 30000 });
                await browser.pause(3000);
                await element.click();
                await browser.waitUntil(async () => await overlay.isDisplayed(), {timeout: 10000});
                console.log('Clicked successfully');
                return; // Exit the loop if click is successful
            } catch (error) {
                console.error(`Attempt ${retry + 1} failed: ${error.message}`);
                await browser.pause(delay); // Wait before retrying
            }
        }
        throw new Error(`Failed to click element after ${retryCount} attempts`);
    }
    
    async clickbods3DWithRetry() {
        await this.clickWithRetry(() => this.bods3DButtonElement);
    }

    async clickbods3D() {
        await this.clickbods3DWithRetry();
    }

    async clickLoginlink(){
        // On Classic Fit Mesh Polo Shirt Bods- will land on login Page
        const loginLink = await this.loginElement;
        await browser.pause(3000);
        await loginLink.waitForDisplayed();
        await loginLink.click();
    }  

    async login() {
        const inputmail = await this.emailelement;
        await inputmail.waitForDisplayed({ timeout: 5000 });
        await inputmail.setValue("test001@bods.me");
    
        const inputPassword = await this.passwordelement;
        await inputPassword.waitForDisplayed({ timeout: 5000 });
        await inputPassword.click();
        await inputPassword.setValue("123456");
        await this.signinelement.click();
    
        const element = await this.loadingelement;
        // Set a custom timeout (in milliseconds)
        const customTimeout = 20000; 

        // Wait for the element to not exist in the DOM within the specified timeout
        const elementExists = await element.waitForExist({ timeout: customTimeout, reverse: true });
    }

    async avatardisplayed(){
        // On Classic Fit Mesh Polo Shirt Bods- 3D Interface
        const avatar = await this.avatarelement;
        await browser.waitUntil(async () => await avatar.isDisplayed(), {timeout: 40000});
        await browser.pause(20000);
    }

    async clickfitmap(){
        const fitmap = await this.fitmapelement;
        await browser.waitUntil(async () => await fitmap.isDisplayed(), {timeout: 40000});
        await fitmap.click();
        const avatar = await this.avatardisplayed();
    }

}     
    module.exports = new avatarpage();