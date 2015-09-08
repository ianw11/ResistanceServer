var _ai = require('./resistance_ai');
var _game = require('./resistance_game');

var self = null;

/* Constructor for the server code of the Resistance */
var res_server = function(room, game_info) {
   // Quick fix for scoping issues
   self = this;
   
   this.room = room;
   
   this.mods = game_info.getModuleArray();
   for (var key in room.modules) {
      this.mods[key] = true;
   }
   
};

res_server.prototype.start = function() {
   
   // Setting up variables for the game
   this.game = new _game(this.mods);
   this.connected_ai = [];
   this.sockets = {};
   this.num = 0; // Number of sockets
   this.modules = this.room.modules;
   
   // Spin up enough AI for the game
   var num_ai = this.room.targetPlayers - this.room.numConnectedPlayers;
   while (num_ai > 0) {
      var ndx = this.connected_ai.length;
      this.connected_ai[ndx] = new _ai.AI(ndx, this.game, this.room.id);
      --num_ai;
   }
   
   // Add each socket to the game
   for (var key in this.room.connectedPlayers) {
      var socket = this.room.connectedPlayers[key];
      
      this.game.addUser(socket.name);
      this.sockets[socket.name] = socket;
      this.num++;
      
      self.applyNewSocket(socket);
   };
};

/* Function to add an AI to the game */
res_server.prototype.addAI = function(socket, ai_id) {
   socket.name = self.connected_ai[ai_id].NAME;
   
   self.game.addUser(socket.name);
   self.sockets[socket.name] = socket;
   self.num++;
   
   self.applyNewSocket(socket);
};

/* Deletes all AI */
res_server.prototype.closeAI = function() {
   this.connected_ai.forEach(function(ai) {
      ai.terminate();
   });
};


/* Adds the required 'on' calls to each socket */
res_server.prototype.applyNewSocket = function(socket) {
   
   /* When a user submits a possible team list */
   socket.on('team_list', function(team) {
      if (self.game.correctNumberOnTeam(team.length)) {
         emit('vote_team', team);
         self.team_list = team;
      } else {
         socket.emit('violation', "Wrong number of people on team");
      }
   });
   
   /* When each user votes on if a team should go on a mission */
   socket.on('vote', function(choice) {
      // Submit the current vote.  When everybody has voted, enter the block
      if (self.game.teamVote(choice)) {
         // Tell the chat the result of the vote
         sendGameChat(self.game.teamVoteStats() + " YES votes out of " + self.game.getNumUsers());
         
         // Then tell each client the result of the vote
         var result = self.game.getVoteResult();
         emit('team_vote_result', result, self.team_list);
         if (result) {
            // Inform the clients of the team if successfully voted
            sendGameChat('Mission: ' + self.team_list);
         } else {
            advanceVote();
         }
      }
   });
   
   /* Each member on a mission will PASS or FAIL it */
   socket.on('mission', function(res) {
      // Submit the vote for the current mission.  When everybody has voted, enter the block
      if (self.game.mission(res)) {
         
         var numFails = self.game.missionVoteStats();
         var numAgents = self.game.getNumberOfAgents();
         
         // Tell the chat the results of the mission
         sendGameChat(numFails + ' FAIL votes out of ' + numAgents);
         // Also emit to the AI the exact results of the mission
         emit('AI_mission', numFails, numAgents);
         
         // This line NEEDS to be here because missionResult() needs to be
         // called before getWinner()
         var result = self.game.missionResult();
         
         // Check to see if there is a winner
         var winningTeam = self.game.getWinner();
         if (winningTeam !== -1) {
            victory(winningTeam);
            return;
         }
         
         // If no winner, tell the clients
         
         emit('mission_result', result);
         
         advanceRound();
      }
   });
   
   /**********************/
   
   // To update the client's scores
   socket.on('update_scores', function() {
      socket.emit('updated_scores', self.game.getNumResistanceWins(), self.game.getNumSpyWins());
   });
   
   
   // Share rules of the game
   socket.on('module_rules', function() {
      var text = "";
      
      for (var key in self.modules) {
         if (key === 'ASS')
            text += "The Commander knows the Spies, but the Resistance only wins if the Commander remains undiscovered\nReplace one Resistance and one Spy character card with the Commander and Assassin character cards\n3 Spy wins -> Spies win as usual\n3 Resistance wins -> The Spies have one opportunity to name the Commander.  After discussion, the Assassin names one Resistance player as the Commander.  If it's the commander, the Spies win. Otherwise the Resistance wins";
         if (key === 'FAKE')
            text += "FAKE GAME";
         
         text += '\n\n';
      }
      
      socket.emit('module_rules', text);
   });
   
   
   /** ASS MODULE */
   
   if (self.mods['ASS']) {
      socket.on('assassin_guess', function (name) {
         if (self.game.assassinGuess(name)) {
            finalVictory(0);
         } else {
            finalVictory(1);
         }
      });
   }
   
   // Once all players and AI are setup
   
   if (self.num === self.room.targetPlayers) {
      var mods = [];
      for (var key in self.modules) {
         mods[mods.length] = self.modules[key];
      }
      emit('modules', mods);
      resetGame();
   }
   
};

