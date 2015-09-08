var socket = io();

// Keeps track of the element visible to the user
var _visibleElem = null;

// When CREATING a room, this holds the currently selected game
var _selected_game_name = null;
var _selected_game = null;
var _selected_modules = {};

var _max = -1;
var _min = -1;
var _ai = true;


// Remembers if this user is currently the owner of the room they're in
var ownerOfRoom = false;

var _name = "";


/* When the page loads */
window.onload = function() {
   
   // Create or Join
   $('#createGameButton')[0].onclick = createGame;
   $('#joinGameButton')[0].onclick = listRooms;
   
   // Create a game
   $('#createGameSubmit')[0].disabled = true;
   $('#createGameSubmit')[0].onclick = openGame;
   $('#createGameBack')[0].onclick = backToHome;
   
   // Join a game
   $('#refreshOpenRoomsButton')[0].onclick = listRooms;
   $('#lookingForGameBack')[0].onclick = backToHome;
   // Preparation for accordion view in the 'Available Rooms' view
   $('#openRoomsList')[0].accordionActive = false;
   
   // Leave a game
   $('#leaveRoomButton')[0].onclick = leaveRoom;
   
   // Chat methods
   $('#chatSendButton')[0].onclick = sendChat;
   $('#chatForm').submit(sendChat);
   
   _visibleElem = $('#enterName');
   // Hide all divs that are not yet in use
   $('._hidden').each(function(index) {
      $(this).toggle(0);
   });
};


/* When the user submits their name */
$('#nameInputForm').submit(function() {
   var name = $('#nameInput').val();
   if (name === undefined || name === '')
      return false;
   
   _name = name;
   
   socket.emit('_name', name);
   
   _swapVisibility($('#createOrJoin'));
   return false;
});


/* Navigation */

var backToHome = function() {
   if (this.chatVisible) {
      $('#chatDiv').toggle(0);
   }
   
   _swapVisibility($('#createOrJoin'));
};


/* Room Creation */

var createGame = function() {
   socket.emit('_get_game_names');
   
   _max = -1;
   _min = -1;
   updateSummary();
};
socket.on('_game_names', function(name_arr) {
   var baseGameSelect = $('#baseGameSelect')[0];
   dropChildren(baseGameSelect);
   
   name_arr.forEach(function(game_name) {
      var option = document.createElement('option');
      option.text = game_name;
      option.value = game_name;
      baseGameSelect.appendChild(option);
   });
   
   _swapVisibility($('#createGame'));
});

var baseGameSelect = function(sel) {
   
   // Update UI before doing anything else
   $('#createGameSubmit')[0].disabled = true;
   var moduleForm = $('#moduleForm')[0];
   dropChildren(moduleForm);
   
   var val = sel.value;
   if (val === '')
      return;
   
   _selected_game_name = val;
   socket.emit('_get_game_info', val);
};
socket.on('_game_info', function(game) {
   // Save the game for later use
   _selected_game = game;
   
   
   var moduleForm = $('#moduleForm')[0];
   
   // Display all modules available to play
   for (var ndx in _selected_game.modules) {
      
      var module = _selected_game.modules[ndx];
   
      var label = document.createElement('label');
      label.innerHTML = '<input type=checkbox onclick="_updateModules(this)" value=' + ndx + '> ' + module;
      moduleForm.appendChild(label);
      moduleForm.appendChild(document.createElement('br'));
      
   }
   
   // Finally enable the button to create the room
   $('#createGameSubmit')[0].disabled = false;
   
   updateParams();
   
});

var _updateModules = function(box) {
   if (box.checked) {
      socket.emit('_get_module_info', _selected_game_name, box.value);
   } else {
      delete _selected_modules[box.value];
      updateParams();
   }
};
socket.on('_module_info', function(module) {
   var module_val = module.val;
   _selected_modules[module_val] = module;
   
   updateParams();
});

// Helper function
function updateParams() {
   var old_ai = _ai;
   
   _max = _selected_game.max_players;
   _min = _selected_game.min_players;
   _ai = _selected_game.allows_ai;
   
   for (var val in _selected_modules) {
      var module = _selected_modules[val];
      
      if (module.max < _max)
         _max = module.max;
      if (module.min > _min)
         _min = module.min;
      
      _ai = (_ai & module.allows_ai) !== 0;
   }
   
   // If _ai has changed
   if (old_ai !== _ai) {
      var yes_ai = $('#ai_allowed_table');
      var no_ai = $('#no_ai_table');
      yes_ai.toggle(0);
      no_ai.toggle(0);
   }
   
   updateSummary();
};

