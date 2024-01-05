const Page = require("./page");
const AvatarPage = require('./avatar_page');

class myprofile extends Page {
    // ========= Selectors =========

    get myprofileelelment(){
        return $("//*[contains(@class,'bods__profile')]");
    }

    get cupsizeelement(){
        //return $('//p[text()="Cup Size"]');
        //let cupsizeele = "#simple-tabpanel-0 > div > div > div > div > div.sc-tsFYE.dpEMol.MuiBox-root.css-0 > div:nth-child(3) > p.MuiTypography-root.MuiTypography-body1.sc-kYWVYA.iEZYW.css-1iqywp9";    
        return $('(//*[@id="simple-tabpanel-0"]//descendant::p)[8]');
    }

    get dropdowncupelement(){
        return $('//p[text()="Cup Size"]//parent::div//descendant::select');
    }

    get cupBelement(){
        return $('(//p[text()="Cup Size"]//parent::div//descendant::select//option)[4]');
    }

    get cupCelement(){
        return $('(//p[text()="Cup Size"]//parent::div//descendant::select//option)[5]');
    }

    get measurment(){
        return $("//button[contains(@class,'bods__link-measurements')]");
    }

    get myinformation(){
        return $('#simple-tab-1');
    }

    get logoutelement(){
        return $('//button[contains(@class,"bods__button bods__button")]');
    }

    get recommendationelement(){
        return $('(//div[contains(@class,"bods__product-list")])[2]');
    }

    get pantelement(){
        return $('#bods__related-product-item--1');
    }

    // ========== Methods ==========
    async clickMyprofile(){
        const myprofile = await this.myprofileelelment;
        await browser.waitUntil(async () => await myprofile.isDisplayed(), {timeout: 40000});
        await myprofile.click();
    }

    async scrolltocupsize(){
        const cupsize = await this.cupsizeelement;
        await browser.waitUntil(async () => await cupsize.isDisplayed(), {timeout: 40000});
        await cupsize.scrollIntoView();
        await browser.pause(2000);
    }  
    
    // Cup size B to C
    async toggleDropdownValueC() {
        const dropdown = await this.dropdowncupelement;
        await dropdown.scrollIntoView();
        const cupB = await this.cupBelement;
        
        // Get the current value
        const currentValue = await cupB.getText();
        // Click the dropdown to switch to the desired value
        if (currentValue === 'B') {
            await dropdown.click();
            const optionC = await this.cupCelement;
            await browser.pause(2000);
            await optionC.click();
            await browser.pause(1000);
        } 
    }
 
    // Cup size C to B
    async toggleDropdownValueB() {
        const dropdown = await this.dropdowncupelement;
        await dropdown.scrollIntoView();
        const cupC = await this.cupCelement;
        // Get the current value
        const currentValue = await cupC.getText();
        
        // Click the dropdown to switch to the desired value
        if (currentValue === 'C') {
            await dropdown.click();
            const optionB = await this.cupBelement;
            await browser.pause(2000);
            await optionB.click();
            await browser.pause(2000);
        } 
    }   

    async scrolltomeasurment(){
        const measurementlink = await this.measurment;
        await browser.waitUntil(async () => await measurementlink.isDisplayed(), {timeout: 4000});
        await measurementlink.scrollIntoView();
        await browser.pause(2000);
    }

    async clickMyInformation(){
        const information = await this.myinformation;
        await browser.waitUntil(async () => await information.isDisplayed(), {timeout: 4000});
        await information.click();
        await browser.pause(1000);
    }

    async clickLogout(){
        const logout = await this.logoutelement;
        await browser.waitUntil(async () => await logout.isDisplayed(), {timeout: 4000});
        await logout.click();
        await expect
    }

    async scrolltoListOfRecommendation(){
        const list = await this.recommendationelement;
        await browser.waitUntil(async () => await list.isDisplayed(), {timeout: 4000});
        await list.scrollIntoView();
        await browser.pause(2000);
    }  

    async clickPant(){
        const pant = await this.pantelement;
        await browser.waitUntil(async () => await pant.isDisplayed(), {timeout: 40000});
        await pant.click();
    }
}     
module.exports = new myprofile();