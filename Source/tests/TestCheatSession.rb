#!/bin/env ruby
# encoding: utf-8
require 'capybara'
#require 'capybara-webkit' sdfasdf
require 'capybara/poltergeist'
require 'rubygems'
require 'socket.io-client-simple'
require 'capybara/rspec'

#stop tests after first failure
RSpec.configure do |c|
  c.fail_fast = true
end


#default values for capybara driver
Capybara.default_wait_time = 5 #seconds
Capybara.default_selector = :css
#file containing all javascript logs from 4 browsers
jsLog = File.open("cheatSession.txt", 'w')
jsLog.write("Time  " + Time.now.inspect + "\n")
#register :my_poltergeist driver
Capybara.register_driver :my_poltergeist do |app|
	options = { 
		:debug => false,
		:phantomjs_logger => jsLog,
		:logger => nil
		}
  	Capybara::Poltergeist::Driver.new(app, options)
end
#for initializing
def getNewPlayers
	def initPlayer
		session = Capybara::Session.new(:my_poltergeist)
		session.visit("file:///home/saasbook/Documents/Cheat/Source/index.html")
		session.assert_selector('.card', :visible => true, :count => 36)
		suit = session.first(".player-bottom .card.open")[:suit]
		p "player with suit " + suit + " is ready" 
		Thread.current["pair"] = [suit, session]
	end

	restarted = false
	threads = []
	socket = SocketIO::Client::Simple.connect 'http://localhost:25002'
	socket.on :connect do
	  	socket.emit :restart
	end

	socket.on :restarted do
		p "server was restarted"
		4.times do
			threads << Thread.new { initPlayer } 
		end
		restarted = true
	end

	until restarted do
		#wait utill server restart
	end

	threads.each {|thr| thr.join }
	return Hash[ threads.map {|thr| thr["pair"]} ]
end

#CSS makers
def makeValueCSS(value = "")
  return (value == "") ? "" : "[value='" + value + "']"
end

def makeSuitCSS(suit = "")
  return (suit == "") ? "" : "[suit='" + suit + "']"
end

def makeShirtCSS(shirt = "")
  return (shirt == "") ? "" : "[class*='" + shirt + "']"
end

def makeCardCSS(field, shirt = "", value = "", suit = "")
  shirt = makeShirtCSS(shirt)
  value = makeValueCSS(value)
  suit = makeSuitCSS(suit)
  return field + " .card[status='alive']" + shirt + value + suit
end

#INPUT emulation through jQuery
def trigger(player, selector, event)
	player.execute_script('$("'+ selector +'").trigger("' + event + '");')
end

def emulate(player, field, event, shirt="", cardValue="", suit="")
  cardCSS = makeCardCSS(field, shirt, cardValue, suit)
  trigger(player, cardCSS, event)
end

#Checkers
def getCardsCount(player, field)
  return player.all(field + " .card[status='alive']").size
end

def checkCount(player, field, count, shirt = "", cardValue = "") 
  cardCSS = makeCardCSS(field, shirt, cardValue)
  expect(player).to have_css(cardCSS, visible: true, count: count)
end 

def hasCard(player, field, value, suit)
  cardCSS = makeCardCSS(field, "open", value, suit)
  expect(player).to have_css(cardCSS, visible: true, count: 1)
end

def hasNoCard(player, field, value, suit)
  cardCSS = makeCardCSS(field, "open", value, suit)
  expect(player).to have_no_css(cardCSS, visible: true)
end

def checkIdleState(current, others, mainCardsCount, shirt = "", targetCardValue = "", pileCardsCount = 0) 
  checkCurrentCount = lambda do
    checkCount(current, ".main-field", mainCardsCount, "")
    checkCount(current, ".pile", pileCardsCount, "shirt")
  end

  checkCurrentCount.call

  others.each do |player|
    bottomCardsCount = getCardsCount(player, ".player-bottom")

    checkOtherCount = lambda do
      checkCount(player, ".main-field", mainCardsCount, shirt, targetCardValue)
      checkCount(player, ".player-bottom", bottomCardsCount, "open")
      checkCount(player, ".pile", pileCardsCount, "shirt")
    end

    checkOtherCount.call
    emulate(player, ".main-field", "click")
    checkOtherCount.call
    emulate(player, ".player-bottom", "click", "open")
    checkOtherCount.call    
  end

  checkCurrentCount.call
end

#operations and checks for addingState
def transfer(current, from, to , value, suit)
  fromCount = getCardsCount(current, from)
  toCount = getCardsCount(current, to)

  emulate(current, from, "click", "open", value, suit)

  hasNoCard(current, from, value, suit)
  hasCard(current, to, value, suit)

  checkCount(current, from, fromCount - 1, "open") 
  checkCount(current, to, toCount + 1)  
