// Game logic //////////////////////////////////////////////////////////////////

// Game state
const NOT_CONNECTED = -1;
const WAITING_FOR_PLAYERS = 0;
const INGAME_OTHER_PLAYER_TURN = 1;
const INGAME_MY_TURN = 2;
const INGAME_STARTING_MY_TURN = 3;
const INGAME_STARTING_OTHER_PLAYER_TURN = 4;
var state = NOT_CONNECTED;

var connectedPlayers = 0;

// Update game state
var updateUI = function ( ) {
   $(".state").hide();

   $("body").toggleClass("redTeam", team == RED_TEAM );
   $("body").toggleClass("blueTeam", team == BLUE_TEAM );

   if ( state == NOT_CONNECTED ) {
   }

   if ( state == WAITING_FOR_PLAYERS ) {
      $("#waiting").show();
      $(".connectedPlayersCounter").text(connectedPlayers);
      $(".readyPlayersCounter").text(readyCount);
      $("#readyButton").toggleClass("pressed", ready);
   }

   if ( state == INGAME_STARTING_MY_TURN ) {
      $("#startingMyTurn").show();
      $("#startingMyTurn #score #red").text(score[RED_TEAM]);
      $("#startingMyTurn #score #blue").text(score[BLUE_TEAM]);
   }

   if ( state == INGAME_STARTING_OTHER_PLAYER_TURN ) {
      $("#startingOtherTurn").show();
      $("#startingOtherTurn #score #red").text(score[RED_TEAM]);
      $("#startingOtherTurn #score #blue").text(score[BLUE_TEAM]);
      $("#startingOtherTurn #heading").text ( "Turno di " + nameTurn + " (" + (teamTurn == RED_TEAM ? "squadra rossa" : "squadra blu") + ")" );
   }

   if ( state == INGAME_MY_TURN ) {
      $("#myTurn").show();
      $("#myTurn #timer").text(Math.floor(time / 100) / 10);
      $("#myTurn #heading").text(card[0]);
      $("#myTurn #score #red").text(score[RED_TEAM]);
      $("#myTurn #score #blue").text(score[BLUE_TEAM]);
      $("#skipCount").text(skips);

      for ( let i = 1; i < card.length; ++i )
         $("#myTurn #tabooWord" + i).text(card[i]);
   }

   if ( state == INGAME_OTHER_PLAYER_TURN ) {
      $("#otherTurn").show();
      $("#otherTurn #timer").text(Math.floor(time / 100) / 10);
      $("#otherTurn #score #red").text(score[RED_TEAM]);
      $("#otherTurn #score #blue").text(score[BLUE_TEAM]);
      $("#startingOtherTurn #heading").text ( "Turno di " + nameTurn + " (" + (teamTurn == RED_TEAM ? "squadra rossa" : "squadra blu") + ")" );

      for ( let i = 1; i < card.length; ++i )
         $("#otherTurn #tabooWord" + i).text(card[i]);
   }
};

// Teams
const BLUE_TEAM = 0;
const RED_TEAM = 1;
var team = undefined;
var teamTurn = undefined;
var nameTurn = "";

// Scoring
var score = [ 0, 0 ];

// Ready flag
var ready = false;
var readyCount = 0;

// Timer
var time = 0;

// Current card
var card = [ "", "", "", "", "", "" ];

// Skip count
var skips = 0;

// Server logic ////////////////////////////////////////////////////////////////

var socket = io();
var id = -1;

socket.on ( "id", function (msg) { id = msg; } );
socket.on ( "state", function (msg) { state = msg; updateUI(); } );
socket.on ( "connectedPlayers", function(msg) { connectedPlayers = msg; updateUI(); } );
socket.on ( "ready", function(msg) { ready = msg; updateUI(); } );
socket.on ( "readyCount", function(msg) { readyCount = msg; updateUI(); } );
socket.on ( "team", function(msg) { team = msg; updateUI(); } );
socket.on ( "teamTurn", function(msg) { teamTurn = msg; updateUI(); } );
socket.on ( "nameTurn", function(msg) { nameTurn = msg; updateUI(); } );
socket.on ( "time", function(msg) { time = msg; updateUI(); } );
socket.on ( "card", function(msg) { card = msg; updateUI(); } );
socket.on ( "score", function(msg) { score = msg; updateUI(); } );
socket.on ( "skips", function(msg) { skips = msg; updateUI(); } );
socket.on ( "disconnect", function() { state = NOT_CONNECTED; } );

// HTML page logic /////////////////////////////////////////////////////////////

var setup = function ( ) {
   $("#readyButton").on("click", function() {
      ready = !ready;
      socket.emit("ready");
      updateUI();
   } );

   $("#startTurnButton").on("click", function() {
      socket.emit ( "startTurn" );
   } );

   $("#rightButton").on("click", function() {
      socket.emit ( "correct" );
   } );

   $("#tabooButton").on("click", function() {
      socket.emit ( "taboo" );
   } );

   $("#skipButton").on("click", function() {
      socket.emit ( "skip" );
   } );

   $("#playerName").on("input", function() {
      localStorage.playerName = $("#playerName").val();
      socket.emit ( "name", localStorage.playerName );
   } );
   $("#playerName").val(localStorage.playerName);
   socket.emit ( "name", localStorage.playerName );
};
