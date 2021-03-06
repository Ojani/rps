window.onload = function() {

//authentication
firebase.auth().signInAnonymously().catch(function(error) {
  swal.fire({
    icon: "error",
    title: "Something went wrong.",
    text: error.message
  });
});

var user;

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    $(".loadingScreen").remove();
    user = user;

    //initUser();

  }

});






// Get a reference to the database service
var database = firebase.database();

var ref;
var roomId;
var player1Name;
var player2Name = "Waiting for player to join...";
var host = false;
var turnOf;
var has2players = false;
var userName;
var opponent;



//copy room code button
const copyArea = $(`<textarea style="opacity:0" readonly"></textarea>`)[0];
document.body.appendChild(copyArea);

$(".roomCopyBtn").click(() => {
  const text = $(".roomCode span").text();

  copyArea.innerText = text;

  copyArea.select();
  copyArea.setSelectionRange(0, 99);

  document.execCommand("copy");

  swal.fire({
    icon: "success",
    text: "Copied room code",
    timer: 1000,
    allowOutsideClick: false,
    allowEscapeKey: false,
    allowEnterKey: false,
    stopKeydownPropagation: false,
    showConfirmButton: false,
    position: "top-end",
    backdrop: false


  })

  ///end of copy function
});



//exit button event
$(".exitBtn").click(ask2exit)

//asking to exit game when user clicks on button
function ask2exit() {

  swal.fire({
    icon: "warning",
    title: "Are you sure you want to exit the session?",
    text: "You won\'t be able to come back to this specific session afterwards if both players leave.",
    showCancelButton: true,
    confirmButtonText: "Confirm",
    cancelButtonColor: '#d33',
    dangerMode: true

  })
  .then(result => {
    if(result.value) {
      exitSession({
        icon: "success",
        text: "You have exited the game."

      });

    }

  });

}

//exiting game function
function exitSession(swalConfig) {
  //swal.fire(swalConfig);

  sessionStorage.clear();

  location.reload();

}



//using session storage if available
/*var storedData = sessionStorage.getItem("sessionStorageObj");
if(storedData) {
  storedData = JSON.parse(storedData);

  userNameOk(storedData);

}*/







