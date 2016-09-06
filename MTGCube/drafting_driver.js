var FILE = "cube.txt";
var fs = require('fs');

var Player = function(name) {
   this.name = name;
   
   this.unopenedPacks = [];
   this.pendingPack = null;
   this.currentPack = null;
   this.picks = [];
   
   this.receivePack = function(pack) {
      this.pendingPack = pack;
   };
   
   this.hasUnopenedPack = function() {
      return this.unopenedPacks.length > 0;
   };
   
   this.getPack = function(cardname) {
      if (!this.hasUnopenedPack()) {
         return null;
      }
      if (this.currentPack == null || this.currentPack.length == 0) {
         this.currentPack = this.unopenedPacks.pop();
      }
      
      return this.currentPack;
   };
   
   this.chooseCard = function(cardname) {
      for (var ndx in this.currentPack) {
         var card = this.currentPack[ndx];
         if (card.name === cardname) {
            console.log(this.name + " has picked " + card.name);
            this.picks.push(card);
         }
      }
   };
};

var Drafter = function(cube_file, oracle_file, playerList) {
   
   this.players = [];
   for (var ndx in playerList) {
      console.log("Creating player: " + playerList[ndx]);
      this.players.push(new Player(playerList[ndx]));
   }
   
   this.newDraft = function(callback) {
      var self = this;
      genPacks(cube_file, oracle_file, this.players.length, function(packs) {
         for (var ndx in self.players) {
            self.players[ndx].unopenedPacks.push(packs.pop());
            self.players[ndx].unopenedPacks.push(packs.pop());
            self.players[ndx].unopenedPacks.push(packs.pop());
         }
         callback();
      });
   };
   
   this.getPackFor = function(playerNdx) {
      var player = this.players[playerNdx];
      return player.getPack();
   };
};

module.exports = Drafter;

function genPacks(cube_file, oracle_file, numPlayers, callback) {
   console.log("Opening file");
   console.log(cube_file);
   fs.readFile(cube_file, "utf8", function(err, raw_cube_list) {
      if (err) {
         console.log(err);
      }
      
      var cube_list = raw_cube_list.split("\n");
      
      fs.readFile(oracle_file, "utf8", function(err, oracle) {
         oracle_json = JSON.parse(oracle);
         var packs = createPacks(cube_list, oracle_json, processOracle(oracle_json), numPlayers);
         callback(packs);
      });
   });
};

// {Air Elemental: { "LEA":"0", "LEB":0"...}, ...}
function processOracle(oracle) {
   var cardMap = {};
   for (var key in oracle) {
      var set = oracle[key];
      
      for (var i = 0; i < set.cards.length; ++i) {
         var card = set.cards[i];
         var cardName = card.name.toLowerCase();
         if (cardMap[cardName] === undefined) {
            cardMap[cardName] = [];
         }
         
         var key = set.code;
         var obj = {};
         obj["code"] = key;
         obj["ndx"] = i;
         
         cardMap[cardName].push(obj);
      }
   }
   return cardMap;
}

function createPacks(card_list, oracle_data, card_mapping, numPlayers) {
   var white = [];
   var blue = [];
   var black = [];
   var red = [];
   var green = [];
   var other = [];
   
   for (var i = 0; i < card_list.length; ++i) {
      var card_name = card_list[i].trim().toLowerCase();
      if (card_name.length === 0) {
         continue;
      }
      
      if (card_name.indexOf("//") > 0) {
         card_name = card_name.split("/")[0].trim();
      }
      var sets = card_mapping[card_name];
      var targetSet = sets[sets.length - 1];
      
      var latestSet = targetSet.code;
      var indexOfCard = targetSet.ndx;
      
      /*
       * artist, cmc, colorIdentity, colors, id, imageName, layout, manaCost, mciNumber, multiverseid, name, rarity, subtypes, text, type, types
       * flavor
       * flavor, power, toughness
       * reserved
       */
      var card = oracle_data[latestSet].cards[indexOfCard];
      
      if (card.colors !== undefined && card.colors.length > 0 && card.colors.length < 2) {
         if (card.colors[0] === "White") {
            white.push(card);
         } else if (card.colors[0] === "Blue") {
            blue.push(card);
         } else if (card.colors[0] === "Black") {
            black.push(card);
         } else if (card.colors[0] === "Red") {
            red.push(card);
         } else if (card.colors[0] === "Green") {
            green.push(card);
         } else {
            console.log("Unknown card: " + card.name);
         }
      } else {
         other.push(card);
      }
   }
   
   shuffleArray(white);
   shuffleArray(blue);
   shuffleArray(black);
   shuffleArray(red);
   shuffleArray(green);
   shuffleArray(other);
   
   console.log("White: " + white.length + " Blue: " + blue.length + " Black: " + black.length + " Red: " + red.length + " Green: " + green.length + " Other: " + other.length);
      console.log("Total: " + (white.length+blue.length+black.length+red.length+green.length+other.length));
   
   var numPacks = 3 * numPlayers;
   var packs = [];
   console.log("Creating " + numPacks + " packs");
   for (var i = 0; i < numPacks; ++i) {
      var currPack = [];
      for (var x = 0; x < 2; ++x) {
         currPack.push(white.pop());
         currPack.push(blue.pop());
         currPack.push(black.pop());
         currPack.push(red.pop());
         currPack.push(green.pop());
      }
      for (var x = 0; x < 3; ++x) {
         currPack.push(other.pop());
      }
      
      packs.push(currPack);
   }
   
   var remainingCards = [];
   while (white.length > 0) {
      remainingCards.push(white.pop());
   }
   while (blue.length > 0) {
      remainingCards.push(blue.pop());
   }
   while (black.length > 0) {
      remainingCards.push(black.pop());
   }
   while (red.length > 0) {
      remainingCards.push(red.pop());
   }
   while (green.length > 0) {
      remainingCards.push(green.pop());
   }
   while (other.length > 0) {
      remainingCards.push(other.pop());
   }
   
   for (var packNdx = 0; packNdx < packs.length; ++packNdx) {
      var pack = packs[packNdx];
      for (var x = 0; x < 2; ++x) {
         pack.push(remainingCards.pop());
      }
   }
   
   console.log("Remaining cards: " + remainingCards.length);
   
   return packs;
};

function shuffleArray(arr) {
   for (var i = arr.length; i > 0; --i) {
      var j = Math.floor(Math.random() * i);
      var holder = arr[i - 1];
      arr[i - 1] = arr[j];
      arr[j] = holder;
   }
}

