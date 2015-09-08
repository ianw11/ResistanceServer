var Room = function(id, owner, game_params, game_info, delimiter) {
   // Signifies if this room is accepting 
   this.accepting = true;
   // Signifies if the game has begun yet
   this.active = false;
   
   this.id = id;
   this.owner = owner;
   
   // Save the game_info for later
   this.game_info = game_info;
   // externalCode is used for the server code later
   this.externalCode = null;
   
   // <playerName>:<Player>
   this.connectedPlayers = {};
   this.numConnectedPlayers = 0;
   
   this.baseGame = game_params.baseGame;
   this.modules = game_params.modules;
   
   this.title = (game_params.title === '' ? this.baseGame : game_params.title);
   
   // If this value is set, it MUST be hit before starting the game
   this.numHumans = parseInt(game_params.numHumans);
   this.targetPlayers = parseInt(game_params.targetPlayers);
   
   // Load the server code for this game
   var url = this.game_info.getServerCode();
   var re = new RegExp('/', 'g');
   url = url.replace(re, delimiter);
   var req = require("./" + url);
   this.externalCode = new req(this, game_info);
   
}

/* Returns if this room should appear in the 'available rooms' list */
Room.prototype.acceptingPlayers = function() {
   return this.accepting;
};

/* Verifys each name is unique (flaw of site but whatever) */
Room.prototype.doesNameExist = function(name) {
   for (var key in this.connectedPlayers) {
      if (name === key)
         return true;
   }
   
   return false;
};

/* When a client wants to connect to this room */
Room.prototype.connect = function(socket) {
   
   if (this.numHumans !== -1 && this.numConnectedPlayers === this.numHumans)
      return false;
   if (this.numConnectedPlayers === this.targetPlayers)
      return false;
   
   var self = this;
   socket.on("chat_message", self.sendChat);
   
   this.connectedPlayers[socket.name] = socket;
   this.numConnectedPlayers++;
   
   this.updateConnections();
   
   return true;
};

/* Updates the userlist in the room */
Room.prototype.updateConnections = function() {
   var sockets = [];
   var names = [];
   
   // Build the list of sockets and names
   for (var key in this.connectedPlayers) {
      var sock = this.connectedPlayers[key];
      sockets[sockets.length] = sock;
      names[names.length] = sock.name;
   }
   
   // Emit the list of names to each socket
   sockets.forEach(function(socket) {
      socket.emit('_player_list_update', names);
   });
};




Room.prototype.verifyAndLaunch = function() {
   
   if (this.numHumans !== -1) {
      // Have enough people joined the game?
      if ( !(this.numConnectedPlayers === this.numHumans) )
         return false;
   }
   
   
   // Perform the launch part
   
   this.accepting = false;
   this.active = true;
   
   var self = this;
   for (var key in this.connectedPlayers) {
      var socket = this.connectedPlayers[key];
      
      socket.inGame = true;
      
      this.ready = 0;
      
      socket.on('ready', function() {
         self.ready++;
         
         if (self.ready === self.numConnectedPlayers) {
            self.kickItOff();
         }
      });
      
      socket.emit('_start_game', self.game_info.getClientUrl());
   };
};

Room.prototype.kickItOff = function() {
   /** Section to reload games **/
   /*
   var toDel = [];
   for (var key in require.cache) {
      if (key.indexOf(this.serverUrl) > -1) {
         toDel[toDel.length] = key;
      }
   }
   toDel.forEach(function(val) {
      delete require.cache[val];
   });
   */
   /** End of section to reload games **/
   
   // Start the server code
   this.externalCode.start();
   
};


Room.prototype.addAI = function(socket, ai_id) {
   this.externalCode.addAI(socket, ai_id);
};

Room.prototype.sendChat = function(msg) {
   // Scope problems
   var that = this.room;
   
   //console.log(that);
   
   for (var socketKey in that.connectedPlayers) {
      var socket = that.connectedPlayers[socketKey];
      socket.emit('chat_message', msg);
   };
};

Room.prototype.sendChatClient = function(msg) {
   for (var socketKey in this.connectedPlayers) {
      var socket = this.connectedPlayers[socketKey];
      socket.emit('chat_message', msg);
   };
};



Room.prototype.closeRunningGame = function() {
   this.kickAll();
   
   this.externalCode.closeAI();
};

/* When a socket disconnects */
Room.prototype.disconnect = function(socket) {
   
   socket.removeListener("chat_message", this.sendChat);
   
   delete this.connectedPlayers[socket.name];
   this.numConnectedPlayers--;
   this.updateConnections();
   
   if (socket.name === this.owner)
      this.kickAll();
   
};

/* If the owner leaves a room, all others need to get kicked */
Room.prototype.kickAll = function() {
   var self = this;
   for (var key in this.connectedPlayers) {
      var socket = this.connectedPlayers[key];
      socket.emit('room_closed', self.active);
      this.disconnect(socket);
   };
};

/* Returns the number of players waiting in a room */
Room.prototype.isEmpty = function() {
   return this.numConnectedPlayers === 0;
};



Room.prototype.toObject = function() {
   
   var mods = [];
   for (var val in this.modules) {
      mods[mods.length] = this.modules[val];
   }
   
   return {owner: this.owner,
           baseGame: this.baseGame,
           modules: mods,
           id: this.id,
           title: this.title,
           numAI: this.targetPlayers - this.numHumans,
           numHumans: this.numHumans,
           inQueue: this.numConnectedPlayers,
           targetPlayers: this.targetPlayers
          };
};

module.exports = Room;