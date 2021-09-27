const fsp = require("fs/promises");

const updateFile = async ({ filePath, newData }) => {
    try {
        await fsp.writeFile(filePath, newData);
    } catch (e) {
        console.error("[clearFile]", e);
    }
};


const readFile = async ({ filePath }) => {
    try {
        let jsonObjectList = await fsp.readFile(filePath, { encoding: 'utf8' });
        jsonObjectList = jsonObjectList.trim();
        const jsonRightScript = "[" + jsonObjectList.replace(/\n/g, ",") + "]";
        return JSON.parse(jsonRightScript);
    } catch (e) {
        console.error("[read Json Main Query (1)][readFile]", e);
    }
}

module.exports = {
    readFile,
    updateFile
}