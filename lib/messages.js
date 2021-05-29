/*
MIT License

Copyright (c) 2021 Jose Luis Gallego Peña

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// SSDP address
const config = {
    MULTICAST_ADDRESS: "239.255.255.250",
    MULTICAST_PORT: 1900
}

/**
 * Prepares an M-SEARCH message ready for sending on UDP buffer
 * @param {string} st - Search target 
 * @param {string} host - Optional host name for unicast
 * @param {string} port - Optional port number for unicast
 * @returns - The msearch message
 */
function msearch(st, host = config.MULTICAST_ADDRESS, port = config.MULTICAST_PORT) {
    var msearch = 
        "M-SEARCH * HTTP/1.1\r\n" +
        "HOST: " + host + ":" + port + "\r\n" +
        "MAN: \"ssdp:discover\"\r\n" +
        "MX: 3\r\n" +
        "ST: " + st + "\r\n" +
        "\r\n";

    return msearch;
}

/**
 * Prepares a search response message ready for sending on UDP buffer
 * @param {string} location - URL to description 
 * @param {string} usn - Unique Service Name
 * @param {string} product - Product name 
 * @param {string} product_version - Product version
 * @returns {string} - The response message
 */
function response(location, usn, product, product_version) {
    var delim = usn.indexOf("::");
    var st = usn.substring(delim + 1).trim();

    var response = 
        "HTTP/1.1 200 OK\r\n" +
        "CACHE-CONTROL: max-age = 1800\r\n" +
        "DATE: " + new Date() + "\r\n" +
        "EXT:\r\n" +
        "LOCATION: http://" + location + "\r\n" +
        "SERVER: Node.js/16.2.0 UPnP/1.1 " + product + "/" + product_version + "\r\n" + 
        "ST: " + st + "\r\n" +
        "USN: " + usn + "\r\n" +   
        "\r\n";

    return response;
}

/**
 * Prepares a NOTIFY ssdp:alive message ready for sending on UDP buffer
 * @param {string} location - URL to description
 * @param {string} usn - Unique service name
 * @param {string} product - Product name
 * @param {string} product_version - Product version
 * @returns {string} - The msearch message
 */
function notify_alive(location, usn, product, product_version) {
    var delim = usn.indexOf("::");
    var nt = usn.substring(delim + 1).trim();

    var notify_alive = 
        "NOTIFY * HTTP/1.1\r\n" +
        "HOST: " + config.MULTICAST_ADDRESS + ":" + config.MULTICAST_PORT + "\r\n" +
        "CACHE-CONTROL: max-age = 1800\r\n" +
        "LOCATION: http://" + location + "\r\n" +
        "NT: " + nt + "\r\n" +
        "NTS: ssdp:alive\r\n" +
        "SERVER: Node.js/16.2.0 UPnP/1.1 " + product + "/" + product_version + "\r\n" + 
        "USN: " + usn + "\r\n" +             
        "\r\n";

    return notify_alive;
}

/**
 * Prepares a NOTIFY ssdp:byebye message ready for sending on UDP buffer
 * @param {string} usn - Unique service name
 * @returns {string} - The msearch message
 */
function notify_bye(usn) {
    var notify_bye = 
        "NOTIFY * HTTP/1.1\r\n" +
        "HOST: " + config.MULTICAST_ADDRESS + ":" + config.MULTICAST_PORT + "\r\n" +
        "NT: urn:schemas-upnp-org:service:DiscoveryService:1\r\n" +
        "NTS: ssdp:byebye\r\n" +
        "USN: " + usn + "\r\n" +
        "\r\n";

    return notify_bye;
}

module.exports = { msearch, response, notify_alive, notify_bye, config };