// Importing packages
import express from "express";
import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import { questions } from "./questions";

/**
 * TODO: YOUTHBREAKER
 * - Turn Switching
 * - Question Picking - when turn changes, randomly pick a new question
 * - Question Tracking - using answered object
 * - UI
 */

// Initializing Express server
const app = express();

// Believe this server facilitates the socket.io connections
const server = createServer(app);

type List = {
  [key: string]: {
    roomId: number;
    members: string[];
  };
};

type Turn = {
  [key: number]: {
    member: string;
    index: number;
  };
};

type Answered = {
  [key: number]: {
    roomId: number;
    answered: number[];
  };
};

// List of all members in each room
let list: List = {};
// Keeping track of who's turn it is
let turn: Turn = {};

let answered: Answered = {};

// Initializing Socket.io
const io = new Server(server, {
  // To prevent CORS errors
  cors: {
    origin: "http://localhost:8574",
  },
});

// When a new user hops on
io.on("connection", (socket: Socket) => {
  // Client sends 'joined' message to server. roomId is included in the message
  socket.on("joined", async (roomId) => {
    // When 'joined' message is received
    // Join the right room.
    console.log(roomId);
    socket.join(roomId);
    // Store the room in which the socket is in inside the data property.
    socket.data.roomId = roomId;

    // If the room list doesn't exist, create it
    const allSockets = await io.in(roomId).fetchSockets();

    // If room doesn't exist in the list
    if (!list[roomId]) {
      let ids: string[] = [];
      allSockets.forEach((i) => ids.push(i.id));
      // Making sure roomId exists
      if (roomId) {
        // create the room in the list
        list[roomId] = {
          roomId,
          members: ids,
        };
      }
    } else {
      // otherwise just update room members
      let ids: string[] = [];
      allSockets.forEach((i) => ids.push(i.id));
      list[roomId] = {
        roomId,
        members: ids,
      };
    }
    console.log(list);

    // if you are the first person, you are automatically going first
    if (!turn[roomId] || !turn[roomId].member) {
      turn[roomId] = {
        member: socket.id,
        index: list[roomId].members.findIndex((i) => i === socket.id),
      };
    }

    io.to(roomId).emit("admin", { id: socket.id, turn: turn[roomId] });
    console.log(turn, "turn");
  });
  socket.on("disconnecting", async () => {
    console.log("disconnect");

    // ! since it is disconnecting, it hasn't technically left yet. For some reason
    // ! If you add a promise, that'll give enough time for the socket to leave the room
    // ! After which you can update the list
    await Promise.resolve();
    // When disconnecting, update the members in the room. The socket still exists so the data about roomId that we attached to it
    // still exists
    let ids: string[] = [];
    const allSockets = await io.in(socket.data.roomId).fetchSockets();
    allSockets.forEach((i) => ids.push(i.id));
    if (socket.data.roomId) {
      list[socket.data.roomId] = {
        roomId: socket.data.roomId,
        members: ids,
      };
    }
    // Give someone else the turn
    let newTurn = Math.floor(Math.random() * (allSockets.length - 1));

    console.log(list, "wow");
    turn[socket.data.roomId] = {
      member: list[socket.data.roomId].members[newTurn],
      index: newTurn,
    };

    console.log(turn, "updated turn");

    console.log(list, "updated list");
  });
});

app.get("/", (req, res) => {
  res.send("<h1>Yoooooooo</h1>");
});

server.listen(6135, () => {
  console.log("server running at http://localhost:6135");
});
