const readline = require('readline');

const stdio = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const promptRegion = () => {
    return new Promise((resolve) => {
        stdio.question('Which region would you like the LNM for? ', (answer) => {
            resolve(answer)
        })
    })
};

/**
 * Prompts the user for a region, if the input is clearly invalid,
 * such as not an int or negative the user is asked again for region.
 *
 * @param resolve  Used to return the integer from the Promise
 */
async function prompt(resolve) {
    while (true) {
        const answer = await promptRegion();
        const region = parseInt(answer);
        if (isNaN(region) || region <= 0) {
            stdio.write(`Invalid district '${answer}'\n`)
        } else {
            stdio.close();
            resolve(region);
            break;
        }
    }
}

module.exports = () => {
    return new Promise(prompt);
};