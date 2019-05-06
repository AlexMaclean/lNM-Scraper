const cheerio = require('cheerio');
const fs = require('fs');
const request = require('request');
const prompt = require('./prompt');

const BASE_URL = 'https://www.navcen.uscg.gov';
const RECENT_COUNT = 2;
const CLEAN = false;

function getRegionUrl(region) {
    return `${BASE_URL}/?pageName=lnmDistrict&region=${region}`
}

function getPdfUrl(pdf) {
    return BASE_URL + pdf.substr(1)
}

function getFilename(pdf) {
    return pdf.substr(pdf.lastIndexOf('/') + 1)
}

/**
 * Opens a request to the page containing all the LNM PDF file links for
 * a given region. Scrapes through the page for the hrefs of the valid
 * PDF links.
 *
 * @param url  Address of the region page to open
 * @returns {Promise<Array>} A possibly empty array of all the pdf hrefs found
 */
function scrapeForPdfs(url) {
    return new Promise(function (resolve) {
        console.log(`Scarping '${url}' for LNM PDFs`);
        request(url, (error, response, body) => {
            if (error) {
                console.log(`...Error encountered: ${error.toString()}`);
                resolve([]);
            }
            if (response.statusCode !== 200) {
                console.log(`...Error encountered: ${response.statusCode}`);
                resolve([]);
            }
            const $ = cheerio.load(body);
            console.log(`...Successfully loaded page`);

            let links = [];

            $('a[href*="lnm"][href*=".pdf"]:contains("PDF")').each(function (i) {
                const href = $(this).attr('href');
                links[i] = href;
                console.log(`...(${i}) ${href}`)
            });
            resolve(links)
        })
    })
}

/**
 * Given a list of all the PDF files found, filters it down to only the
 * most recent n. Because of the format of the pdf filenames this is very simple
 * and can be accomplished just by a lexicographical sort.
 *
 * @param paths  All the paths to pdf files found on the region page
 * @param count  The top count to return, the rest are discarded
 * @returns {Uint16Array}  An array of the most recent elements to download
 */
function filterRecent(paths, count) {
    const recent = paths.sort().reverse().slice(0, count);
    console.log(`Querying the ${count} most recent LNMs`);
    recent.forEach((pdf) => {
        console.log(`...${pdf}`);
    });
    return recent;
}

/**
 * Opens the current working directory and filters all the PDF files
 * found inside. Used to ensure a file is not downloaded too many times
 *
 * @returns {Promise<Array>} A list of strings representing filenames
 */
async function alreadyDownloaded() {
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
 * Checks to determine if a given file should be downloaded based on
 * whether it already exists and clean mode is enabled
 *
 * @param filename    The file which could potentially be downloaded
 * @param downloaded  Array of files that have already been downloaded
 * @returns {boolean} Indicating whether the file should be downloaded
 */
function shouldDownload(filename, downloaded) {
    if (!CLEAN && downloaded.includes(filename)) {
        console.log(`[${filename}] already found, not re-downloading`);
        return false;
    }
    return true;
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
        encoding: 'binary',
        headers: {
            'Content-type': 'applcation/pdf'
        }
    };

    console.log(`[${filename}] Downloading from '${url}'`);

    request(optionsStart, (error, response, body) => {
        if (error) {
            console.log(`...[${filename}] Error encountered: ${error.toString()}`);
        } else if (response.statusCode !== 200) {
            console.log(`...[${filename}] Error encountered: ${response.statusCode}`);
        } else {
            console.log(`...[${filename}] Successfully connected`);
            let writeStream = fs.createWriteStream(filename);
            console.log(`...[${filename}] Writing to file`);
            writeStream.write(body, 'binary');
            writeStream.on('finish', () => {
                console.log(`...[${filename}] All data successfully written`);
            });
            writeStream.end();
        }
    });
}

async function main() {
    const region = await prompt();
    const allPaths = await scrapeForPdfs(getRegionUrl(region));
    const recent = filterRecent(allPaths, RECENT_COUNT);
    const downloaded = await alreadyDownloaded();
    recent.forEach((pdf) => {
        const filename = getFilename(pdf);
        if (shouldDownload(filename, downloaded)) {
            downloadPdf(getPdfUrl(pdf), filename)
        }
    })
}

main();