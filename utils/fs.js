const fsp = require("fs/promises");

const updateFile = async ({ filePath, newData }) => {
    try {
        await fsp.writeFile(filePath, newData);
    } catch (e) {
        console.error("[clearFile]", e);
    }
};

const readFile = async ({ filePath }) => {
    let jsonObjectList;
    try {
        jsonObjectList = await fsp.readFile(filePath, { encoding: 'utf8' });
    } catch (e) {
        jsonObjectList = '';
        console.error("[read Json Main Query (1)][readFile]", e);
    }
    finally {
        return jsonObjectList;
    }
}


const appendNewJsonFile = async ({ userName, listLikeJson, type }) => {
    try {
        await fsp.appendFile(`indexes/${type}_${userName}.json`, listLikeJson);
    } catch (e) {
        console.error("[fs][appendNewJsonFile]", e);
    }
}

const readFile_old = async ({ filePath }) => {
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
    updateFile,
    appendNewJsonFile
}