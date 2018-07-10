const FsExt = require('../../fsExt');
var iconv = require('iconv-lite');
let fsExt = new FsExt();
let SNSS_MAGIC = 0x53534E53;

module.exports.parse = function (path) {
    var output = [];
    try {
        fsExt.open(path, 'r');
        let fileMagic = fsExt.read(4).readInt32LE(0);
        if (fileMagic !== SNSS_MAGIC) {
            throw 'Invalid file header!'
        }
        let version = fsExt.read(4).readInt32LE(0);
        while (fsExt.getEndOffset() - fsExt.tell() > 0) {
            let commandSize = fsExt.read(2).readUInt16LE(0);

            if (commandSize == 0) {
                throw "Corrupted File!";
            }

            let idType = fsExt.read(1).readUInt8(0);
            let content = fsExt.read(commandSize - 1);
            output.push({
                idType,
                content
            })
        }
    }
    finally {
        fsExt.close();
    }
    return output
}
Buffer.prototype.readUInt64LE = function (offset) {
    let MAX_UINT32 = 0x00000000FFFFFFFF;
    offset = offset || 0
    let low = this.readUInt32LE(offset)
    let high = this.readUInt32LE(offset + 4)
    return toDouble(high, low, false)

    function toDouble(high, low, signed) {
        if (signed && (high & 0x80000000) !== 0) {
            high = onesComplement(high)
            low = onesComplement(low)
            //console.assert(high < 0x00200000, "number too small")
            return -((high * (MAX_UINT32 + 1)) + low + 1)
        }
        else { //positive
            //console.assert(high < 0x00200000, "number too large")
            return (high * (MAX_UINT32 + 1)) + low
        }
    }
}
function pickle(content) {
    var offset = 0;
    let payloadSize = content.slice(0, offset = 4).readInt32LE(0);
    let payloadStart = content.length - payloadSize;
    function readInt() {
        return content.slice(offset, offset += 4).readInt32LE(0);
    }
    function readString() {
        let length = readInt();
        return content.slice(offset, offset += length).toString();
    }
    function readString16() {
        let length = readInt();
        if (length * 2 > content.length - offset) {
            return ''
        }
        else {
            let stringBuffer = content.slice(offset, offset += (length * 2));
            return iconv.decode(stringBuffer, 'UTF-16').toString();
        }
    }
    return {
        readInt,
        readString,
        readString16
    }
}

module.exports.tab = function (commandList) {
    var output = [];
    let TYPE_DICT = {
        1:
            function CommandUpdateTabNavigation(content) {
                let pickleData = pickle(content);
                let tabId = pickleData.readInt();
                let index = pickleData.readInt();
                let url = pickleData.readString();
                let title = pickleData.readString16();
                return {
                    tabId,
                    index,
                    url,
                    title
                }
            },
        2:
            function CommandRestoredEntry(content) {
                let entryId = content.slice(0, 4).readInt32LE(0);
                return {
                    entryId
                }
            },
        3:
            function CommandWindow(content) {
                let windowId = content.slice(0, 4).readInt32LE(0);
                let selectedTabIndex = content.slice(4, 8).readInt32LE(0);
                let numTab = content.slice(8, 12).readInt32LE(0);
                let timestamp = content.slice(12, 20).readUInt64LE(0);
                return {
                    windowId,
                    selectedTabIndex,
                    numTab,
                    timestamp
                }
            },
        4:
            function CommandSelectedNavigationInTab(content) {
                let tabId = content.slice(0, 4).readInt32LE(0);
                let index = content.slice(4, 8).readInt32LE(0);
                let timestamp = content.slice(8, 16).readUInt64LE(0);
                return {
                    tabId,
                    index,
                    timestamp
                }
            },
        5:
            function CommandPinnedState(content) {
                let pinned = content.slice(0, 1).readInt32LE(0);
                return {
                    pinned
                }
            },
        6:
            function CommandSetExtensionAppID(content) {
                let tabId = pickleData.readInt();
                let appId = pickleData.readString();
                return {
                    tabId,
                    appId
                }
            },
    }

    try {
        for (let commandIndex in commandList) {
            let command = commandList[commandIndex];
            if (TYPE_DICT.hasOwnProperty(command.idType)) {
                let content = command.content;
                let commandClass = TYPE_DICT[command.idType];
                output.push({
                    command: commandClass.name,
                    data: commandClass(content)
                });
            }
        }
    }
    finally {

    }
    return output
}

