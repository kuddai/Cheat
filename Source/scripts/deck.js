/*
 * Created by Layton on 30.11.2014.
 */
/*
  Deck object which deals animations problems
  Parameters:
    fieldSelector - CSS selector of html container which will hold all cards of this deck
    updateType - animation type. String. Possible values: horizontal, vertical, radial
    updateTime - time needed to perform update of the deck
    deadTime - time needed to perform removing animation
    popTime - time needed to perform pop animation
 */
function Deck(fieldSelector, updateType, updateTime, deadTime , popTime) {
    //status="{ alive | dead | removing}" fx="#{final X coordinate} fy="#{final Y coordinate}"
    //frotate="#{final angle}" fo="#{final opacity}" fw="#{final width}"
    var $field = $(fieldSelector);
    this.$field = $field;
    this.$cards = $field.find('.card[status="alive"]');
    var self = this;
    var updatePosition;
    var animateAll;

    if (updateType === "horizontal") {
        updatePosition = updateHorizontally;
        animateAll = function(time) {
            animateField(time);
            animateAllCards(time);
        };
    } else if (updateType === "vertical") {
        updatePosition = updateVertically;
        animateAll = animateAllCards;
    } else if (updateType === "radial") {
        updatePosition = updateRadially;
        animateAll = animateAllCards;
    } else {
        console.log("ERROR! Invalid update type: " + updateType + ". Please use horizontal, vertical or radial instead.");
    }

    function getTransformCSS($card) {
        if (!$card) { return {}; }
        return {
            x: $card.attr('fx') || "0px",
            y: $card.attr('fy') || "0px",
            rotate: $card.attr('frotate') || "0deg"
        };
    }

    function animateCard($card, time) {
        function getAnimParam(opacity, time) {
            var param = getTransformCSS($card);
            param.duration = time || updateTime;
            param.opacity = opacity;
            param.easing = "snap";
            return param;
        }
        function animAlive() {
            var param = getAnimParam(1.0, time);
            $card.transition(param);
        }
        function animDead() {
            var param = getAnimParam(0.0, deadTime);
            $card.attr("status", "removing");
            $card.transition(param, function() {
                $card.remove();
            });
        }

        if ($card.attr("status") === "removing") { return; }

        $card.stop(true);

        if ($card.attr("status") === "alive") {
            animAlive();
        } else {
            animDead();
        }
    }

    function animateField(time) {
        $field.stop(true);
        var width = $field.attr('fw') || $field.width();
        $field.transition({
            width: width,
            duration: time || updateTime
        });
    }

    function animateAllCards(time) {
        var $allCards = $field.find('.card');
        $allCards.each(function(index) {
            animateCard($(this), time);
        });
    }

    function calcStep(finalValue, N) {
        //On the last step (N - 1) the value must be equal finalValue.
        //Avoid divide by zero case.
        return (N <= 1) ? 0 : finalValue / (N - 1);
    }

    function updateHorizontally() {
        var N = self.$cards.length;
        var cardWidth = self.$cards.first().width();
        //Calculate the best width for the current screen width to properly display all cards.
        //It returns value between $field min-width property and max-width property
        function calcFieldWidth() {
            //minimum width needed for cards not to intersect each other
            function calcIdealWidth() {
                var maxPadding = 5;//in px
                //padding from both side + card with N times
                return (2 * maxPadding + cardWidth) * N;
            }
            function calcMaxVisibleWidth() {
                //we want to get only visible space without scrollbars
                var screenWidth = $(window).width();//take it for resizing purposes
                var fieldWidth = $field.width();//xould be more than window
                return (screenWidth > fieldWidth) ? fieldWidth : screenWidth;
            }
            function calcMinWidth() {
                //should be in px, for now take value from css
                //it may be different for different screen due to media queries
                return parseInt($field.css('min-width'), 10);
            }

            var idealWidth = calcIdealWidth();
            var maxWidth = calcMaxVisibleWidth();
            var minWidth = calcMinWidth();
            
            if (idealWidth > maxWidth) { 
                return maxWidth; //not enough space
            }
            if (maxWidth >= idealWidth && idealWidth >= minWidth) {
                return  idealWidth; 
            } else { 
                return minWidth; 
            }
        }

        var fieldWidth = calcFieldWidth();
        //console.log(fieldSelector + ": result width " + fieldWidth);
        //subtract cardWidth to stay within fieldWidth
        var step = calcStep(fieldWidth - cardWidth, N);
        //change width of the entire field to fit its content
        $field.attr('fw', fieldWidth + "px");
        self.$cards.each(function(index) {
            $(this).attr("fx", step * index + "px");
        });
    }
    //place cards in the form of card fan
    function updateRadially() {
        var cardWidth = self.$cards.first().width();
        var fullSector = 80;
        //to make fan symmetric
        var defaultAngle = -fullSector / 2;
        var step = calcStep(fullSector, self.$cards.length);
        self.$cards.each(function(index) {
            $(this).attr('frotate', step * index + defaultAngle);
        });
    }

    function updateVertically() {
        var cardHeight = self.$cards.first().height();
        //subtract field height to stay within it
        var step = calcStep($field.height() - cardHeight, self.$cards.length);
        self.$cards.each(function(index) {
            $(this).attr('fy', step * index);
        });
    }

    // for hover
    function pop($card, finalY) {
        $card.attr('fy', finalY);
        animateCard($card, popTime);
    }


    /*
     Adds $card (with its shirt, suit and value) to the $field and
     update $cards list. You need to call update to display this changes.
     If you have several new cards to add, you should call this function
     several times and then display all changes in one update call to
     save resources.
     Set her state to default:
        status - alive
        opacity - 0.0
        transformOrigin - 50px, 40px
        transformation - equal to the transformation of the last card in the deck or all 0

     Parameters:
        $card - jQuery object (must not be appended to any DOM object)
    */
    this.add$Card = function($card) {
        $card.css({
            opacity: 0.0,
            transformOrigin: '50px 180px'
        });
        $card.attr('status', 'alive');
        var $last = this.$cards.last();
        $card.css(getTransformCSS($last));
        $field.append($card);
        this.$cards = $field.find('.card[status="alive"]');
    };
    /*
     Removes $card from the $cards list and
     starts the process of removing $card from $field by marking it as dead.
     You need to call update to display this changes.
     If you have several cards to remove, you should call this function
     several times and then display all changes in one update call to
     save resources.

     Parameters:
        $card - jQuery object in the $field
     */
    this.remove$Card = function($card) {
        //mark it with status='dead'
        $card.attr('status', 'dead');
        this.$cards = $field.find('.card[status="alive"]');
    };
    /*

     */
    this.removeAll = function() {
        //console.log(fieldSelector + ": remove all cards");
        var $cards = this.$cards;
        //console.log("$Cards = " + $cards);
        if (!$cards) { return; }
        $cards.attr('status', 'dead');
        this.$cards = $field.find('.card[status="alive"]');
    };

    /*
     Updates state of all cards in the deck
     via proper animations. It is thread safe, and it is
     possible to call it before the previous update is finished.

     Parameters:
        time - how much the update will last. Default: updateTime
     */
    this.update = function(time) {
        time = time || updateTime;
        //console.log(fieldSelector + ": update is started with time: " + time);
        //console.log(fieldSelector + ": number of alive cards: " + this.$cards.length);
        if (this.$cards.length !== 0) {
            updatePosition();
        }
        animateAll(time);
        //console.log(fieldSelector + ": update has been finished");
    };
    /*
    Moves $card up slightly in deck's popTime.
    Animation will start immediately but this function is
    thread safe, and it is possible to call popDown before
    it ends.

    Parameters:
        $card - jQuery object in the $field
     */
    this.popUp = function($card) {
        pop($card, -35);
    };
    /*
     Returns $card to its default y position in deck's popTime.
     Animation will start immediately but this function is
     thread safe, and it is possible to call popUp before
     it ends.

     Parameters:
     $card - jQuery object in the $field
     */
    this.popDown = function($card) {
        pop($card, 0);
    };
}//End Deck
