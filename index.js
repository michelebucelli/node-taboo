// Game data ///////////////////////////////////////////////////////////////////

// Game deck (italian)
const deck_it = [
   [ "albicocca", "nocciolo", "arancione", "pianta", "susina", "frutto" ],
   [ "antracite", "nero", "colore", "carbone", "fossile", "grigio" ],
   [ "apnea", "palombaro", "bombole", "immersione", "respirare", "sommozzatore" ],
   [ "apice", "cima", "punta", "vertice", "culmine", "massimo" ],
   [ "appello", "scuola", "presente", "assente", "corte", "esame" ],
   [ "appartamento", "casa", "stanza", "affitto", "abitazione", "acquistare" ],
   [ "aquila", "uccello", "rapace", "intelligente", "vista", "condor" ],
   [ "arachide", "nocciolina", "americana", "superpippo", "tostato", "olio" ],
   [ "arcipelago", "Antille", "isole", "gruppo", "mare", "Eolie" ],
   [ "argilla", "roccia", "porosa", "piedi", "creta", "ceramica" ],
   [ "arguto", "avveduto", "fine", "ingegnoso", "sottile", "osservazione" ],
   [ "arnese", "attrezzo", "strumento", "lavoro", "mestiere", "utensile" ],
   [ "arrotino", "affilare", "mestiere", "lama", "coltello", "forbice" ],
   [ "asciugamano", "tela", "spugna", "acqua", "bagno", "accappatoio" ],
   [ "assieme", "con", "stare", "riunire", "gruppo", "tutti" ],
   [ "assai", "tanto", "abbastanza", "te voglio bene", "molto", "quantità" ],
   [ "attimo", "cogliere", "carpe diem", "fuggente", "istante", "aspettare" ],
   [ "attico", "ultimo piano", "edificio", "casa", "sopra", "abitazione" ],
   [ "auge", "essere in", "apice", "culmine", "successo", "fama" ],
   [ "audience", "televisione", "ascolti", "Auditel", "share", "spettatori" ],
   [ "aumentare", "crescere", "tasse", "incrementare", "maggiore", "quantità" ],
   [ "australiano", "continente", "abitante", "Canguro", "isola", "Sidney" ],
   [ "calcio", "partita", "palla", "finale", "mondiali", "squadra" ]
   [ "cristallo", "vetro", "bicchieri", "gemma", "quarzo", "diamante" ],
   [ "divano", "salotto", "poltrona", "letto", "cuscino", "pisolino" ],
   [ "fiore", "petalo", "profumo", "farfalla", "pianta", "colorato" ],
   [ "giornale", "gazzetta", "giorno", "leggere", "prima pagina", "giornalista" ],
   [ "rimmel", "trucco", "ciglia", "cosmetico", "allungare", "De Gregori" ],
   [ "Romeo", "gigli", "innamorato", "Giulietta", "Shakespeare", "Verona" ],
   [ "scoop", "notizia", "giornale", "rivista", "colpo", "sensazionale" ],
   [ "semaforo", "fermarsi", "verde", "rosso", "arancione", "incrocio" ],
   [ "semolino", "brodo", "minestra", "farina", "riso", "neonato" ],
   [ "soggiorno", "viaggio", "permanenza", "salone", "azienda", "obbligato" ],
];

// Game logic //////////////////////////////////////////////////////////////////

// Cards are represented by means of arrays of words
// The first word is the one to be guessed, the following ones are the taboo words

// Game state (mostly for client)
const NOT_CONNECTED = -1;
const WAITING_FOR_PLAYERS = 0;
const INGAME_OTHER_PLAYER_TURN = 1;
const INGAME_MY_TURN = 2;
const INGAME_STARTING_MY_TURN = 3;
const INGAME_STARTING_OTHER_PLAYER_TURN = 4;
const GAME_ALREADY_STARTED = 5;
var state = WAITING_FOR_PLAYERS;

// Teams
const BLUE_TEAM = 0;
const RED_TEAM = 1;

// Game parameters
var game_maxTime = 10000;
var game_maxSkip = 3;

