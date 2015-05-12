var Player = function(name) {
   this.name = name;
   
   this.setRole = function(role) {
      this.role = role;
   };
}

module.exports = {
   
   Game: function() {
      /* userList is an array of ndx:<Player>
      where <Player> is a Player object containing all relevant info */
      var userList = [];
      
      var spies = [];
      var isStarted = false;
      
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
      
      
      console.log('New game object instantiated');
   
      this.newGame = function() {
         isStarted = true;
         
         leader = 0;
         
         userList = shuffle(userList);
         
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
            for (; i < userList.length; ++i) {
               userList[i].setRole('RESISTANCE');
            }
            break;
         case 10:
            for (; i < 4; ++i) {
               spies[i] = userList[i];
               userList[i].setRole('SPY');
            }
            for (; i < userList.length; ++i) {
               userList[i].setRole('RESISTANCE');
            }
            break;

         default:
            for (; i < userList.length - 1; ++i) {
               userList[i].setRole('SPY');
               spies[i] = userList[i];
            }
            for (; i < userList.length; ++i) {
               userList[i].setRole('RESISTANCE');
            }
            break;
         }
         
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
         if (++leader === userList.length) {
            leader = 0;
         }
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
      
      /* Returns the result of if a team is accepted */
      this.getVoteResult = function() {
         var result = vote;
         vote = false;
         playersVoted = 0;
         voteYesCount = 0;
         
         return result;
      };
      
      /***********************************************************************/
      
      /* Accepts the result of a mission */
      this.mission = function(choice) {
         if (choice === 0) {
            missionPassed = false;
         }
         
         if (++missionVoted === this.getNumberOfAgents()) {
            return true;
         }
         
         return false;
      };
      
      /* Returns the overall result of a mission */
      this.missionResult = function() {
         missionVoted = 0;
         
         if (missionPassed) {
            ++numResistanceWins;
         } else {
            ++numSpyWins;
         }
         
         var res = missionPassed;
         missionPassed = true;
         return res;
      };
      
      /***********************************************************************/
      
      /* Functions related to users */
      this.addUser = function(name) {
         var p = new Player(name);
         userList[userList.length] = p;
      };
      
      this.dropUser = function(name) {
         var index = -1;
         userList.forEach(function(val, ndx) {
            if (val.name === name)
               index = ndx;
         });
         //var index = userList.indexOf(name);
         userList.splice(index, 1);
      };
      
      this.getNumUsers = function() {
         return userList.length;
      };

      this.getUsers = function() {
         return userList;
      };

      this.getRole = function(name) {
         userList.forEach(function(val, ndx) {
            if (val.name === name) {
               return val.role;
            }
         });
      }
      
      /*
      this.getRoles = function() {
         return roles;
      };
      */
      
      this.isGameStarted = function() {
         return isStarted;
      };
      
      this.getSpies = function() {
         return spies;
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
         if (numSpyWins === 3)
            return 0;
         if (numResistanceWins === 3)
            return 1;
         
         return -1;
      };
      
      
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
      
   }
   
};

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