function updateSummary() {
   var msg = '';
   msg += 'Maximum number of players: '
   if (_max === -1)
      msg += '-';
   else
      msg += _max;
   msg += '<br>';
   msg += 'Minimum number of players: ';
   if (_min === -1)
      msg += '-';
   else
      msg += _min;
   msg += '\n';
   
   var summary = $('#room_creation_summary')[0];
   summary.innerHTML = msg;
};


// Finally open the game
var openGame = function() {
   $('#numberOfPeopleError')[0].innerHTML = "";
   $('#numberOfAIError')[0].innerHTML = "";
   $('#radioError')[0].innerHTML = "";
   $('#targetPlayersError')[0].innerHTML = "";
   $('#numberOfPeopleNoAIError')[0].innerHTML = "";
   
   
   var numHumans = -1;
   var targetPlayers = -1;
   var potentialTitle = $('#gameTitle')[0].value;
   var gameTitle = potentialTitle === undefined ? 'TITLE' : potentialTitle;
   
   if (_ai) {
      
      var radio = document.getElementsByName('variation');
      if (!radio[0].checked && !radio[1].checked) {
         $('#radioError')[0].innerHTML = "One of the radio buttons must be checked";
         return;
      }
      
      if (radio[0].checked) {
         // VERIFY OPTIONS 1
         numHumans = $('#numberOfPeople')[0].value;
         if (numHumans > _max || numHumans < 1) {
            $('#numberOfPeopleError')[0].innerHTML = "Bad Value";
            return;
         }
         
         var numAI = $('#numberOfAI')[0].value;
         if (numAI > (_max - 1) || numAI < 0) {
            $('#numberOfAIError')[0].innerHTML = "Bad Value";
            return;
         }
         
         var total = parseInt(numHumans) + parseInt(numAI);
         if (total > _max || total < _min) {
            $('#numberOfPeopleError')[0].innerHTML = "Bad Value";
            $('#numberOfAIError')[0].innerHTML = "Bad Value";
            return;
         }
         targetPlayers = total;
         
      } else {
         // VERIFY OPTIONS 2
         targetPlayers = parseInt($('#targetPlayers')[0].value);
         if (targetPlayers < _min || targetPlayers > _max) {
            $('#targetPlayersError')[0].innerHTML = "Bad Value";
            return;
         }
      }
   }
   
   if (!_ai) {
      targetPlayers = parseInt($('#numberOfPeople_noAI')[0].value);
      numHumans = targetPlayers;
      if (targetPlayers < _min || targetPlayers > _max) {
         var msg = "Bad Value -- Need ";
         if (targetPlayers < _min)
            msg += 'at least ' + _min;
         else
            msg += ' at most ' + _max;
         msg += " players";
         
         $('#numberOfPeopleNoAIError')[0].innerHTML = msg;
         return;
      }
   }
   
   
   var modules = {};
   for (var val in _selected_modules) {
      modules[val] = _selected_modules[val].name;
   }
   
   
   var obj = {baseGame: _selected_game_name,
              modules: modules,
              title: gameTitle,
              numHumans: numHumans,
              targetPlayers: targetPlayers
              };
   
   socket.emit('_open_room', obj);
};


/* Room Joining */

var listRooms = function() {
   socket.emit('_get_open_rooms');
}

