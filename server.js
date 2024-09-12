const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Create an express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let videoQueue = []; // Store the global queue of videos
let cursors = {}; // Store the cursors of connected users

// Serve the static HTML file
app.use(express.static('public'));

// WebSocket connection handler
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send the current video queue to the newly connected user
    socket.emit('video-queue', videoQueue);

    // Send existing cursors to the new user
    socket.emit('init-cursors', cursors);

    // Listen for new video submissions
    socket.on('new-video', (videoId) => {
        // Add the video to the global queue
        if (videoQueue.length >= 3) {
            videoQueue.shift(); // Remove the oldest video if the queue exceeds 4
        }
        videoQueue.push(videoId);

        // Broadcast the updated queue to all users
        io.emit('video-queue', videoQueue);
    });

    // Listen for mouse move events and update other users
    socket.on('mouse-move', (data) => {
        cursors[socket.id] = { x: data.x, y: data.y };
        socket.broadcast.emit('update-mouse', { id: socket.id, x: data.x, y: data.y });
    });

    // Remove cursor data when the user disconnects
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        delete cursors[socket.id];
        io.emit('remove-cursor', socket.id);
    });

    // Synchronize video play/pause
    socket.on('sync-video-play', (currentTime) => {
        socket.broadcast.emit('play-video', currentTime);
    });

    socket.on('sync-video-pause', () => {
        socket.broadcast.emit('pause-video');
    });
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
