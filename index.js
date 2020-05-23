const rp = require('request-promise');
const fs = require('fs');
const $ = require('cheerio');
const request = require('request');
const puppeteer = require('puppeteer');

const url = 'https://arthive.com/artworks/for_sale/type:painting-sort:popular';
const urlss = 'https://arthive.com/artworks/for_sale/type:painting-sort:popular-p:';
const baseurl = 'https://arthive.com';

const downloadImage = function (uri, filename, callback) {
    request.head(uri, function (err, res, body) {
        console.log('content-type:', res.headers['content-type']);
        console.log('content-length:', res.headers['content-length']);

        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

function scapreLinksFromSite(html) {
    const items = $('.works-list__container > .masonry', html)[0].children;
    let filter = items.filter(item => {
        return $('.item-green', item).length === 0;
    });


    const urls = filter.map(item => baseurl + $('a', item)[0].attribs.href);
    // console.log(urls.map(i => i.split('/').slice(-1)[0]));
    return urls;
}

async function getFiles(page, uris, i) {
    await page.waitForSelector('.works-list__container');
    await page.waitForSelector('.item');
    // await autoScroll(page);
    const html = await page.content();
    let scapreLinksFromSite1 = scapreLinksFromSite(html);
    console.log(`${i}: scrapped  ${scapreLinksFromSite1.length}`)
    uris.push(scapreLinksFromSite1);
}

(async () => {
    try {
        const browser = await puppeteer.launch({});
        let uris = [];
        let page;
        for (let i = 1; i < 1201; i++) {
            page = await browser.newPage();
            await page.setViewport({width: 1366, height: 768});
            await page.goto(urlss + (i));
            await getFiles(page, uris, i);
            await page.close();

            let number = 300;
            if (i % number === 0) {
                console.log(`Creating file number ${i/number}`);
                await fs.writeFileSync(`links${~~(i / number)}.json`, JSON.stringify(uris.flat()));
                uris = []
            }
        }

        browser.close();
    } catch (error) {
        console.log(error.message);
    }

})();

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}