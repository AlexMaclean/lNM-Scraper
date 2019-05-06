const cheerio = require('cheerio');
const fs = require('fs');
const request = require('request');
const prompt = require('./prompt');

const BASE_URL = 'https://www.navcen.uscg.gov';
const RECENT_COUNT = 2;

function getRegionUrl(region) {
    return `${BASE_URL}/?pageName=lnmDistrict&region=${region}`
}

function getPdfUrl(pdf) {
    return BASE_URL + pdf.substr(1)
}

function getFilename(pdf) {
    return pdf.substr(pdf.lastIndexOf('/') + 1)
}

function scrapeForPdfs(url) {
    return new Promise(function (resolve) {
        console.log("Scarping '" + url + "' for LNM PDFs");
        request(url, (error, response, body) => {
            if (error) {
                console.log("...Error encountered: " + error.toString());
                resolve([]);
            }
            if (response.statusCode !== 200) {
                console.log("...Error encountered: " + response.statusCode);
                resolve([]);
            }
            const $ = cheerio.load(body);
            console.log("...Successfully loaded page");

            let links = [];

            $('a[href*="lnm"][href*=".pdf"]:contains("PDF")').each(function (i) {
                const href = $(this).attr("href");
                links[i] = href;
                console.log("...(" + i + ") " + href)
            });
            resolve(links)
        })
    })
}

function filterRecent(paths, count) {
    return paths.sort().reverse().slice(0, count);
}

async function checkDownloaded() {
    let downloaded = [];
    await new Promise(resolve => {
        fs.readdir('.', function (err, items) {
            items.forEach((item) => {
                if (item.endsWith('.pdf')) {
                    downloaded.push(item)
                }
            });
            resolve();
        })
    });
    return downloaded;
}

/**
 * Method to download a pdf from the net using the request library, given a
 * url and a filename to download to. Logs relevant information to the console
 * and does most of the necessary error checking
 *
 * @param url       The url on the internet from which to download the pdf
 * @param filename  The local file to create or overwrite with the contents
 */
function downloadPdf(url, filename) {

    const optionsStart = {
        uri: url,
        encoding: "binary",
        headers: {
            "Content-type": "applcation/pdf"
        }
    };

    console.log("Attempting to download '" + url + "'");

    request(optionsStart, (error, response, body) => {
        if (error) {
            console.log("...Error encountered: " + error.toString());
        } else if (response.statusCode !== 200) {
            console.log("...Error encountered: " + response.statusCode);
        } else {
            console.log("...Successfully connected");
            let writeStream = fs.createWriteStream(filename);
            console.log("...Writing to file '" + writeStream.path + "'");
            writeStream.write(body, 'binary');
            writeStream.on('finish', () => {
                console.log("...All data successfully written");
            });
            writeStream.end();
        }
    });
}

async function main() {
    const region = await prompt();
    const allPaths = await scrapeForPdfs(getRegionUrl(region));
    const recent = filterRecent(allPaths, RECENT_COUNT);
    const downloaded = await checkDownloaded();
    recent.forEach((pdf) => {
        const filename = getFilename(pdf);
        if (!downloaded.includes(filename)) {
            downloadPdf(getPdfUrl(pdf), filename)
        }
    })
}

main();