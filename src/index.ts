// Importing packages
import express from "express";
import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import { questions } from "./questions";
// import cors from "cors";

// Initializing Express server
const app = express();

// app.use(cors({
//   origin: []
// }))

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

type Question = {
  [key: number]: {
    roomId: number;
    question: number;
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

let currentQuestion: Question = {};

let answered: Answered = {};

// Initializing Socket.io
const io = new Server(server, {
  // To prevent CORS errors
  cors: {
    origin: ["https://youthbreaker.vercel.app", "http://localhost:8574"],
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

      currentQuestion[roomId] = {
        roomId,
        question: Math.floor(Math.random() * (questions.length - 1)),
      };
    }

    io.to(roomId).emit("admin", {
      id: socket.id,
      turn: turn[roomId],
      question: questions[currentQuestion[roomId].question],
    });
    console.log(turn, "turn");

    io.emit("list", list);
    io.emit("who", turn);
  });

  // When switching turns
  socket.on("turn", (roomId) => {
    console.log("switch");

    // If there is more than one member
    if (list[roomId].members.length > 1) {
      // if the answered array exists
      if (answered[roomId]) {
        // add the question to the answered array
        answered[roomId] = {
          roomId,
          answered: [
            ...answered[roomId].answered,
            currentQuestion[roomId].question,
          ],
        };
      } else {
        // otherwise initialize answered array
        answered[roomId] = {
          roomId,
          answered: [currentQuestion[roomId].question],
        };
      }

      // list of available questions
      let available: number[] = [];

      // filter out all available questions
      questions.forEach((_, index) => {
        if (!answered[roomId].answered.includes(index)) {
          available.push(index);
        }
      });

      // choose a random question from that list to be our new question
      currentQuestion[roomId] = {
        roomId,
        question: available[Math.floor(Math.random() * (available.length - 1))],
      };

      // If it's the last person in line
      if (turn[roomId].index === list[roomId].members.length - 1) {
        // Go back to the beginning of the list
        turn[roomId] = {
          member: list[roomId].members[0],
          index: 0,
        };

        // ! There are some inconsistencies with roomId. Either have roomId be all string or all number but here we have it mixed
        // ! Just too lazy to fix it
        io.to(`${roomId}`).emit("switch", {
          turn: turn[roomId],
          question: questions[currentQuestion[roomId].question],
        });
        console.log(turn[roomId], "yes");
      } else {
        // Otherwise go to the next person
        turn[socket.data.roomId] = {
          member: list[roomId].members[turn[roomId].index + 1],
          index: turn[roomId].index + 1,
        };
        io.to(`${roomId}`).emit("switch", {
          turn: turn[roomId],
          question: questions[currentQuestion[roomId].question],
        });
        console.log(turn[roomId], "yes");
      }
      io.emit("who", turn);
    }
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

    // if there is no one in the room, delete the turn and current question
    if (
      !list[socket.data.roomId] ||
      list[socket.data.roomId].members.length === 0
    ) {
      delete turn[socket.data.roomId];
      delete currentQuestion[socket.data.roomId];
      delete answered[socket.data.roomId];
    } else {
      // otherwise give the turn to someone else
      turn[socket.data.roomId] = {
        member: list[socket.data.roomId].members[newTurn],
        index: newTurn,
      };
    }

    io.emit("list", list);
    io.emit("who", turn);

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
