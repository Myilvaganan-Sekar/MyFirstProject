Put the records into the corresponding folder:
  - fullpage: the baseline and actual are captured with full web page from top to bottom.
  - screen: the baseline and actual are captures with the screen of current position.
  - mobile: used for mobile image comparison.
  - Record file name must be unique and following this format: [project_id].[user_story_id]-[case_id]_[localization].js
      Example: bods.001-C001_en.js
                
How to use bods.spec-generation.js?
  - Change the config "spec_generation" in data/data.xlsx to "yes" if you want to enable it.
  - Update the list of pages in data/data.xlsx before generating with:
    - page_id: is unique id
    - domain: website domain
    - handler: path to page
    - status: active, deactive, support or manual
    - flow: the id to match to your flow in bods.spec-generation.js
  - Each spec is generated based on the flows with structure below. Depending on your purpose, you can define flexible custom preStep and addStep for each spec.
    preStep
    await browser.url(link);
    addStep
  - Keep the flow id to be "0" if you want to apply for all pages.
  - Remove spec-generation out of excluded spec in wdio.config