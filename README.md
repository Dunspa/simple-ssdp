# simple-ssdp

A simple ssdp implementation for discovering UPnP services and devices on Node.js

# Introduction

simple-ssdp supports the discovery of services using the ssdp protocol, according to [UPnP 1.1 specification](http://upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf). It allows to advertise your services on your local network, receive advertisements from other services and *ssdp:alive*/*ssdp:byebye* notifications.

# Installation

```
npm install simple-ssdp
```

# Methods

# Events

# Configuration

# Example

## Advertise and disconnect

When the start method is called, the device advertises all its services on the multicast address. It sends three discovery messages for the root device and one for each added service, all with method NOTIFY and ssdp:alive in the NTS header field. It will also automatically send unicast advertisements each time it receives search messages from other devices.

When the stop method is called, it sends a NOTIFY message with NTS ssdp:byebye indicating other devices that this device is going to leave the network. If a control points receive an ssdp:byebye message of any of the devices or services, it can assume that all are no longer available.

## Discover

When the discover method is called, the device will search for other devices and services on the local network. Other devices can answer to that search message advertising themselves. This can be handled with the following events.