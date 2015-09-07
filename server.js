var Room = require('./Room');

/* Here are the 'node' require statements */
// Express initializes app to be a function handler
// that you can supply to an HTTP server
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

/**********
socket.room -- the player is in
socket.name -- the name of the user
socket.uid -- unique ID of a socket
socket.ai -- whether this is ai or not
**********/

/* Counter to identify client connections (this includes AI) */
var playerUID = 0;

/* room_id is a counter to give each room a unique id */
var room_id = 0;


/* Rooms is a hashmap in the form <roomID>:<Room> */
var rooms = {};



/* Begin definition of socket code */

io.on('connection', function(socket) {
   socket.uid = playerUID++;
   socket.inGame = false;
   socket.ai = false;
   
   /* The first thing the client does is ask the user what their name is */
   socket.on('name', function(name) {
      socket.name = name;
   });
   
   
   /** Create room */
   
   /* When the client wants to create a game, they open a room for others to join */
   socket.on('open_room', function(game_obj) {
      var roomId = room_id++;
      
      var room = new Room(roomId, socket.name, game_obj);
      rooms[roomId] = room;
      
      room.connect(socket);
      socket.room = room
      
      socket.emit('in_room', room.toObject(), true);
   });
   
   
   /** Join room */
   
   /* When the client wants to join a game, they need to see all the open rooms */
   socket.on('get_open_rooms', function() {
      var rms = [];
      
      for (var key in rooms) {
         if (rooms[key].acceptingPlayers()) {
            rms[rms.length] = rooms[key].toObject();
         }
      }
      
      socket.emit('open_rooms', rms);
   });
   
   /* When a client finds a room they want to join */
   socket.on('join_room', function(roomId) {
      var room = rooms[roomId];
      
      // If the room went empty or the owner started the game
      if (room === undefined || !room.acceptingPlayers()) {
         socket.emit('notify', "Room has already closed.  Please choose another");
         return;
      }
      
      var nameExists = room.doesNameExist(socket.name);
      if (nameExists) {
         socket.emit('notify', "Name already in use, can't join this room");
         return;
      }
      
      // When the room has enough people to play but the owner hasn't started the game yet
      if (!room.connect(socket)) {
         socket.emit('notify', 'Room is full. Please choose another');
         return;
      }
      
      socket.room = room;
      
      socket.emit('in_room', room.toObject(), false);
   });
   
   
   /** Leave room */
   
   /* When a client leaves a room. Handles the owner leaving too */
   socket.on('leaving_room', function() {
      socket.room.disconnect(socket);
      
      verifyRoom(socket.room);
      
      socket.room = null;
   });
   
   
   /** Start room */
   
   /* When the game owner wants to start the game */
   socket.on('ready_to_start', function(room_id) {
      var room = rooms[room_id];
      room.verifyAndLaunch();
   });
   
   
   /** Socket disconnect */
   
   /* If the socket closes */
   socket.on('disconnect', function() {
      if (socket.ai) {
         return;
      }
      
      if (socket.inGame === true) {
         socket.room.closeRunningGame();
         
         delete rooms[socket.room.id];
         
         return;
      }
      
      if (socket.room !== undefined && socket.room !== null) {
         socket.room.disconnect(socket);
         
         verifyRoom(socket.room);
      }
   });
   
   
   /* Function to hook AI in correctly */
   socket.on('ai', function(room_id, ai_id) {
      socket.ai = true;
      
      var room = rooms[room_id];
      room.addAI(socket, ai_id);
   });
   
});



/* HELPER FUNCTIONS */

function verifyRoom(room) {
   if (room.isEmpty()) {
      delete rooms[room.id];
   }
};




/** Actually start the server */

// We define a route handler '/' that gets called when we hit the website home
app.get('/', function(req, res) {
   res.sendFile(__dirname + '/index.html');
});
app.get('/index.js', function(req, res) {
   res.sendFile(__dirname + '/index.js');
});

// Sends the client the latest and greatest list of games to play
app.get('/Games.json', function(req, res) {
   res.sendFile(__dirname + '/Games.json');
});

app.get('/resistance.html', function(req, res) {
   res.sendFile(__dirname + '/resistance.html');
});
app.get('/resistance.js', function(req, res) {
   res.sendFile(__dirname + '/resistance.js');
});
app.get('/avalon.html', function(req, res) {
   res.sendFile(__dirname + '/avalon.html');
});
app.get('/avalon.js', function(req, res) {
   res.sendFile(__dirname + '/avalon.js');
});
app.get('/blank.html', function(req, res) {
   res.sendFile(__dirname + '/blank.html');
});
app.get('/blank.js', function(req, res) {
   res.sendFile(__dirname + '/blank.js');
});

/* MultiSelect code */
app.get('/multi_select', function (req, res) {
   res.sendFile(__dirname + '/multi_select/css/multi-select.css');
});
app.get('/multi_select.js', function(req, res) {
   res.sendFile(__dirname + '/multi_select/js/jquery.multi-select.js');
});
app.get('/img/switch.png', function(req, res) {
   res.sendFile(__dirname + '/multi_select/img/switch.png');
});
/* End of MultiSelect code */


// Lastly we listen to port 3000
http.listen(3000, function() {
   console.log('Server started -- Listening on *:3000');
});