// Match class. Contains all information pertaining to the current game
var Match = function ( ) {
   // Current player
   this.curTeam = BLUE_TEAM;
   this.turnTeamPlayer = [-1, -1];
   this.player = undefined;

   // Timer [msec]
   this.time = 0;
   this.maxTime = game_maxTime;
   this.timerHandle = -1;

   // Scoring
   this.score = [ 0, 0 ];

   // Current card
   this.card = [ "", "", "", "", "", "", "" ];

   // Deck of choice
   this.deck = deck_it;

   // Past cards; we keep track of them to avoid drawing the same card repeatedly
   this.history = [];

   // Skip count
   this.skips = 0;
   this.maxSkips = game_maxSkip;

   // Draw a new card and sends it to correct player
   this.drawCard = function ( ) {
      var idx = Math.floor(Math.random() * this.deck.length);
      while ( this.history.includes(idx) )
         idx = Math.floor(Math.random() * this.deck.length);

      this.card = this.deck[idx];
      this.history.push ( idx );

      if ( this.history.length == this.deck.length ) {
         console.log ( "[GAME] resetting deck" );
         this.history.splice(0, this.history.length);
      }

      this.player.emit ( "card", this.card );

      for ( let i = 0; i < clients.length; ++i )
         if ( clients[i].team != this.player.team )
            clients[i].emit ( "card", this.card );
   }

   // Pre-start: the player whose turn is about to start gets notified; we wait for him to
   // actually start
   this.preStartTurn = function ( ) {
      // Choose the player
      do {
         this.curTeam = 1 - this.curTeam;
      } while ( teams[this.curTeam].length == 0 );

      this.turnTeamPlayer[this.curTeam]++;
      if ( this.turnTeamPlayer[this.curTeam] >= teams[this.curTeam].length )
         this.turnTeamPlayer[this.curTeam] = 0;

      this.player = teams[this.curTeam][this.turnTeamPlayer[this.curTeam]];

      console.log ( "[GAME] client " + this.player.info() + " turn is about to start" );

      // Communicate states to clients
      io.emit ( "teamTurn", this.player.team );
      io.emit ( "nameTurn", this.player.name );
      io.emit ( "score", this.score );
      this.player.emit ( "state", INGAME_STARTING_MY_TURN );

      this.skips = this.maxSkips;
      this.player.emit ( "skips", this.skips );

      for ( let i = 0; i < clients.length; ++i )
         if ( clients[i].id != this.player.id )
            clients[i].emit ( "state", INGAME_STARTING_OTHER_PLAYER_TURN );
   }

   // Starts a new turn
   this.startTurn = function ( ) {
      this.time = this.maxTime;

      console.log ( "[GAME] client " + this.player.info() + " turn starts now" );

      // Communicate states to clients
      this.player.emit ( "state", INGAME_MY_TURN );
      for ( let i = 0; i < clients.length; ++i )
         if ( clients[i].id != this.player.id )
            clients[i].emit ( "state", INGAME_OTHER_PLAYER_TURN );

      this.drawCard();

      this.timerHandler = setInterval ( (function() {
         this.time -= 10;
         io.emit ( "time", this.time );
         if ( this.time <= 0 ) this.endTurn();
      }).bind(this), 10 );
   }

   // End of turn
   this.endTurn = function ( ) {
      clearInterval ( this.timerHandler );
      console.log ( "[GAME] client " + this.player.info() + " turn ends" );

      this.preStartTurn();
   }

   // Correct answer
   this.correct = function ( ) {
      this.score[this.player.team] += 1;
      io.emit ( "score", this.score );
      this.drawCard();
   }

   // Taboo word
   this.taboo = function ( ) {
      this.score[this.player.team] -= 1;
      io.emit ( "score", this.score );
      this.drawCard();
   }

   // Skip
   this.skipCard = function ( ) {
      if ( this.skips <= 0 ) return;

      this.drawCard();
      this.skips--;
      this.player.emit ( "skips", this.skips );
   }

   // Reset the game
   this.reset = function ( ) {
      this.score = [0, 0];
      clearInterval ( this.timerHandle );

      io.emit ( "ready", false );
      io.emit ( "state", WAITING_FOR_PLAYERS );

      state = WAITING_FOR_PLAYERS;
   }

   // Start the match
   this.startMatch = function () {
      // Reset game object
      this.reset();

      state = GAME_ALREADY_STARTED;

      // Resets game object
      this.preStartTurn();
   }
}

