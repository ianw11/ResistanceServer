var self = this;
var visibleElem = null;

var numPicked = 0;

var lastReceivedPack = null;

function start() {
   
   var isComplete = false;
   
   visibleElem = $('#startDiv');
   
   $('#startDraftButton')[0].onclick = startDraft;
   $('#viewSelected')[0].onclick = viewSelected;
   $('#viewpackbutton')[0].onclick = viewPack;
   $('#exportlistbutton')[0].onclick = exportList;
   $('#closeexportpopupbutton')[0].onclick = closeExportPopup;
   
   // Hide all divs that are not yet in use
   $('.cube_hidden').each(function(index) {
      $(this).toggle(0);
   });
   
   /*********************************************/

   /* When the server informs this client what ... */
   socket.on('connected_players', function(player_list) {
      for (var ndx in player_list) {
         var li = document.createElement('li');
         li.innerHTML = player_list[ndx];
         $('#connectedPlayerList').append(li);
      };
   });
   
   socket.on('starting_draft', function() {
      numPicked = 0;
      isComplete = false;
      swapVisibility($('#cardSelect'));
   });
   
   socket.on('new_pack', function(pack) {
      $('#cardtable')[0].style.display = "block";
      $('#pleasewait')[0].style.display = 'none';
      var cardTable = $('#cardtable')[0];
      dropChildren(cardTable);
      for (var i = 0; i < 5; ++i) {
         var tr = document.createElement('tr');
         for (var j = 0; j < (pack.length/5); ++j) {
            var card = pack[i + (5*j)];
            if (card === undefined) {
               continue;
            }
            
            // Remove the card's flavor text as it sometimes has quotes that hurts our sanitization efforts
            card.flavor = "";
            var card_str = sanitize(JSON.stringify(card));
            var card_name = sanitize(card.name);
            
            tr.innerHTML += "<td><img src='http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=" + card.multiverseid + "&type=card'></img><br><h3>" + card.name + "</h3><br><button onclick='cardPicked(\"" + card_name + "\")'>Select</button><button onclick='showOracle(\"" + card_str + "\")'>?</button></td>";
         }
         $('#cardtable').append(tr);
      }
   });
   
   socket.on("current_picks", function(arr) {
      lastReceivedPack = arr;
      dropChildren($('#selectedcardtable')[0])
      for (var i = 0; i < 5; ++i) {
         var tr = document.createElement('tr');
         for (var j = 0; j < (arr.length/5); ++j) {
            var card = arr[i + (5*j)];
            if (card === undefined) {
               continue;
            }
            
            // Remove the card's flavor text as it sometimes has quotes that hurts our sanitization efforts
            card.flavor = "";
            var card_str = sanitize(JSON.stringify(card));
            var card_name = sanitize(card.name);
            
            tr.innerHTML += "<td><img src='http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=" + card.multiverseid + "&type=card'></img><br><h3>" + card.name + "</h3><br><button onclick='showOracle(\"" + card_str + "\")'>?</button></td>";
         }
         $('#selectedcardtable').append(tr);
      }
      swapVisibility($('#selectedCards'));
   });
   
   socket.on("draft_done", function() {
      setHeaderText("Draft completed");
      //$('#pleasewait')[0].style.display = 'none';
      $('#viewpackbutton')[0].style.display = 'none';
      $('#exportlistbutton')[0].style.display = 'block';
      isComplete = true;
      socket.emit('get_picks');
   });
   
   socket.emit('ready');
};

function cardPicked(cardname_unsanitized) {
   setHeaderPicked();
   var cardname = desanitize(cardname_unsanitized);
   $('#cardtable')[0].style.display = "none";
   $('#pleasewait')[0].style.display = 'block';
   socket.emit('card_pick', cardname);
};

function showOracle(sanitized_card) {
   var desanitized_str = desanitize(sanitized_card);
   var card = JSON.parse(desanitized_str);
   document.getElementById('name').innerHTML = card.name + "   --  " + card.manaCost;
   document.getElementById('oracletype').innerHTML = card.type;
   document.getElementById('oracletext').innerHTML = card.text;
   if (card.power !== undefined) {
      document.getElementById('oraclept').innerHTML = card.power + "/" + card.toughness;
   } else {
      document.getElementById('oraclept').innerHTML = "";
   }
   
   document.getElementById('oraclepopup').style.display='block';
   document.getElementById('fade').style.display='block';
};

function closeOracle() {
   document.getElementById('oraclepopup').style.display = 'none';
   document.getElementById('fade').style.display = 'none';
};

function viewSelected() {
   socket.emit("get_picks");
};

function viewPack() {
   swapVisibility($('#cardSelect'));
};

function exportList() {
   var arr = lastReceivedPack;
   
   var list = '<?xml version="1.0" encoding="UTF-8"?>\n<cockatrice_deck version="1">\n<deckname>Draft</deckname>\n<comments></comments>\n<zone name="main">\n';
   for (var ndx in arr) {
      var card = arr[ndx];
      list += '<card number="1" price="0" name="' + card.name + '"/>\n';
   }
   list += '</zone>\n</cockatrice_deck>\n';
   
   var xmlhttp = new XMLHttpRequest();
   var url='http://www.nectarsac.com/cubedraftexport';
   
   xmlhttp.onreadystatechange = function() {
     if (this.readyState == 4 && this.status == 200) {
        var link = '<a href="'+xmlhttp.responseText+'">Download</a>';
        document.getElementById('cardlistcontent').innerHTML = link;
     }
   };
   
   xmlhttp.open("POST", url, true);
   xmlhttp.send(list);
   
   document.getElementById('cardlistpopup').style.display='block';
   document.getElementById('fade').style.display='block';
};

function closeExportPopup() {
   document.getElementById('cardlistpopup').style.display='none';
   document.getElementById('fade').style.display='none';
};

function sanitize(str) {
   return str.split("'").join("APOSTROPHE")
   //.split("\n").join("NEWLINE")
   .split("/").join("SLASH")
   .split("{").join("OPEN_BRACKET")
   .split("}").join("CLOSE_BRACKET")
   .split("\"").join("QUOTE")
   .split("[").join("OPEN_ARRAY")
   .split("]").join("CLOSE_ARRAY");
};

function desanitize(str) {
   return str.split("APOSTROPHE").join("'")
   .split("\n").join("<br><br>")
   .split("SLASH").join("/")
   .split("OPEN_BRACKET").join("{")
   .split("CLOSE_BRACKET").join("}")
   .split("QUOTE").join("\"")
   .split("OPEN_ARRAY").join("[")
   .split("CLOSE_ARRAY").join("]");
};

function startDraft() {
   socket.emit('start_draft');
   return false;
};

function setHeaderText(txt) {
   $('#status')[0].innerHTML = txt;
};

function setHeaderPicked() {
   setHeaderText("Picked " + (++numPicked) );
};

function swapVisibility(newElem) {
   visibleElem.toggle(0);
   newElem.toggle(0);
   visibleElem = newElem;
};

// Helper function to drop all children of a parent
function dropChildren(parent) {
   while (parent.firstChild)
      parent.removeChild(parent.firstChild);
};
