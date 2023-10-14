import express from "express";
import { createServer } from "node:http";
import { Server, Socket } from "socket.io";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:8574",
  },
});

io.on("connection", (socket: Socket) => {
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
