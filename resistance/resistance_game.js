var Player = function(name) {
   this.name = name;
   this.commander = false;
   this.assassin = false;
   
   this.setRole = function(role) {
      this.role = role;
   };
   
   this.setCommander = function() {
      this.commander = true;
   };
   this.isCommander = function() {
      return this.commander;
   }
   this.setAssassin = function() {
      this.assassin = true;
   };
   this.isAssassin = function() {
      return this.assassin;
   };
}

var Game = function(mods) {
   
   /* userList is an array of ndx:<Player>
   where <Player> is a Player object containing all relevant info */
   var userList = [];
   
   var spies = [];
   
   var roundNumber = 0;
   var numSpyWins = 0;
   var numResistanceWins = 0;
   
   var voteCount = 0;
   
   var vote = false;
   var voteYesCount = 0;
   var playersVoted = 0;
   
   /* leader is the index of the player who is the round leader */
   var leader = -1;
   
   var missionVoted = 0;
   var missionPassed = true;
   var numFailed = 0;
   
   

   this.newGame = function() {
      isStarted = true;
      userList = shuffle(userList);
      
      /* ASS MODULE */
      var commanderBase;
      userList[0].setAssassin();
      
      /* This loop walks through the user list and assigns a
         role to each player.
         The spies also get added to a spy array, so they
         can know who each other is
      */
      var i = 0;
      switch(userList.length) {
      case 5:
      case 6:
         for (; i < 2; ++i) {
            spies[i] = userList[i];
            userList[i].setRole('SPY');
         }
         commanderBase = 2;
         for (; i < userList.length; ++i) {
            userList[i].setRole('RESISTANCE');
         }
         break;
      case 7:
      case 8:
      case 9:
         for (; i < 3; ++i) {
            spies[i] = userList[i];
            userList[i].setRole('SPY');
         }
         commanderBase = 3;
         for (; i < userList.length; ++i) {
            userList[i].setRole('RESISTANCE');
         }
         break;
      case 10:
         for (; i < 4; ++i) {
            spies[i] = userList[i];
            userList[i].setRole('SPY');
         }
         commanderBase = 4;
         for (; i < userList.length; ++i) {
            userList[i].setRole('RESISTANCE');
         }
         break;

      default:
         for (; i < userList.length - 1; ++i) {
            userList[i].setRole('SPY');
            spies[i] = userList[i];
         }
         commanderBase = i;
         for (; i < userList.length; ++i) {
            userList[i].setRole('RESISTANCE');
         }
         break;
      }
      
      /* ASS MODULE */
      var commanderNdx = Math.floor(Math.random() * (userList.length - commanderBase)) + commanderBase;
      userList[commanderNdx].setCommander();
      
      // After assigning roles, reshuffle the users so it's not possible
      // to determine who is what role purely based on turn order
      userList = shuffle(userList);
   };
   
   this.nextRound = function() {
      ++roundNumber;
      voteCount = 1;
      
      this.advanceLeader();
      
      return roundNumber > 5;
   };
   
   this.nextVote = function() {
      ++voteCount;
      
      this.advanceLeader();
      
      return voteCount > 5;
   };
   
   this.advanceLeader = function() {
      if (++leader === userList.length)
         leader = 0;
      
      this.verifyState();
   };
   
   /***********************************************************************/
   
   /* For each round and for X players in a game,
   returns the number of agents needed to go on a mission */
   this.getNumberOfAgents = function() {
      switch (userList.length) {
         case 5:
            switch(roundNumber) {
               case 1:
               case 3:
                  return 2;
               case 2:
               case 4:
               case 5:
                  return 3;
               default:
                  break;
            }
            break;
            
         case 6:
            switch(roundNumber) {
               case 1:
                  return 2;
               case 2:
               case 4:
                  return 3;
               case 3:
               case 5:
                  return 4;
               default:
                  break;
            }
            break;
            
         case 7:
            switch(roundNumber) {
               case 1:
                  return 2;
               case 2:
               case 3:
                  return 3;
               case 4:
               case 5:
                  return 4;
               default:
                  break;
            }
            break;

         case 8:
         case 9:
         case 10:
            switch(roundNumber) {
               case 1:
                  return 3;
               case 2:
               case 3:
                  return 4;
               case 4:
               case 5:
                  return 5;
               default:
                  break;
            }
            
         default:
            break;

      }
      
      return 1;
   };
   
   /* Function to verify enough agents are going on a mission */
   this.correctNumberOnTeam = function(num) {
      return this.getNumberOfAgents() === num;
   };
   
   /***********************************************************************/
   
   /* Accepts a vote for the mission team */
   this.teamVote = function(choice) {
      voteYesCount += choice;
      
      if (++playersVoted === userList.length) {
         vote = (voteYesCount >= (userList.length / 2));
         return true;
      }
      
      return false;
   };
   
   this.teamVoteStats = function() {
      return voteYesCount;
   };
   
   /* Returns the result of if a team is accepted */
   this.getVoteResult = function() {
      var result = vote;
      vote = false;
      playersVoted = 0;
      voteYesCount = 0;
      
      this.verifyState();
      
      return result;
   };
   
   /***********************************************************************/
   
   /* Accepts the result of a mission */
   this.mission = function(choice) {
      if (choice === 0) {
         missionPassed = false;
         numFailed++;
      }
      
      if (++missionVoted === this.getNumberOfAgents()) {
         return true;
      }
      
      return false;
   };
   
   this.missionVoteStats = function() {
      return numFailed;
   };
   
   /* Returns the overall result of a mission */
   this.missionResult = function() {
      missionVoted = 0;
      numFailed = 0;
      
      if (missionPassed) {
         ++numResistanceWins;
      } else {
         ++numSpyWins;
      }
      
      // Get the result
      var res = missionPassed;
      // And reset the holder
      missionPassed = true;
      
      this.verifyState();
      
      return res;
   };
   
   /***********************************************************************/
   
   /* Functions related to users */
   this.addUser = function(name) {
      var p = new Player(name);
      userList[userList.length] = p;
   };
   
   this.getUsers = function() {
      return userList;
   };
   
   this.getRole = function(name) {
      var res = "";
      
      userList.forEach(function(val, ndx) {
         if (val.name === name) {
            res = val.role;
         }
      });
      
      return res;
   }
   
   
   
   this.getNumUsers = function() {
      return userList.length;
   };

   this.getNumSpies = function() {
      switch(this.getNumUsers()) {
      case 5:
      case 6:
         return 2;
      case 7:
      case 8:
      case 9:
         return 3;
         break;
      case 10:
         return 4;

      default:
         return this.getNumUsers() - 1;
      }
   };
   
   this.getNumResistance = function() {
      return this.getNumUsers() - this.getNumSpies();
   };
   
   

   
   
   this.getSpies = function() {
      return spies;
   };
   
   this.getResistance = function() {
      var ret = [];
      
      userList.forEach(function(user) {
         if (user.role === 'RESISTANCE')
            ret[ret.length] = user;
      });
      
      return ret;
   };
   
   
   
   this.getRoundLeader = function() {
      return userList[leader].name;
   };
   
   
   this.getRoundNumber = function() {
      return roundNumber;
   };
   
   this.getVoteNumber = function() {
      return voteCount;
   };
   
   
   
   this.getNumSpyWins = function() {
      return numSpyWins;
   }
   
   this.getNumResistanceWins = function() {
      return numResistanceWins;
   }
   
   this.getWinner = function() {
      this.verifyState();
      
      if (numSpyWins === 3)
         return 0;
      if (numResistanceWins === 3)
         return 1;
      
      return -1;
   };
   
   
   /** ASS MODULE */
   
   this.getCommander = function() {
      var ret;
      userList.forEach(function(user) {
         if (user.isCommander())
            ret = user;
      });
      return ret;
   };
   
   this.getAssassin = function() {
      var ret = null;
      userList.forEach(function(user) {
         if (user.isAssassin()) {
            ret = user;
         }
      });
      
      return ret;
   };
   
   this.assassinGuess = function(name) {
      var ret = false;
      userList.forEach(function(user) {
         if (user.name === name) {
            ret = user.isCommander();
         }
      });
      
      return ret;
   };
   
   /** END OF ASS MODULE */
   
   
   this.verifyState = function() {
      if (roundNumber > 5) {
         throw "Round Number too high: " + roundNumber;
      }
      if (numSpyWins > 3) {
         throw "Num Spy Wins is too high: " + numSpyWins;
      }
      if (numResistanceWins > 3) {
         throw "Num Resistance Wins is too high: " + numResistanceWins;
      }
   };
};

module.exports = Game;

var shuffle = function(arr) {
   var currentIndex = arr.length, temporaryValue, randomIndex;
   
   while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      
      // And swap it
      temporaryValue = arr[currentIndex];
      arr[currentIndex] = arr[randomIndex];
      arr[randomIndex] = temporaryValue;
   }
   
   return arr;
};