const rp = require('request-promise');
const fs = require('fs');
const $ = require('cheerio');
const request = require('request');

const puppeteer = require('puppeteer');

const url = 'https://arthive.com/artworks/for_sale/type:painting-sort:popular';
const urlss = 'https://arthive.com/artworks/for_sale/type:painting-sort:popular-p:';
const baseurl = 'https://arthive.com/';

const downloadImage = function(uri, filename, callback) {
  request.head(uri, function(err, res, body) {
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

function scapreLinksFromSite(html, uris) {
  const items = $('.works-list__container > .masonry', html)[0].children;
  let filter = items.filter(item => {
    return $('.item-green', item).length === 0;
  });

  filter.forEach(item => {
    let href = $('a', item)[0].attribs.href;
    uris.push(baseurl + href);
  });
}

async function getFiles(page, uris, i) {
  await page.waitFor(10000);
  const html = await page.content();
  scapreLinksFromSite(html, uris);

}

(async () => {
  try {

    const browser = await puppeteer.launch({slowMo: 100});
    const page = await browser.newPage();
    await page.goto(url);
    const uris = [];
    for (let i = 1; i < 200; i++) {
      await getFiles(page, uris, i);
      await page.goto(urlss + i + 1);
      console.log(i);
    }

    await fs.writeFileSync('links.json', JSON.stringify(uris));
    browser.close();
  } catch (error) {
    console.log(error.message);
  }

})();