function resetGame() {
   self.game.newGame();
   
   sendGameChat('# of Resistance: ' + self.game.getNumResistance());
   sendGameChat('# of Spies: ' + self.game.getNumSpies());
   
   for (var key in self.sockets) {
      var socket = self.sockets[key];
      
      var role = self.game.getRole(socket.name);
      if (role === 'SPY') {
         socket.emit('role', key, role, self.game.getSpies());
      } else {
         socket.emit('role', key, role);
      }
   };
   
   if (self.mods['ASS']) {
      var assassin = self.game.getAssassin().name;
      self.sockets[assassin].emit('assassin');
      
      var spies = [];
      self.game.getSpies().forEach(function(player) {
         spies[spies.length] = player.name
      });
      var commander = self.game.getCommander().name;
      self.sockets[commander].emit('commander', spies);
   }
   
   advanceRound();
};

function advanceRound() {
   if (self.game.nextRound()) {
      victory(game.getWinner());
      return;
   }
   
   newLeader();
   emit('updated_scores', self.game.getNumResistanceWins(), self.game.getNumSpyWins());
};

function advanceVote() {
   if (self.game.nextVote()) {
      victory(0);
      return;
   }
   
   newLeader();
};

function newLeader() {
   var leader = self.game.getRoundLeader();
   
   self.sockets[leader].emit('leader', self.game.getUsers(), self.game.getNumberOfAgents());
   emit('curr_leader', leader, self.game.getRoundNumber(), self.game.getVoteNumber());
   
   
   sendGameChat('****************************');
   sendGameChat('New Captain: ' + leader);
   sendGameChat('--------------------------------');
   
};

function victory(team) {
   if (self.mods['ASS'] && team == 1) {
      sendGameChat('--------------------------------');
      sendGameChat('Assassin will now guess who the commander is');
      
      var resistance = [];
      self.game.getResistance().forEach(function(player) {
         resistance[resistance.length] = player.name;
      });
      
      var name = self.game.getAssassin().name;
      
      self.sockets[name].emit('assassin_guess', resistance);
   } else {
      finalVictory(team);
   }
};

function finalVictory(team) {   
   emit('victory', team);
   var users = self.game.getUsers();
   
   sendGameChat('***---***---***---');
   
   var userText = "";
   users.forEach(function(val) {
      userText += val.name + ' is ' + val.role + ' || ';
   });
   
   if (self.mods['ASS']) {
      var commander = self.game.getCommander();
      var assassin = self.game.getAssassin();
      userText += commander.name + ' IS THE COMMANDER  ||  ';
      userText += assassin.name + ' IS THE ASSASSIN';
   }
   
   sendGameChat(userText);
};

function sendGameChat(msg) {
   self.room.sendChatClient('GAME-> ' + msg);
};


function emit(msg, param1, param2, param3) {
   for (var key in self.sockets) {
      var socket = self.sockets[key];
      socket.emit(msg, param1, param2, param3);
   };
};

module.exports = res_server;