const express = require("express");
const expressWs = require("express-ws");

const app = express();
expressWs(app);
let conn = {}
const TIMEOUT = 10000
app.ws("/ws", (ws, req) => {
  console.log("Client connected");

  // Set up an idle timeout
  let idleTimer = setTimeout(() => {
    console.log("Client idle for too long, kicking...");
    ws.close(4000, "Idle timeout");
  }, TIMEOUT);

  // Helper to reset timer whenever client sends a message
  const resetTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      console.log("Client idle for too long, kicking...");
      ws.close(4000, "Idle timeout");
    }, TIMEOUT);
  };

  ws.on("message", (msg) => {
    const ParsedData = JSON.parse(msg)
    resetTimer()
    if (ParsedData.data.category == "showError") {
      console.log("Error occured for " + ParsedData.user + ":\n" + ParsedData.content)
    }
  });

  ws.on("close", () => {
    clearTimeout(idleTimer)
    console.log("Client disconnected");
  });
});

app.listen(9000, () => console.log("Running on 9000"));