var match = new Match();

// Server logic ////////////////////////////////////////////////////////////////

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var clients = [];
var teams = [ [], [] ];
var lastId = 0;
var readyCount = 0;

// Map requests to files
app.get('/',           function(req, res){ res.sendFile(__dirname + '/index.html'); });
app.get('/index.html', function(req, res){ res.sendFile(__dirname + '/index.html'); });
app.get('/script.js',  function(req, res){ res.sendFile(__dirname + '/script.js'); });

// Update teams
var updateTeams = function () {
   teams[0].splice(0, teams[0].length);
   teams[1].splice(0, teams[1].length);

   for ( var i = 0; i < clients.length; ++i )
      teams[clients[i].team].push(clients[i]);
};

// Handle player connections
io.on('connection', function(socket) {
   console.log("[SRVR] client " + lastId + " connected");

   // Register the client
   socket.id = lastId++;
   clients.push ( socket );

   // Set client state to not ready
   socket.ready = false;

   // Sets client team to undefined
   socket.team = undefined;
   socket.name = undefined;

   // Send room state and misc info
   socket.emit ( 'id', socket.id );
   socket.emit ( 'state', state );
   socket.emit ( 'ready', socket.ready );
   io.emit ( 'connectedPlayers', clients.length );
   io.emit ( 'readyCount', readyCount );

   // Info string
   socket.info = function() { return this.name + "#" + this.id; }

   // Disconnection event
   socket.on ( 'disconnect', function() {
      if ( state == GAME_ALREADY_STARTED && this.id == match.player.id )
         match.endTurn();

      // Remove client from list
      for (let i = 0; i < clients.length; ++i) {
         if ( clients[i].id == this.id ) {
            clients.splice ( i, 1 );
            break;
         }
      }

      if ( this.ready )
         readyCount--;

      io.emit ( 'connectedPlayers', clients.length );
      console.log("[SRVR] client " + this.info() + " disconnected");

      if ( clients.length == 0 ) {
         console.log("[SRVR] no players left, resetting");
         state = WAITING_FOR_PLAYERS;
         match.reset();
      }
   } );

   // Ready state toggle event
   socket.on ( 'ready', function() {
      this.ready = !this.ready;

      if ( this.ready ) {
         readyCount++;
         console.log("[SRVR] client " + this.info() + " is ready");
      }
      else {
         readyCount--;
         console.log("[SRVR] client " + this.info() + " is no longer ready");
      }

      io.emit ( "readyCount", readyCount );
      console.log("[SRVR] " + readyCount + "/" + clients.length + " clients are ready" );

      // Check if all clients are ready and if so start the game
      if ( readyCount == clients.length ) {
         console.log("[SRVR] All clients ready, starting game");

         // Setup and start the game
         match.startMatch();
      }
   });

   // Start turn event
   socket.on ( 'startTurn', function() {
      if ( this.id == match.player.id ) {
         match.startTurn();
      }
   } );

   // Correct answer
   socket.on ( 'correct', function() {
      if ( this.id == match.player.id ) {
         match.correct();
      }
   } );

   // Taboo word
   socket.on ( 'taboo', function() {
      if ( this.id == match.player.id ) {
         match.taboo();
      }
   } );

   // Skip
   socket.on ( 'skip', function() {
      if ( this.id == match.player.id ) {
         match.skipCard();
      }
   } );

   // Set name
   socket.on ( 'name', function(msg) {
      this.name = msg;
      console.log ( "[SRVR] client " + this.info() + " name set to " + this.name );
   } );

   // Set team
   socket.on ( 'team', function(msg) {
      this.team = msg;
      updateTeams();
      console.log ( "[SRVR] client " + this.info() + " team set to " + this.team );
   } );
});

// Listen for HTTP requests
http.listen(3000, function(){
   console.log("[SRVR] Listening on 3000");
} );
