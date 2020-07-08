const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
import { SocketEvent } from "./constants";
import { Payload, Incoming } from "./types";

const io = socket(server);
interface Room {
  [key: number]: number[];
}

const rooms: Room = {};

io.on(SocketEvent.CONNECTION, (socket: any) => {
  console.log("New client connected");

  socket.on(SocketEvent.JOIN_ROOM, (roomID: number) => {
    if (rooms[roomID]) {
      rooms[roomID].push(socket.id);
    } else {
      rooms[roomID] = [socket.id];
    }
    console.log(socket.id, "SOCKET ID");

    const otherUser = rooms[roomID].find((id: number) => id !== socket.id);
    if (otherUser) {
      socket.emit(SocketEvent.OTHER_USER, otherUser);
      socket.to(otherUser).emit(SocketEvent.USER_JOINED, socket.id);
    }
  });

  socket.on(SocketEvent.OFFER, (payload: Payload) => {
    io.to(payload.target).emit(SocketEvent.OFFER, payload);
  });

  socket.on(SocketEvent.ANSWER, (payload: Payload) => {
    io.to(payload.target).emit(SocketEvent.ANSWER, payload);
  });

  socket.on(SocketEvent.ICE_CANDIDATE, (incoming: Incoming) => {
    io.to(incoming.target).emit(SocketEvent.ICE_CANDIDATE, incoming.candidate);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

server.listen(8000, () => console.log("Running on port 8000"));
