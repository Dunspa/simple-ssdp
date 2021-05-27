# simple-ssdp

A simple ssdp implementation for discovering UPnP services and devices on Node.js

# Introduction

simple-ssdp supports the discovery of services using the ssdp protocol, according to [UPnP 1.1 specification](http://upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf). It allows to advertise your services on your local network, receive advertisements from other services and *ssdp:alive*/*ssdp:byebye* notifications.

# Installation

```
npm install simple-ssdp
```

# Methods

When the start method is called, the device advertises all its services on the multicast address. It sends three discovery messages for the root device and one for each added service, all with method NOTIFY and ssdp:alive in the NTS header field. It will also automatically send unicast advertisements each time it receives search messages from other devices.

When the stop method is called, it sends a NOTIFY message with NTS ssdp:byebye indicating other devices that this device is going to leave the network. If a control points receive an ssdp:byebye message of any of the devices or services, it can assume that all are no longer available.

| Method                     | Description                                                                                                 |
|----------------------------|-------------------------------------------------------------------------------------------------------------|
| start()                    | Starts the simple-ssdp service and allows us to discover, advertise our service and listen to notifications |
| stop(callback)             | Stops the simple-ssdp service so that no more messages are received, then executes the callback             |
| addService(usn)            | Registers a service by its name (usn) for advertising it                                                    |
| discover(st, host, port)   | Sends an M-SEARCH message to discover services and devices on the local network, by default discovers all devices and services available  |
| getNumRegistered()         | Returns the number of all registered services                                                               |
| getALlRegisteredServices() | Returns an array of usn of the registered services                                                          |

When the discover method is called, the device will search for other devices and services on the local network. Other devices can answer to that search message advertising themselves. This can be handled with the following events.

# Events

| Event    | Description                                                                 |
|----------|-----------------------------------------------------------------------------|
| discover | Receive JSON data response for an M-SEARCH discover message                 |
| notify   | Receive JSON NOTIFY message from other services (ssdp:alive or ssdp:byebye) |
| error    | Receive error string                                                        |

# Configuration

Configuration for creating the simple-ssdp object. All are mandatory.
- **device_name**: The name of your device, it will appear on the SSDP messages as part of your USN
- **port**: Port of your service
- **location**: Uri of the service description for your service
- **product**: Name of your application or program, it will appear on the SSDP messages on the SERVER field
- **product_version**: Version of your application or program, it will appear on the SSDP messages on the SERVER field

# Example

```
// Create and configure simpleSSDP object
const simpleSSDP = require ("../index"),
    ssdp = new simpleSSDP({
        device_name: "ExampleDevice",
        port: 8000,
        location: "/xml/description.xml",
        product: "Example",
        product_version: "1.0"
    });

// Register services to advertise
ssdp.addService("urn:schemas-upnp-org:service:ExampleService:1");
ssdp.addService("urn:schemas-upnp-org:service:ExampleService:2");

// Start the advertising of services
ssdp.start();

// Event: service discovered
ssdp.on("discover", (data) => {
    console.log(data);
});

// Event: notification
ssdp.on("notify", (data) => {
    if (data.nts === "ssdp:alive") {
        console.log("Service alive");
    } else if (data.nts === "ssdp:byebye") {
        console.log("Service byebye");
    }
});

// Event: error
ssdp.on("error", (err) => {
    console.log(err);
});

// Discover all services on the local network
ssdp.discover();

// Stop after 5 seconds
setTimeout(() => ssdp.stop(() => {
    console.log("SSDP stopped");
}), 5000);
```