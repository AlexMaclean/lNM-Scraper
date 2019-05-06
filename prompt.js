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

module.exports = () => {
    return new Promise(async function (resolve) {
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
    })
};