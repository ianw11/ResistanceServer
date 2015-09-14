/********

This object is meant to represent all the requirements/choices a game can
have before starting.  It's all the preconditions that must be met
before playing a game.  The data available is:

   - Required number of players (Max and Min)
   - Modules (expansions) to the game that are available
   - If the game (or even module) allows AI
   - Locations of game files (so the server will automatically make
   them available via get requests)
      - Server file
      - Client files

The GameInfo object operates by ingesting a *_gameinfo.json file with all this
information and then makes it more easily available to the server.

Games.json needs to only point to this *_gameinfo.json file

********/

var GameInfo = function(filename) {
   var data = require('./'+filename);
   
   this.game_name = data.name;
   
   var num_players = data.global.num_players;
   this.max_players = num_players.max === undefined ? -1 : parseInt(num_players.max);
   this.min_players = num_players.min === undefined ?  0 : parseInt(num_players.min);
   
   this.allows_ai = data.global.allows_ai === "true";
   
   this.server_file = data.global.server;
   this.client_files = data.global.clients;
   this.client_file = data.global.client;
   
   this.modules = {};
   var self = this;
   
   data.modules.forEach(function (module) {
      var expansion = init_module(self);
      
      for (var key in module) {
         var val = module[key];
         
         if (key === 'max_players' || key === 'min_players')
            val = parseInt(val);
         if (key === 'allows_ai')
            val = (val === "true");
         
         
         
         expansion[key] = val;
      }
      
      self.modules[module.val] = expansion;
      
   });
   
};

function init_module(self) {
   var ret = {};
   
   ret.max_players = self.max_players;
   ret.min_players = self.min_players;
   
   ret.allows_ai = self.allows_ai;
   
   return ret;
};


GameInfo.prototype.getGameName = function() {
   return this.game_name;
};

/** Module getter methods */

GameInfo.prototype.getModules = function() {
   var ret = {};
   
   for (var val in this.modules) {
      ret[val] = this.modules[val].name;
   }
   
   return ret;
};

GameInfo.prototype.getModuleArray = function() {
   var ret = {};
   
   for (var key in this.modules) {
      ret[key] = false;
   };
   
   return ret;
};

GameInfo.prototype.getModuleInfo = function(module_val) {
   return this.modules[module_val];
};


/** Number of player getter methods */

GameInfo.prototype.getMaxPlayers = function() {
   return this.max_players;
};

GameInfo.prototype.getMinPlayers = function() {
   return this.min_players;
};

GameInfo.prototype.allowsAI = function() {
   return this.allows_ai;
};


/** Game file getter methods */

GameInfo.prototype.getServerCode = function() {
   return this.server_file;
};

GameInfo.prototype.getClientCode = function() {
   return this.client_files;
};

GameInfo.prototype.getClientUrl = function() {
   return this.client_file;
};


/** Extensive getter method */

GameInfo.prototype.toObject = function() {
   return {
      max_players: this.getMaxPlayers(),
      min_players: this.getMinPlayers(),
      allows_ai: this.allowsAI(),
      modules: this.getModules()
   };
};

module.exports = GameInfo;