end

def placeCard(current, value, suit)
  transfer(current, ".player-bottom", ".main-field", value, suit)
end

def removeCard(current, value, suit)
  transfer(current, ".main-field", ".player-bottom", value, suit)
end

#operations and checks for checkingState
def checkCard(current, cardIndex)
  cards = current.all(".main-field .card[status='alive']")
  #p cards[cardIndex].methods
  cards[cardIndex].click
end


describe "Cheat card game." do
	before(:all) do
		players = getNewPlayers

    	@player1 = players["♠"]
    	@player2 = players["♦"]
    	@player3 = players["♥"]
    	@player4 = players["♣"]

      @players = [@player1, @player2, @player3, @player4]
  end

  	describe "Session for 4 players." do

  		it "All players should have 9 cards" do
        @players.each do |player|
          checkCount(player, ".player-bottom", 9, "open")
        end
  		end

  		it "Player1 card 6 should appear on the table after click" do
        placeCard(@player1, "6", "♠")
  		end

  		it "Other players should not be able to do anything with one card on main-field" do
        others = [ @player2, @player3, @player4]
        checkIdleState(@player1, others, 1, "shirt1") 
  		end

      it "Player1 should remove 6 from main field" do
        removeCard(@player1, "6", "♠")
      end

      it "Other player should see empty main field" do
        others = [ @player2, @player3, @player4]
        others.each {|player| checkCount(player, ".main-field", 0, "shirt1") }    
      end

      it "Player1 should place cards 6 and 7" do
        placeCard(@player1, "6", "♠")
        placeCard(@player1, "7", "♠")  
      end

      it "Other players should see two cards from player1" do
        others = [@player2, @player3, @player4]
        others.each {|player| checkCount(player, ".main-field", 2, "shirt1") }    
      end      

  		it "Player1 should see choose round card menu" do 
        emulate(@player1, ".main-field", "swipeup")
  			checkCount(@player1, ".main-field", 8, "open")
  		end

  		it "Other players should see no difference on the main field" do
        others = [ @player2, @player3, @player4]
  			others.each {|player| checkCount(player, ".main-field", 2, "shirt1") } 
  		end

      it "Player1 player should choose 6 as round card" do
        emulate(@player1, ".main-field", "click", "open", "6")
        checkCount(@player1, ".main-field", 2, "shirt1", "6") 
        #current player has been changed to player2
      end

      it "Other players should not be able to do anything with two 6 cards on main-field" do
        others = [ @player1, @player3, @player4]
        checkIdleState(@player2, others, 2, "shirt1", "6") 
      end

      it "Player2 should open 6 and take cards" do
        #@player2.save_screenshot("problem2.png")
        checkCard(@player2, 0)

        checkCount(@player2, ".main-field", 0) 
        checkCount(@player1, ".main-field", 0) 
        
        checkCount(@player2, ".player-bottom", 11, "open") 
        hasCard(@player2, ".player-bottom", "6", "♠")
        hasCard(@player2, ".player-bottom", "7", "♠")
        #current player has been changed to @player3
      end

      it "Player3 should put 8 on main field" do
        placeCard(@player3, "8", "♥")
      end

      it "Other player should do nothing with the 8 card on main field" do
        others = [ @player1, @player2, @player4]
        checkIdleState(@player3, others, 1, "shirt3") 
      end

      it "Player3 should see choose round card menu" do
        emulate(@player3, ".main-field", "swipeup")
        checkCount(@player3, ".main-field", 8, "open")
      end

      it "Player3 should choose 9 as a round card" do
        emulate(@player3, ".main-field", "click", "open", "9")
        checkCount(@player3, ".main-field", 1, "shirt3", "9") 
        #current player has been changed to player4
      end

      it "Player4 should catch player3 on bullshit" do
        checkCard(@player4, 0)

        checkCount(@player4, ".main-field", 0) 
        checkCount(@player3, ".main-field", 0) 

        checkCount(@player4, ".player-bottom", 9, "open") 
        hasCard(@player3, ".player-bottom", "8", "♥")
      end

      it "Player4 should place 10" do
        placeCard(@player4, "10", "♣")
      end

      it "Other players should not be able to do anything with one card on main-field from player4" do
        others = [ @player1, @player2, @player3]
        checkIdleState(@player4, others, 1, "shirt4") 
      end

  	end 
end
=begin
players = getNewPlayers
#server assumes such order of suits 
player1, player2, player3, player4 = players[ "♠" ], players["♦"], players["♥"], players["♣"]
p "player one should be able to move his card"
card_first = player1.first(".player-bottom .card.open")
card_value = card_first
=end