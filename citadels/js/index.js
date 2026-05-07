App.IndexRoute = Ember.Route.extend({
	model: function() {
		var game = App.Game.create();
		//localStorage.removeItem('game'); // temp for debug
		if (localStorage.getItem('game')) {
			var gameData = localStorage.getItem('game');
			game.load(gameData);
		}
		
		this.set('game', game);
		return game;
  },
  game : null,
  actions : {
  		start : function(gameName, yourName, robotName) {
  		   var extended = [];
  		   var cb_ext_arr = $('input[id^="cb_ext_"]:checked');
  		   
  		   if (this.get('game').get('is_extended') && !cb_ext_arr.length)
  		   {
  		   		this.get('game').showError('You should choose at least one extended character');
  		   		return;
  		   }
  		   
  		   var names_arr = {'Game name' : gameName, 'Your name' : yourName, 'Robot name' : robotName};
  		   
  		   for (var key in names_arr)
			   if (names_arr[key] && !names_arr[key].match('^[0-9A-Za-z_]+$'))
			   {
					this.get('game').showError(key+' can contain only the characters: 0-9, A-Z, a-z, _');
					return;
			   }
			   
		   if (yourName && robotName && yourName == robotName) {
			   this.get('game').showError('Your name and robot name should not be the same');
  		   		return;
		   } 
			
  		   for (var j=0; j<cb_ext_arr.length; j++)
					extended.push(parseInt(cb_ext_arr.eq(j).attr('id').substring(7)));

  		   this.get('game').start(gameName || "New Game", yourName || "Human", robotName || "Robot", extended);
  		},
  		setExtended : function() {
  			this.get('game').set('is_extended', $('input[name="game_type"]:checked').val() == 'extended');
  		},
  		randomExtended : function() {
			var gen_arr = [1,2,3,4,5,6,7,8];
			var ext_cnt = Math.random() < 0.5 ? 6 : 7;
			for (var i=0; i<ext_cnt; i++) gen_arr.splice(Math.floor(Math.random() * gen_arr.length), 1);
			$('input[id^="cb_ext_"]').prop('checked', false);
			for (var j=0; j<gen_arr.length; j++) {
				$('#cb_ext_'+gen_arr[j]).prop('checked', true);	
			}
		},
  		finish : function(game) {
  			game.finish();
  		},
  		restart : function(game) {
  			game.restart();
  		},
		takeCharacter : function(game, player, character) {
			player.takeCharacter(character);
			game.changePhaze();
		},
		discardCharacter : function(game, player, character) {
			player.discardCharacter(character);
			game.changePhaze();
		},
		takeCoins : function(game, character) {
			character.takeCoins(game);
		},
		chooseCards : function(game, character) {
			character.chooseCard(game);
		},
		takeCard : function(game, character, card) {
			character.takeCard(game, card);
		},
		build : function(game, character, card) {
			if (character && character.get('choosed_to_discard')) return;
			if (character) character.build(game, card);
		},
		endTurn : function(game, character) {
			character.endTurn(game);
		},
		assassinateCharacter : function(assassin, character)
		{
			assassin.assassinate(character);
		},
		bewitchCharacter : function(witch, character)
		{
			witch.bewitch(character);
		},
		robCharacter : function(robber, character)
		{
			robber.rob(character);
		},
		exchangeCards : function(game, character, player)
		{
			character.exchange_cards(game, player);
		},
		chooseToDiscard : function(character)
		{
			character.chooseToDiscard();
		},
		discardCards : function(game, character) {
			character.discardCards(game);
		},
		stealCard : function(character, player, card) {
			character.stealCard(player, card);
		},
		wizardBuild : function(game, character, card) {
			character.wizardBuild(game, card);
		},
		coronate : function(game, character, player) {
			character.coronate(game, player);
		},
		giveCoinForCrown : function(game, player) {
			player.giveCoinForCrown(game);
		},
		giveCardForCrown : function(game, player) {
			player.giveCardForCrown(game);
		},
		take4Coins : function(character) {
			character.take4Coins();
		},
		take4Cards : function(game, character) {
			character.take4Cards(game);
		},
		takeIncome : function(character) {
			character.takeIncome();
		},
		destroy : function(game, character, player_to, district) {
			if (player_to === game.get('activePlayer')) return;
			if (game.get('activePlayer') === game.get('player1') && game.get('player1Blocked')) return;
			if (game.get('activePlayer') === game.get('player2') && game.get('player2Blocked')) return;
			if (game.get('activePlayer').get('is_robot') && game.get('automatic')) return;
			if (character && character.get('isWarlord')) character.destroy(game, player_to, district);
		},
		swap : function(game, character, district) {
			var player_to = game.get('activePlayer') === game.get('player2') ? game.get('player1') : game.get('player2');
			if (game.get('activePlayer') === game.get('player1') && game.get('player1Blocked')) return;
			if (game.get('activePlayer') === game.get('player2') && game.get('player2Blocked')) return;
			if (game.get('activePlayer').get('is_robot') && game.get('automatic')) return;
			if (character && character.get('isDiplomat')) character.swap(game, player_to, district);
		},
		useWorkshop : function(game, character) {
			character.useWorkshop(game);
		},
		toLab : function(character, card) {
			character.useLab(card);
		},
		toMuseum : function(game, character, card) {
			character.underMuseum(game, card);
		},
		ringTheBell : function(game, player) {
			player.ringTheBell(game);
		},
		onExplode : function(player) {
			player.onExplode();
		},
		explode : function(game, player, district) {
			player.explodeArmory(game, district);
		},
		useLighthouse : function(player) {
			player.useLighthouse();
		},
		lighthouseTake : function(player, card) {
			player.lighthouseTake(card);
		},
		thanksYourExcellency : function(character) {
			character.thanksYourExcellency();
		},
		yesGraveyard : function(game, player_to) {
			player_to.useGraveyard(game, true);
		},
		noGraveyard : function(game, player_to) {
			player_to.useGraveyard(game, false);
		}	
  }
});
