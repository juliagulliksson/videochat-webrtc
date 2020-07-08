const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");

const io = socket(server);

const rooms = {};
io.on("connection", (socket: any) => {
  socket.on("join room", (roomID: number) => {
    if (rooms[roomID]) {
      rooms[roomID].push(socket.id);
    } else {
      rooms[roomID] = [socket.id];
    }
    const otherUser = rooms[roomID].find((id: number) => id !== socket.id);
    if (otherUser) {
      socket.emit("other user", otherUser);
      socket.to(otherUser).emit("user joined", socket.id);
    }
  });

  socket.on("offer", (payload: any) => {
    io.to(payload.target).emit("offer", payload);
  });

  socket.on("answer", (payload: any) => {
    io.to(payload.target).emit("answer", payload);
  });

  socket.on("ice-candidate", (incoming: any) => {
    io.to(incoming.target).emit("ice-candidate", incoming.candidate);
  });
});

server.listen(8000, () => console.log("Running on port 8000"));
