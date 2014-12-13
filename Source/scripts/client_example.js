/**
 * Created by Layton on 04.12.2014.
 */
$(document).ready(function () {
    /*
     generate array of JSON data of cards with the same values and suits
     Parameters:
     number - number of cards that will be generated
     value - card value. String. Default: empty string
     suit - card suit. String. Default: empty string
     Return:
     array of JSON data of cards
     */
    function generateSameData(number, value, suit) {
        var result = [];
        value = value || "";
        suit = suit || "";
        for (var i = 0; i < number; i++) {
            result.push({value: value, suit: suit});
        }
        return result;
    }

    var ALL_CARDS = [
          {value: "6"}
        , {value: "7"}
        , {value: "8"}
        , {value: "9"}
        , {value: "10"}
        , {value: "J"}
        , {value: "Q"}
        , {value: "K"}
        , {value: "A"}];

    var SHIRTS = ["shirt1", "shirt2", "shirt3", "shirt4"];

    //possilbe name of decks: player-top, player-bottom, player-left, player-right, main-field, pile
    var appereanceTime = 2000, updateTime = 700, deadTime = 1200, popTime = 400;

    var bottomDeck = new DeckDW('.player-bottom', 'horizontal', updateTime, deadTime, popTime);
    var data = generateSameData(7, "9", "♦");
    bottomDeck.addCards(data, 'open');
    bottomDeck.update(appereanceTime);

    var leftDeck = new DeckDW('.player-left', 'radial', updateTime, deadTime, popTime);
    var data = generateSameData(10, "9");
    leftDeck.addCards(data, 'shirt2');
    leftDeck.update(appereanceTime);


    var swipe = false;
    //пузырьковая модель распространения событий
    bottomDeck.$field.on("click", '.card[status="alive"]', function() {
        if (swipe) { return; }
        console.log("click");
        bottomDeck.remove$Card($(this));
        bottomDeck.update();
    });

    
    //hover. Нужно записывать именно так с конкатенацией
    bottomDeck.$field.on("mouseenter", '.card[status="alive"]', function() {
        swipe = false;
        bottomDeck.popUp($(this));

    }).on("mouseleave", '.card[status="alive"]', function () {
        bottomDeck.popDown($(this));
    });

    $.event.swipe.delay = 5000;
    $.event.swipe.max = 220;
    $.event.swipe.min = 50;

    bottomDeck.$field.on("swipeup", '.card[status="alive"]', function() {
        console.log('Swiping up');
        swipe = true;
    });

    bottomDeck.$field.on("swipedown", '.card[status="alive"]', function() {
        console.log('Swiping down');
        swipe = true;
    });
/*
    //добаление кард с задержкой
    setTimeout(function () {
        var data = generateSameData(8, "3", "♦");
        bottomDeck.addCards(data, 'open');
        bottomDeck.update();
    }, 5000);
    */
});