socket.on('_open_rooms', function(list) {
   var rooms = $('#openRoomsList')[0];
   
   dropChildren(rooms);
   
   for (var i = 0; i < list.length; ++i) {
      var room = list[i];
      
      
      var title = document.createElement('h3');
      title.innerHTML = room.title;
      
      var childDiv = document.createElement('div');
      
      var params = document.createElement('ul');
      childDiv.appendChild(params);
      
      // What game
      var game = document.createElement('li');
      game.innerHTML = room.baseGame;
      params.appendChild(game);
      
      // Game Owner
      var host = document.createElement('li');
      host.innerHTML = "Hosted by: " + room.owner;
      params.appendChild(host);
      
      // Mods
      var modules = document.createElement('li');
      var modStr = "";
      if (room.modules.length > 0) {
         modStr = "MODS:  ";
         room.modules.forEach(function(val) {
            modStr += '[' + val + "]  ";
         });
      } else {
         modStr = "No Mods";
      }
      modules.innerHTML = modStr;
      params.appendChild(modules);
      
      // Looking for
      var numHumanLI = document.createElement('li');
      if (room.numHumans === -1) {
         numHumanLI.innerHTML = "Looking for UP TO " + (room.targetPlayers - room.inQueue) + " more people";
      } else {
         numHumanLI.innerHTML = "Looking for " + (room.numHumans - room.inQueue) + " more people";
      }
      params.appendChild(numHumanLI);
      
      // Num AI
      var numAILI = document.createElement('li');
      if (room.numHumans === -1) {
         numAILI.innerHTML = "AI will fill in the rest if not enough people join"
      } else {
         numAILI.innerHTML = "Playing with " + room.numAI + " AI";
      }
      params.appendChild(numAILI);
      
      // Join
      var joinButton = document.createElement('button');
      joinButton.innerHTML = 'Join Game';
      joinButton.room_id = room.id;
      joinButton.onclick = function() {
         socket.emit('_join_room', this.room_id);
      }
      childDiv.appendChild(joinButton);
      
      rooms.appendChild(title);
      rooms.appendChild(childDiv);
      
      
   }
   
   
   /* Code to handle the UI component known as 'accordion' */
   
   if (rooms.accordionActive) {
      $(function() {
         $('#openRoomsList').accordion( 'destroy' );
      });
   } else {
      rooms.accordionActive = true;
   }
   
   $(function() {
      $('#openRoomsList').accordion( { heightStyle: 'content' } );
   });
   
   
   _swapVisibility($('#lookingForGame'));
});


/* Once In A Room */

socket.on('_in_room', function(room, isOwner) {
   _swapVisibility($('#room'));
   $('#chatDiv').toggle(0);
   chatVisible = true;
   
   ownerOfRoom = isOwner;
   
   // Display Title
   $('#roomTitle')[0].innerHTML = room.title;
   
   // Display Module List for Current Game
   var moduleList = $('#moduleList')[0];
   for (var i = 0; i < room.modules.length; ++i) {
      var li = document.createElement('li');
      li.innerHTML = room.modules[i];
      moduleList.appendChild(li);
   }
   
   // Owner can see the 'start' button
   if (isOwner) {
      var startButton = document.createElement('button');
      $('#ownerPlaceHolder')[0].appendChild(startButton);
      startButton.innerHTML = 'Start Game';
      startButton.onclick = function() {
         socket.emit('_ready_to_start', room.id);
      }
   }
});

socket.on('_player_list_update', function(names) {
   var userlist = $('#userList')[0];
   dropChildren(userlist);
   
   names.forEach(function (val, ndx) {
      var li = document.createElement('li');
      userlist.appendChild(li);
      li.innerHTML = val;
   });
   
});

var leaveRoom = function() {
   socket.emit('_leaving_room');
   dropChildren($('#ownerPlaceHolder')[0]);
   backToHome(ownerOfRoom);
};

socket.on('room_closed', function(active) {
   if (active) {
      alert("Player disconnected, please refresh");
      _swapVisibility($('#_blank'));
      
      $('#chatDiv').toggle(0);
      
      return;
   }
   
   alert("Room closed, please choose another option");
   backToHome();
});


/* Starting Game */

socket.on('_start_game', function(url) {
   $(function() {
      $('#game').load(url, null, function() {
         start();
      });
   });
   
   _swapVisibility($('#game'));
});


/* Server Notifications */

socket.on('notify', function(msg) {
   alert(msg);
});



/* Chat functions */
socket.on('chat_message', function(msg) {
   
   var ul = $('#messages');
   var li = $('<li>').text(msg);
   ul.append(li);
   
});

function sendChat() {
   
   if ($('#m')[0].value.length === 0)
      return false;
   
   socket.emit('chat_message', _name + '-> '  + $('#m')[0].value);
   
   $('#m')[0].value = '';
   
   return false;
};


/* Helper function to switch out visibility */
var _swapVisibility = function(newElem) {
   _visibleElem.toggle(0);
   newElem.toggle(0);
   _visibleElem = newElem;
};

/* Helper function to drop all children */
var dropChildren = function(parent) {
   while (parent.firstChild)
      parent.removeChild(parent.firstChild);
};

