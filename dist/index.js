"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_http_1 = require("node:http");
const socket_io_1 = require("socket.io");
const app = (0, express_1.default)();
const server = (0, node_http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:8574",
    },
});
io.on("connection", (socket) => {
    console.log(socket.id);
    socket.on("joined", (roomId) => {
        console.log(roomId);
        socket.join(roomId);
        io.to(roomId).emit("admin", `${socket.id} joined`);
    });
});
app.get("/", (req, res) => {
    res.send("<h1>Yoooooooo</h1>");
});
server.listen(6135, () => {
    console.log("server running at http://localhost:6135");
});
