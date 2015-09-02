var _game = require('./resistance_game');
var game = null;

var names = [];
var sockets = {};


var _ai = require('./ai');
var connected_ai = [];

var numPlayers = -1;

var team_list = null;

var self = this;
this.sendChat = null;

function addAI(socket, ai_id) {
   socket.name = 'Faker ' + (ai_id);
   game.addUser(socket.name);
   sockets[socket.name] = socket;
   names[names.length] = socket.name;
   
   connected_ai[ai_id].NAME = socket.name;
   
   applyNewSocket(socket);
};

function closeAI() {
   connected_ai.forEach(function(ai) {
      ai.terminate();
   });
};

function init_server(socket_arr, room_id, num_ai, totalP, sendChat) {
   self.sendChat = sendChat;
   game = new _game.Game();
   
   numPlayers = totalP;
   
   while (num_ai > 0) {
      connected_ai[connected_ai.length] = new _ai.AI(connected_ai.length, game, room_id);
      
      --num_ai;
   }

   socket_arr.forEach(function(socket) {
      game.addUser(socket.name);
      sockets[socket.name] = socket;
      names[names.length] = socket.name;
      
      applyNewSocket(socket);
   });
   
};

function applyNewSocket(socket) {
   // team_list (submitting the mission team list)
   socket.on('team_list', function(team) {
      
      if (game.correctNumberOnTeam(team.length)) {
         emit('vote_team', team);
         team_list = team;
      } else {
         socket.emit('violation', "Wrong number of people on team");
      }
   });
   
   // vote
   socket.on('vote', function(choice) {
      // Submit the current vote
      if (game.teamVote(choice)) {
         
         sendGameChat(game.teamVoteStats() + " YES votes out of " + game.getNumUsers());
         
         // If everybody has voted, move on to the result analysis
         var result = game.getVoteResult();
         emit('team_vote_result', result, team_list);
         if (result) {
            sendGameChat('Mission: ' + team_list);
         } else {
            advanceVote();
         }
      }
   });
   
   // mission
   socket.on('mission', function(res) {
      // Submit the vote for the current mission
      if (game.mission(res)) {
         
         sendGameChat(game.missionVoteStats() + ' FAIL votes out of ' + game.getNumberOfAgents());
         emit('AI_mission', game.missionVoteStats(), game.getNumberOfAgents());
         
         // Once everybody has voted, get results
         var result = game.missionResult();
         
         var winningTeam = game.getWinner();
         if (winningTeam !== -1) {
            victory(winningTeam);
            return;
         }
         
         emit('mission_result', result);
         
         advanceRound();
      }
   });
   
   /**********************/
   
   // To update the client's scores
   socket.on('update_scores', function() {
      socket.emit('updated_scores', game.getNumResistanceWins(), game.getNumSpyWins());
   });
   
   if (names.length === numPlayers) {
      resetGame();
   }
   
};

function resetGame() {
   game.newGame();
   
   names.forEach(function(name) {
      var socket = sockets[name];
      
      var role = game.getRole(socket.name);
      if (role === 'SPY') {
         socket.emit('role', name, role, game.getSpies());
      } else {
         socket.emit('role', name, role);
      }
   });
   
   advanceRound();
};

function advanceRound() {
   if (game.nextRound()) {
      victory(game.getWinner());
      return;
   }
   
   newLeader();
   emit('updated_scores', game.getNumResistanceWins(), game.getNumSpyWins());
};

function advanceVote() {
   if (game.nextVote()) {
      victory(0);
      return;
   }
   
   newLeader();
};

function newLeader() {
   var leader = game.getRoundLeader();
   
   sockets[leader].emit('leader', game.getUsers(), game.getNumberOfAgents());
   emit('curr_leader', leader, game.getRoundNumber(), game.getVoteNumber());
   
   
   sendGameChat('****************************');
   sendGameChat('New Captain: ' + leader);
   sendGameChat('--------------------------------');
   
};

function victory(team) {
   emit('victory', team);
   var users = game.getUsers();
   
   sendGameChat('***---***---***---');
   
   var userText = "";
   users.forEach(function(val) {
      userText += val.name + ' is ' + val.role + ' || ';
   });
   
   sendGameChat(userText);
};

function sendGameChat(msg) {
   self.sendChat('GAME-> ' + msg);
};


function emit(msg, param1, param2, param3) {
   names.forEach(function(name) {
      //console.log("Emitting " + msg + " to " + name);
      var socket = sockets[name];
      socket.emit(msg, param1, param2, param3);
   });
};

module.exports = {init_server: init_server,
                  addAI: addAI,
                  closeAI: closeAI};