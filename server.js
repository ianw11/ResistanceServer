var Room = require('./Room');
var Games = require('./Games.json');
var GameInfo = require('./GameInfo');

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


var games = {};
var game_names = [];

// Delimiter to help properly form filenames
var re = null;


/* Begin definition of socket code */

io.on('connection', function(socket) {
   socket.uid = playerUID++;
   socket.inGame = false;
   socket.ai = false;
   
   /* The first thing the client does is ask the user what their name is */
   socket.on('_name', function(name) {
      socket.name = name;
   });
   
   
   /** Create room */
   
   socket.on('_get_game_names', function() {
      socket.emit('_game_names', game_names);
   });
   
   socket.on('_get_game_info', function(game_name) {
      socket.emit('_game_info', games[game_name].toObject());
   });
   
   socket.on('_get_module_info', function(game_name, mod_val) {
      socket.emit('_module_info', games[game_name].getModuleInfo(mod_val));
   });
   
   /* When the client wants to create a game, they open a room for others to join */
   socket.on('_open_room', function(game_obj) {
      
      var roomId = room_id++;
      var room = new Room(roomId, socket.name, game_obj, games[game_obj.baseGame], delim);
      rooms[roomId] = room;
      
      room.connect(socket);
      socket.room = room
      
      socket.emit('_in_room', room.toObject(), true);
   });
   
   
   /** Join room */
   
   /* When the client wants to join a game, they need to see all the open rooms */
   socket.on('_get_open_rooms', function() {
      var rms = [];
      
      for (var key in rooms) {
         if (rooms[key].acceptingPlayers()) {
            rms[rms.length] = rooms[key].toObject();
         }
      }
      
      socket.emit('_open_rooms', rms);
   });
   
   /* When a client finds a room they want to join */
   socket.on('_join_room', function(roomId) {
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
      
      socket.emit('_in_room', room.toObject(), false);
   });
   
   
   /** Leave room */
   
   /* When a client leaves a room. Handles the owner leaving too */
   socket.on('_leaving_room', function() {
      socket.room.disconnect(socket);
      
      verifyRoom(socket.room);
      
      socket.room = null;
   });
   
   
   /** Start room */
   
   /* When the game owner wants to start the game */
   socket.on('_ready_to_start', function(room_id) {
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



function populateGames() {
   
   var server_os = this.process.env.OS;
   delim = '/';
   if (server_os !== undefined && server_os.toString().indexOf("Win") > -1) {
      delim = '\\';
   }
   var re = new RegExp('/', 'g');
      
   
   game_names[0] = '';
   
   Games.games.forEach(function(game_file) {
      var info = new GameInfo(game_file);
      
      // Save the game
      game_names[game_names.length] = info.getGameName();
      games[info.getGameName()] = info;
      
      // Open the server to each client file
      var client = info.getClientCode();
      for (var key in client) {
         var file = client[key];
         file = file.replace(re, delim);
         
         route_obj['/'+key] = file;
      }
   });
};




/** Actually start the server */

var route_obj = {
   '/': 'index.html',
   '/index.js': 'index.js',
   '/favicon.ico': 'favicon.ico'
};

app.get('*', function(req, res) {
   var file = route_obj[req._parsedUrl.pathname]
   res.sendFile(file, {root: __dirname});
});

// Lastly we listen to port 3000
http.listen(3000, function() {
   populateGames();
   console.log('Server started -- Listening on *:3000');
});