module.exports.session = function (commandList) {
    var output = [];
    let TYPE_DICT = {
        0:
            function CommandSetTabWindow(content) {
                let windowId = content.slice(0, 4).readUInt32LE(0);
                let tabId = content.slice(4, 8).readUInt32LE(0);
                return {
                    windowId,
                    tabId
                }
            },
        2:
            function CommandSetTabIndexInWindow(content) {
                let tabId = content.slice(0, 4).readInt32LE(0);
                let index = content.slice(4, 8).readInt32LE(0);
                return {
                    tabId,
                    index
                }
            },
        3:
            function CommandTabClosed(content) {
                let tabId = content.slice(0, 4).readUInt32LE(0);
                let timestamp = content.slice(4, 12).readUInt64LE(0);
                return {
                    tabId,
                    closeTime
                }
            },
        4:
            function CommandWindowClosed(content) {
                let tabId = content.slice(0, 1).readUInt8(0);
                let closeTime = content.slice(1, 9).readUInt64LE(0);
                return {
                    tabId,
                    closeTime
                }
            },
        5:
            function CommandTabNavigationPathPrunedFromBack(content) {
                let tabId = content.slice(0, 1).readUInt8(0);
                let index = 0;
                return {
                    tabId,
                    index
                }
            },
        6:
            function CommandUpdateTabNavigation(content) {
                let pickleData = pickle(content);
                let tabId = pickleData.readInt();
                let index = pickleData.readInt();
                let url = pickleData.readString();
                let title = pickleData.readString16();
                //let state = pickleData.readString();
                //let transition = (0xFF & pickleData.readInt());
                return {
                    tabId,
                    index,
                    url,
                    title
                }
            },
        7:
            function CommandSetSelectedNavigationIndex(content) {
                let tabId = content.slice(0, 4).readUInt32LE(0);
                let index = content.slice(4, 8).readUInt32LE(0);
                return {
                    tabId,
                    index
                }
            },
            8:
            function CommandSetSelectedTabInIndex(content) {
                let windowId = content.slice(0, 4).readUInt32LE(0);
                let index = content.slice(4, 8).readUInt32LE(0);
                return {
                    windowId,
                    index
                }
            },
            9:
            function CommandSetWindowType(content) {
                let windowId = content.slice(0, 4).readUInt32LE(0);
                let windowType = content.slice(4, 8).readUInt32LE(0);
                return {
                    windowId,
                    windowType
                }
            },
            11:
            function CommandTabNavigationPathPrunedFromFront(content) {
                let tabId = content.slice(0, 4).readUInt32LE(0);
                let count = content.slice(4, 8).readUInt32LE(0);
                return {
                    tabId,
                    count
                }
            },
            12:
            function CommandSetPinnedState(content) {
                let tabId = content.slice(0, 4).readUInt32LE(0);
                let pinned = content.slice(4, 8).readUInt32LE(0);
                return {
                    tabId,
                    pinned
                }
            },
            13:
            function CommandSetExtensionAppID(content) {
                let pickleData = pickle(content);
                let tabId = pickleData.readInt();
                let appId = pickleData.readString();
                return {
                    tabId,
                    appId
                }
            },
            14:
            function CommandSetWindowBounds3(content) {
                let windowId = content.slice(0, 4).readUInt32LE(0);
                let x = content.slice(4, 8).readInt32LE(0);
                let y = content.slice(8, 12).readInt32LE(0);
                let w = content.slice(12, 16).readInt32LE(0);
                let h = content.slice(16, 20).readInt32LE(0);
                let state = content.slice(20, 24).readInt32LE(0);
                return {
                    windowId,
                    x,
                    y,
                    w,
                    h,
                    state
                }
            },
    }

    try {
        for (let commandIndex in commandList) {
            let command = commandList[commandIndex];
            if (TYPE_DICT.hasOwnProperty(command.idType)) {
                let content = command.content;
                let commandClass = TYPE_DICT[command.idType];
                output.push({
                    command: commandClass.name,
                    data: commandClass(content)
                });
            }
        }
    }
    finally {

    }
    return output
}

