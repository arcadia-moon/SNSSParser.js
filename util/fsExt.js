const fs = require('fs');
var nowOffset = 0;
var endOffset = 0;
function fsExt() {
    this.fd = null;
    this.stats = null;
    nowOffset = 0;
}
module.exports = fsExt;
fsExt.prototype.open = function (path, mode) {
    if (this.fd) {
        this.close();
    }
    nowOffset = 0;
    this.fd = fs.openSync(path, mode);
    this.stats = fs.statSync(path);
    endOffset = this.stats.size;
}
fsExt.prototype.close = function () {
    if (this.fd) {
        fs.closeSync(this.fd);
        this.fd = null;
        this.stats = null;
        nowOffset = 0;
        endOffset = 0;
    }
}

fsExt.prototype.slice = function (start, end) {
    const chunkSize = end - start;
    const buffer = new Buffer(chunkSize);
    fs.readSync(this.fd, buffer, 0, chunkSize, start);
    return buffer;
}

fsExt.prototype.read = function (offset) {
    try {
        if (offset >= endOffset - nowOffset) {
            offset = endOffset - nowOffset;
        }
        const buffer = new Buffer(offset);
        fs.readSync(this.fd, buffer, 0, offset, nowOffset);
        nowOffset += offset;
        return buffer;
    }
    catch (e) {
        console.log(e)
    }
}

fsExt.prototype.getEndOffset = function (offset) {
    return endOffset;
}

fsExt.prototype.stats = function () {
    return this.stats;
}

fsExt.prototype.tell = function () {
    return nowOffset;
}