
/*
 DeckDW - deck data wrapper. To deal with JSON representation of cards
 Parameters:
     fieldSelector - CSS selector of html container which will hold all cards of this deck
     updateType - animation type. String. Possible values: horizontal, vertical, radial
     updateTime - time needed to perform update of the deck
     deadTime - time needed to perform removing animation
     popTime - time needed to perform pop animation
 */
function DeckDW(fieldSelector, updateType, updateTime, deadTime , popTime) {
    var deck = new Deck(fieldSelector, updateType, updateTime, deadTime , popTime);
    
    function createMarkup(card, shirt) {
        var color = (card.suit && (card.suit === "♦" || card.suit === "♥")) ? "red" : "";
        var value = card.value || "";
        var suit = card.suit || "";
        var markup = "<div   class='card" + " " + shirt + " " + color + "' " +
                            "value='" + value + "' " +
                            "suit='" + suit + "'>\n" +
                        "<p>" + suit + "</p>\n" +
                     "</div>\n";
        return markup;
    };
    
    function extractKey($card) {
        var card = DeckDW.extract($card);
        return getKey(card);
    }
    
    function getKey(card) {
        return card.value + card.suit;
    }    
    
    function isOpenShirt(shirt) {
        return shirt == "open";
    }
    
    function $cardsEnumerator() {
        return Enumerable.From(deck.$cards).select(function(el) { return $(el); });
    }
    
    function addIdentic$Cards(markup, cardCount){
        Enumerable
        .Generate(function() { return $(markup); }, cardCount)
        .ForEach(function($card) { deck.add$Card($card); });          
    }
    /*
     Gets data of all cards in the deck
     Parameters:
        index - card index
     Return:
        array of JSON data of all cards in the deck.
        format {owner, suit, value}
     */
    deck.getCards = function() {
        $cardsEnumerator()
        .Select(DeckDW.extract)
        .ToArray();
    };
    
    /*
     Removes card with certain index from the deck
     Parameters:
        index - card index
     */
    deck.removeCard = function(index) {
        var $card = $(deck.$cards.get(index));
        deck.remove$Card($card);
    };
    
    function setOther(currentCount, shirt, cardValue) {     
        function $cardsWithGivenShirt() {
            return $cardsEnumerator().Where(function($card) {
                    return $card.hasClass(shirt);
                } );
        }
        function increase(count) {
            var markup = createMarkup({value: cardValue}, shirt);
            addIdentic$Cards(markup, count);           
        }
        function decrease(count) {
            //we gonna remove cards, so we use ToArray to save enumeration order
            var garbage = $cardsWithGivenShirt().Take(count).ToArray();
            Enumerable
            .From(garbage)
            .ForEach(function($card) { deck.remove$Card($card); });
        }
        
        var diff = currentCount - $cardsWithGivenShirt().Count();
        if (diff > 0) {
            increase(diff);
        } else {
            decrease(Math.abs(diff));
        }
        deck.update();
    }

    function setOpen(currentCards) {
        function removeObsolete(prev, cur) {
            var to$Card = $cardsEnumerator().Select().ToDictionary(extractKey, "$");
            var obsoleteCards = Enumerable.From(prev).Except(cur, getKey);
            var discard =  function(card) {
                var key = getKey(card);
                var $card = to$Card.Get(key);
                deck.remove$Card($card);
            };
            obsoleteCards.forEach(discard);
        }     
        function addNew(prev, cur) {
            var newCards = Enumerable.From(cur).Except(prev, getKey);
            var attach = function(card) {
                var $card = $(createMarkup(card, "open"));
                deck.add$Card($card);
            };
            newCards.forEach(attach);            
        }
        
        var previousCards = deck.getCards();
        removeObsolete(previousCards, currentCards);
        addNew(previousCards, currentCards);
        deck.update();
    }
    
    function setPile(currentCards, ownerToShirt) {
        Enumerable
        .From(currentCards)
        .GroupBy("$.owner")
        .ForEach(function(group) {
                var count = group.Count();
                var owner = group.Key();
                var shirt = ownerToShirt(owner);
                var roundCardValue = group.First().value;
                setOther(count, shirt, roundCardValue);
            });
        deck.update();
    }
    
    deck.set = function() {
        var args = arguments;
        var signature = Enumerable
            .From(args)
            .Select(function(arg) { return jQuery.type(args); })
            .ToString(", ");
        switch(signature) {
            case "array, string":
                setOpen(args[0]);
                break;
            case "array, function":
                setPile(args[0], args[1]);
                break;
            case "number, string":
                setOther(args[0], args[1]);
                break;
            case "number, string, string":
                setOther(args[0], args[1], args[2]);
                break;
            default:
                console.log("Error! Unknown signature: " + signature);
        }
    }

    return deck;
}
/*
  Compares two cards values.
  Parameters:
    firstCard - JSON data object {owner, suit, value}
    secondCard - JSON data object {owner, suit, value}
 */
DeckDW.compare = function(firstCard, secondCard) {
    var firstValue = firstCard.value || "", secondValue = secondCard.value || "";
    var firstSuit = firstCard.suit || "", secondSuit = secondCard.suit || "";
    return firstCard.value === secondCard.value && firstCard.suit === secondCard.suit;
};

/*
 Extract JSON data from jQuery object
 Parameters:
    $card - jQuery object
 Return:
    JSON data object {owner, suit, value} without owner
 */
DeckDW.extract = function($card) {
    return { value: $card.attr('value'), suit: $card.attr('suit') };
};
/*
  Creates jQuery Object for the given card data
  Parmeters:
    card - JSON data object {owner, suit, value}
    shirt - Name of css style which will be applied to the result card
            (possible values: 'open', 'shirt1', 'shirt2', 'shirt3', 'shirt4')
  Return:
    jQuery object which represents a new card
 */
DeckDW.createMarkup = function(card, shirt) {
    var color = (card.suit && (card.suit === "♦" || card.suit === "♥")) ? "red" : "";
    var value = card.value || "";
    var suit = card.suit || "";
    var markup = "<div   class='card" + " " + shirt + " " + color + "' " +
                        "value='" + value + "' " +
                        "suit='" + suit + "'>\n" +
                    "<p>" + suit + "</p>\n" +
                 "</div>\n";
    return markup;
};







