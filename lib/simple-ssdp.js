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

const messages = require("./messages"); // SSDP messages

const events = require("events");       // Event handler       
const dgram = require("dgram");         // Communication over UDP
const { v4: uuidv4 } = require("uuid"); // Creation of UUIDs
const ip = require("ip");               // Get local ip

/**
 * Class to handle the discovery of services with SSDP
 */
class simpleSSDP {
    /**
     * @description Constructor
     */
    constructor(config) {
        /**
         * Event handler
         * @type EventEmitter
         */
        this.em = new events.EventEmitter();  

        /**
         * UDP socket for discovering and advertising of the service
         * @type dgram.Socket
         */
        this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

        /**
         * UDP socket for unicast messages (responses)
         * @type dgram.Socket
         */
        this.uniSocket = dgram.createSocket({ type: "udp4", reuseAddr: true });

        /**
         * Number of registered devices
         * @type number
         */
        this.numDevices = 1;

        /**
         * Name of the device
         * @type string
         */
        this.deviceName = config.device_name;

        /**
         * Device UUID
         * @type string
         */
        this.deviceUUID = uuidv4();

        /**
         * Number of registered services
         * @type number
         */
        this.numServices = 0;

        /**
         * Registered services usn
         * @type string[]
         */
        this.services = [];

        /**
         * Address of the services
         * @type string
         */
        this.host = ip.address();

        /**
         * Port of the services
         * @type number
         */
        this.port = config.port;

        /**
         * Location of the service description
         * @type string
         */
        this.location = this.host + ":" + this.port + config.location;

        /**
         * Product name
         * @type string
         */
        this.product = config.product;

        /**
         * Product version
         * @type string
         */
        this.product_version = config.product_version;

        // Bind socket unicast to service port
        this.uniSocket.bind(this.port);
    }

    /**
     * @description Opens the UDP service socket and starts discovering services
     */
    start() {
        // Wait for the socket to be able to receive data
        this.socket.on("listening", () => {
            // Well-known multicast address for SSDP
            this.socket.addMembership(messages.config.MULTICAST_ADDRESS);

            // Three alive messages for the root device
            this.advertise("upnp:rootdevice");
            this.advertise(this.deviceUUID);
            this.advertise("urn:schemas-upnp-org:device:" + this.deviceName + ":1");

            // One alive message for each service
            this.services.forEach((service) => {
                this.advertise(service);
            });
        });

        // Listen to messages and its remote information
        this.socket.on("message", (message, rinfo) => {
            var m = message.toString();
            var ssdp = this.parseSSDP(message, rinfo);

            if (m.includes("M-SEARCH")) {
                // Advertise the service
                if (ssdp.st === "ssdp:all") {
                    // Three response messages for the root device
                    this.response("upnp:rootdevice", ssdp.address, ssdp.port);
                    this.response(this.deviceUUID, ssdp.address, ssdp.port);
                    this.response("urn:schemas-upnp-org:device:" + this.deviceName + ":1", ssdp.address, ssdp.port);

                    // One response message for each service
                    this.services.forEach((service) => {
                        this.response(service, ssdp.address, ssdp.port);
                    });
                } else {
                    this.services.forEach((service) => {
                        this.response(service, ssdp.address, ssdp.port);
                    });
                }
            } else {
                if (m.includes("NOTIFY")) {
                    this.em.emit("notify", ssdp);
                } else {
                    this.em.emit("discover", ssdp);
                }
            }  
        });

        this.socket.on("error", (err) => {
            this.socket.close();
            this.em.emit("error", "Error on UDP multicast socket: " + err);
        });

        this.socket.bind(messages.config.MULTICAST_PORT);
    }

    /**
     * @description Closes the UDP socket and stops sending and receiving SSDP messages
     * @param {callback} usn - Unique service name
     * @param {callback} callback 
     */
    stop(usn, callback) {
        var notify = messages.notify_bye(usn);
        var ssdp = Buffer.alloc(notify.length, notify);

        this.socket.send(ssdp, 0, ssdp.length, messages.config.MULTICAST_PORT, messages.config.MULTICAST_ADDRESS, (err) => {
            if (err) {
                console.log("Error sending ssdp:byebye");
            } else {
                this.socket.close(() => {
                    console.log("UDP socket closed");

                    if (callback && typeof(callback) === "function")
                        callback();
                });
            }
        });
    }

    /**
     * @description Event listener
     * @param {string} eventName - The name of the event
     * @param {callback} callback 
     */
    on(eventName, callback) {
        this.em.on(eventName, (ssdp) => {
            callback(ssdp);
        });
    }

    /**
     * @description Registers a service for advertising
     * @param {string} usn - The service name 
     */
    addService(usn) {
        this.numServices += 1;
        this.services.push(this.deviceUUID + "::" + usn);
    }

    /**
     * @description Sends an M-SEARCH message to discover services
     * @param {string} [st = "ssdp:all"] - The search target
     */
    discover(st = "ssdp:all", host = messages.config.MULTICAST_ADDRESS, port = messages.config.MULTICAST_PORT) {
        var msearch = messages.msearch(st, host, port);
        var ssdp = Buffer.alloc(msearch.length, msearch);

        this.socket.send(ssdp, 0, ssdp.length, port, host, (err) => {
            if (err) {
                this.socket.close();
                this.em.emit("error", "Error on UDP socket for M-SEARCH: " + err);
            }
        });
    }

    /**
     * @description Sends a ssdp:alive notify message
     * @param {string} usn - Unique service name
     */
    advertise(usn) {
        var notify = messages.notify_alive(this.location, usn, this.product, this.product_version);
        var ssdp = Buffer.alloc(notify.length, notify);

        this.socket.send(ssdp, 0, ssdp.length, messages.config.MULTICAST_PORT, messages.config.MULTICAST_ADDRESS, (err) => {
            if (err) {
                this.socket.close();
                this.em.emit("error", "Error sending ssdp:alive");
            }
        });
    }

    /**
     * @description Sends a response message to an m-search
     * @param {string} usn - Unique service name 
     * @param {string} host - Address for the unicast response
     * @param {string} port - Port for the unicast response
     */
    response(usn, host, port) {
        var response = messages.response(this.location, usn, this.product, this.product_version);
        var ssdp = Buffer.alloc(response.length, response);

        this.uniSocket.send(ssdp, 0, ssdp.length, port, host, (err) => {
            if (err) {
                this.uniSocket.close();
                this.em.emit("error", "Error sending response");
            }
        });
    }

    /**
     * @description Parses the SSDP message to JSON
     * @param {Buffer} message - The SSDP raw message buffer
     * @param {dgram.RemoteInfo} rinfo - UDP remote information
     * @returns {json} - The SSDP message in JSON
     */
    parseSSDP(message, rinfo) {
        var lines = message.toString().split("\r\n");
        var ssdp = {};

        lines.forEach((line) => {
            // Separate key:value
            var delim = line.indexOf(":");
            if (delim > 1) {
                var key = line.substring(0, delim).trim().toLowerCase();
                var value = line.substring(delim + 1).trim();
                ssdp[key] = value;
            }
        });

        Object.keys(rinfo).forEach((key) => {
            ssdp[key] = rinfo[key];
        });

        return ssdp;
    }

    /**
     * @description Get the number of registered services
     * @returns {number} - Number of registered services
     */
    getNumRegistered() {
        return this.numServices;
    }

    /**
     * @description Get all the services that are advertised
     * @returns {string[]} - Registered services
     */
    getAllRegisteredServices() {
        return this.services;
    }
}

module.exports = simpleSSDP;