//random room code generator
function makeCode(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

//creating room
document.querySelector(".createBtn").onclick = createRoom;
function createRoom() {

  swal.fire({
    title: "Create Room",

    confirmButtonText: "Confirm",
    showCancelButton: true,

    html: '<input id="nameInput1" class="swal2-input" placeholder="Enter a username" required>',
    preConfirm: function () {
      return new Promise(function (resolve) {
        resolve({
          name: $('#nameInput1').val()
        });
      });
    },
    onOpen: function () {
      $('#nameInput1').focus()
    },

  }).then(data => {
    if(data.isDismissed) return

    player1Name = data.value.name;

    if (player1Name == "" || player1Name == null) { swal.fire({ icon: "error", title: "Error",text: "Name cannot not be empty"}); return }

    if (player1Name.length > 17) { userName = player1Name = player1Name.slice(0,15) + "..." }

    //creating room code
    roomId = makeCode(7);

    database.ref("rooms/"+roomId).set({
      turnOf: player1Name,
      table: ["","","","","","","","",""],
      players: {'player1': {'name':player1Name}}

    });

    host = true;
    enteredRoom();

  });

}

//entering a room
document.querySelector(".joinBtn").onclick = enterRoom;
function enterRoom() {
  //getting input of room Code
  swal.fire({
    title: "Enter Room",

    confirmButtonText: "Confirm",
    showCancelButton: true,

    html:
    '<input id="nameInput2" class="swal2-input" placeholder="Enter a username" required>' +
    '<input autocapitalize="off" autocomplete="off" autocorrect="false" spellcheck="false" id="codeInput" class="swal2-input" placeholder="Enter room code" required>',
  preConfirm: function () {
    return new Promise(function (resolve) {
      resolve({
        name: $('#nameInput2').val(),
        id: $('#codeInput').val()
      });
    });
  },
  onOpen: function () {
    $('#nameInput2').focus()
  },

}).then(data => {

  if(data.isDismissed) return

    player2Name = data.value.name;

    if (player2Name == "" || player2Name == null) { swal.fire({ icon: "error", text:"Name cannot be empty." }); return }

    if (player2Name.length > 17) player2Name = player2Name.slice(0,15) + "...";

    userName = player2Name;
    userNameOk(data);

  });

}

function userNameOk(data) {

    roomId = data.value.id;

    var playersInRoom = 0;

    database.ref("rooms/"+roomId+"/players").once("value").then(snapshot => {
      snapshot.forEach(child => {
        playersInRoom++;
        player1Name = child.val().name;

      });

      if(playersInRoom == 0) { swal.fire({ icon: "error", title: "Oops!", text:"Invalid room code." }); return }

      if(playersInRoom > 1) { swal.fire({ icon: "error", title: "Oops!", text:"Room is full" }); return }

      if(player2Name == player1Name) { swal.fire("Username is already taken by the host, choose a different name."); return }

      //enter room
      ref = database.ref("rooms/"+roomId);
      database.ref("rooms/"+roomId+"/players").update({
        player2: {'name': player2Name}

      })
      .then(() => enteredRoom());
    });


}









//end of entering room function




//runs after user enters room (host or not)
var running1stTime = true;
function enteredRoom() {
  var msg = host? ` The room code is <b>${roomId}</b>` : `You have joined ${player1Name}!`;

  if (!host) {
    has2players = true;

  }

  swal.fire({icon: "success", title: "Success!", html: msg});

  userName = host? player1Name : player2Name;
  opponent = host? player2Name : player1Name;
  turnOf = player1Name;

  document.querySelector(".menuWrapper").style.display = "none";
  document.querySelector(".gameWrapper").style.display = "initial";
  document.querySelector(".roomCode span").innerText = roomId;
  document.querySelector(".name b").innerText = userName+":";
  if(!host) document.querySelector(".opponent b").innerText = opponent+":";
  document.querySelector(".turn span").innerText = player1Name;

  updateGame();


  //setting up names
  database.ref("rooms/"+roomId+"/players").on("value", data => {

    //when a player joins
    if (data.val().player2 && host) {

      player2Name = data.val().player2.name;
      document.querySelector(".opponent b").innerText = player2Name+":";

      swal.fire(player2Name+" has joined the session!");

      has2players = true;

    }

    //when player 2 leaves
    if (!data.val().player2 && host && has2players) {
      swal.fire(player2Name+" has left the game.");

      document.querySelector(".opponent b").innerText = "Waiting for player to join...";
      $(".playerName span").text(0);
      has2players = false;
      restartGame();

    }

    //when player 1 leaves
    if (!data.val().player1 && !host && has2players) {
      swal.fire(player2Name+" has left the game.");

      player1Name = player2Name;
      player2Name = "Waiting for player to join...";

      document.querySelector(".opponent b").innerText = "Waiting for player to join...";
      $(".playerName span").text(0);
      has2players = false;

      host = true;

      database.ref("rooms/"+roomId+"/players").set({
        player1: {'name':player1Name}

      });

      restartGame();

    }

    //managing connections
    if(has2players) {
      //removing player from db when disconnecting
      database.ref("rooms/"+roomId+"/players").onDisconnect().cancel();
      database.ref("rooms/"+roomId).onDisconnect().cancel();
      eval(`database.ref("rooms/"+roomId+"/players").onDisconnect().update({${host? "player1":"player2"}: null});`);

    } else {
      //deleting room when both players disconnect
      database.ref("rooms/"+roomId+"/players").onDisconnect().cancel();
      database.ref("rooms/"+roomId).onDisconnect().cancel();
      database.ref("rooms/"+roomId).onDisconnect().set(null);

    }

  });



  //event listener to update game when move is made
  database.ref("rooms/"+roomId+"/table").on("value", data => {
    //updating game
    if(has2players) {
      data.forEach(value => {
        document.querySelector(".cell"+value.key).innerText = value.val();

      });

      updateGame();

      //switching turns
      database.ref("rooms/"+roomId+"/turnOf").on("value", data => {
        turnOf = data.val();
        document.querySelector(".turn span").innerText = turnOf;

      });




      running1stTime = false;

    }

  });

  //setting up session storage variables in case the user refreshes
  /*var sessionStorageObj = {
    value: { roomId: roomId }

  }

  sessionStorage.setItem("sessionStorageObj", JSON.stringify(sessionStorageObj));*/

  //end of enterRoom function

}


//event listeners for game
document.querySelectorAll(".table div").forEach(element => element.onclick = function(evt) {
  if (turnOf == userName && has2players) {
    //not doing anything if cell is filled in
    if(evt.target.innerText != "") return;

    //getting cell number to determine which value to change
    var cell = evt.target.className.slice(-1);

    //choosing x or o
    var letter = host? "X" : "O";

    eval(`database.ref("rooms/"+roomId+"/table").update({
      `+cell+`: letter

    })`);



    database.ref("rooms/"+roomId).update({
      turnOf : turnOf == player1Name? player2Name : player1Name

    });

    //preventing user from clicking twice
    turnOf = null;

  }

});






//checking if a user won
//fuction to see if all values entered are the same and are not empty strings
function areEqual(val1, ...values) {
  var og = val1;
  var equal = true;
  values.forEach(val =>{
    if (val !== og || val == "") {
      equal = false;

    }

  });

  return equal;

}

//function if callede every time a move is made
function updateGame() {
  var table = [];

  //inserting table values into array
  document.querySelectorAll(".table div").forEach(elmnt => {
    var value = elmnt.innerText;
    table.push(value);

  });

  //stores alltic tac toe win conditions
  var winningCombos = [
    [0,1,2],
    [3,4,5],
    [6,7,8],
    [0,3,6],
    [1,4,7],
    [2,5,8],
    [0,4,8],
    [2,4,6],
  ];

  //looping through table array and comparing it to winning conditions
  var won = false;
  for (let val=0; val < winningCombos.length; val++) {
    if (areEqual(
      table[winningCombos[val][0]],
      table[winningCombos[val][1]],
      table[winningCombos[val][2]]
    )) {
      //running game won function along with the letter that one
      var letterWon = table[winningCombos[val][0]];
      won = true;

    }

    var cells = [winningCombos[val][0], winningCombos[val][1], winningCombos[val][2]];

    if (won) { gameWon(letterWon, cells); break; }

  }

  //checking for ties
  if(!won) {
    for(let i=0;i<9;i++) {
      if ($(".cell"+i).text() == "") {
        return;

      }
    }

    //when there is a tie
    gameTied();

  }


}




// runs when someone wins the game
function gameWon(letter, cells) {

  //doing winning animation
  $(".table div").addClass("blur4win");
  $(".gameWrapper").css("pointer-events", "none");

  cells.forEach(index => {
    $(".cell"+index).removeClass("blur4win");
    $(".cell"+index).addClass("pink4win");

  });

  //after animation ends
  setTimeout(() => {
    $(".blur4win").removeClass("blur4win");
    $(".pink4win").removeClass("pink4win");


    var player = letter == "X"? player1Name : player2Name;
    swal.fire(`${player.toUpperCase()} WON THE GAME!`);

    //resetting game
    restartGame();

    //adding points
    if(player == userName) {
      $(".name span").text(parseInt($(".name span").text())+1);

    } else {
      $(".opponent span").text(parseInt($(".opponent span").text())+1);

    }

  }, 2000);

//end of game won function
}



//tied gam function
function gameTied() {

  $(".gameWrapper").css("pointer-events", "none");

  for(let i=0; i < 9; i++) {
    let cell = $(".cell"+i);

    if(cell.text() == "X") {
      cell.addClass("pink_tie");

    } else {
      cell.addClass("blue_tie");

    }

  }

  //after animation ends
  setTimeout(() => {
    $(".pink_tie").removeClass("pink_tie");
    $(".blue_tie").removeClass("blue_tie");

    swal.fire("It\'s a draw!");

    //resetting game
    restartGame();

    $(".gameWrapper").css("pointer-events", "");

  }, 2000);


//end of game tied function
}






//restarting game
document.querySelector(".restartBtn").onclick = restartGame;

function restartGame() {

  $(".table div").text("");

  database.ref("rooms/"+roomId).update({
    turnOf: player1Name,
    table: ["","","","","","","","",""]

  }).then(() => {

    $(".gameWrapper").css("pointer-events", "");

  });

}





//alert($(".table div").css("font-size"));
//alert(window.innerWidth);

}
