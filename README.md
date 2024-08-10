<p align="center">
  <a href="https://connectly.eliotatlani.fr/" target="blank"><img src="https://connectly.eliotatlani.fr/assets/logo-CwA4QRG-.png" width="200" alt="Connectly logo" /></a>
</p>

## Description - Connectly Backend

Connectly is live chat web application inspired by WhatsApp. Users can create groups, send messages, and share files to their friends in real-time. 

The Connectly server is built with [ExpressJS](https://expressjs.com/) and [Socket.IO](https://socket.io/). It saves all messages and data into a PostgreSQL database. 

For automation, Ansible and GitHub actions can be used.

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run run
```
## With Docker

```bash
docker compose up --build -d
```
