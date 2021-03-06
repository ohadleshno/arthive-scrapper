const rp = require("request-promise");
const fs = require("fs");
const $ = require("cheerio");
const request = require("request");

const puppeteer = require("puppeteer");

const downloadImage = function (uri, filename) {
  return request.head(uri, function (err, res, body) {
    request(uri).pipe(fs.createWriteStream(`./images/${filename}.webp`));
  });
};

const parseProps = (propertiesElements) => {
  const props = {};
  propertiesElements
    .filter((i) => i.name)
    .forEach((item) => {
      if (item.children.length !== 1) {
        let key = item.children[0].data;
        props[key] = item.children
          .slice(1)
          .filter((i) => i.name)
          .map((i) => i.children[0].data)
          .join(" ");
      } else {
        const stolen = item.children[0].data.split(":");
        props[stolen[0]] = stolen[1];
      }
    });
  return props;
};

async function download_image(browser, link,picNumber) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto(link);
  const html = await page.content();

  const workName = $("#id_work_name", html)[0]
    .children[0].data.replace(/([^a-zA-Z0-9\s])/gm, "")
    .split(" ")
    .join("-");
  const artistName = $(".link-dark.c_artist_popup_link", html)[0].children[0]
    .data.replace(/([^a-zA-Z0-9\s])/gm, "")
    .split(" ")
    .join("-");
  const price = $(".item-cost", html)[0].children[0].data.slice(1);
  let $cImg = $(
    ".artwork-info-slider.susy-lg-8.susy-md-6.susy-sm-4.susy-xs-2",
    html
  ).find("img");
  if ($cImg.length > 1) {
    console.log("There is more than one photo for " + workName);
  }
  const imageLink = $cImg[0].attribs.src;
  const properties = parseProps(
    $(".artwork-option__description", html)[0].children
  );
  console.log("downloading photo " + workName);
  let workNameAsFileName = `${artistName}--${workName}--${picNumber}`;
  await downloadImage(imageLink, workNameAsFileName);
  await page.close();

  return {
    workName,
    artistName,
    price,
    imageLink,
    properties,
    path: `images/${workNameAsFileName}.webp`,
  };
}

const appendDataToFile = (appendData, fileName) => {
  return fs.readFile(fileName, async function (err, data) {
    const json = JSON.parse(data);
    const dataTero = [...json,...appendData];
    await fs.writeFile(fileName, JSON.stringify(dataTero), function (
      err,
      result
    ) {
      err && console.log("error", err);
    });
  });
};

(async () => {
  try {
    const browser = await puppeteer.launch();
    let artData = [];
    let picNumber= 0;
    let errorlinks = [];
    const someObject = require("./links4.json");
    let numberOfLinks = someObject.length;
    let numberOfLinksRead = 0;

    console.log(numberOfLinks);
    for (const link of someObject) {
      numberOfLinksRead++;
      try {
        const art = await download_image(browser, link,picNumber);
        picNumber++;
        artData.push(art);
      } catch (e) {
        console.log(e);
        errorlinks.push(link);
      }

      if (numberOfLinksRead === 50) {
        console.log("---------Writing to file---------");
        await appendDataToFile(artData, "imagesInfo.json");
        await appendDataToFile(errorlinks, "errorlinks.json");
        numberOfLinksRead = 0;
        artData = [];
        errorlinks = [];
      }
    }

    appendDataToFile(artData);
    browser.close();
    console.log("-------Finish-------");
  } catch (error) {
    console.log(error.message);
  }
})();
