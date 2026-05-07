App.Character = Ember.Object.extend({
	player : false,
	handle_player: false,
	took : 0,
	taking : false,
	built : 0,
    max_build : 1,
    can_build : function() {
		return this.get('built') < this.get('max_build');
	}.property('built'),
	used_workshop : false,
	used_lab : false,
	used_museum : false,
	thanked : false,
	is_current : false,
	status : 'in_round', //in_round, in_hand, discarded
    pic_class : "",
	state : 'normal', //assassinated, robbed, bewitched
	revealed: false,
	reveal : function(game) {
	   this.set('revealed', true);
	   if (this.get('state') == 'assassinated' || this.get('status') == 'discarded') 
	   		if (!this.get('player') || !this.get('player').hasDistrict('hospital'))
		    {
		   		this.endTurn(game);
		   		return;
		    }
	   
	   if (this.get('state') == 'robbed')
	   {
		   var thief_owner = game.get('characters').get('content').findBy('name', 'Thief').get('handle_player');
		   var coins = this.get('player').get('coins');
		   this.get('player').set('coins', 0);
		   thief_owner.set('coins', thief_owner.get('coins') + coins);
	   }
	   
	   this.set('handle_player', this.get('player'));
	   game.set('activePlayer', this.get('handle_player'));
	   this.set('is_current', true);
	},
	canTake : true,
	takeCoins : function(game) {
		if (this.get('took') || this.get('taking')) return;
		this.set('taking', true);
		this.get('handle_player').set('coins', this.get('handle_player').get('coins') + 2);
		this.set('took', 1 + this.get('handle_player').hasDistrict('library'));
		this.checkAssassinated(game);
		this.checkBewitched(game);
		this.checkThanked(game);
	},
	chooseCard : function(game) {
		if (this.get('took') || this.get('taking')) return;
		this.set('taking', true);
		var n, chosen;
		var deck_content = game.get('deck').get('content');
		var deck_length = deck_content.length;
		
		var cards_to_choose = this.get('handle_player').hasDistrict('observatory') ? 3 : 2;
		
		for (var j=0; j<cards_to_choose; j++)
		{
			chosen = false;
			while (!chosen)
			{
				n = Math.floor(Math.random() * deck_length);
				var card = deck_content.objectAt(n);
				if (card.get('status') == 'in_deck')
				{
					card.set('status', 'on_choice');
					card.set('player', this.get('handle_player'));
					chosen = true;
				}
			}
		}
		
		if (1 + this.get('handle_player').hasDistrict('library') == cards_to_choose)
		{
			var cards_on_choice = deck_content.filterBy('status', 'on_choice');
			for (var k=0; k<cards_on_choice.length; k++)
				this.takeCard(game, cards_on_choice.objectAt(k));
		} 
			
	},
	takeCard : function(game, card)
	{		
		if (card && card.get('status') == 'on_choice' && card.get('player') === this.get('handle_player'))
		{
			card.set('status','in_hand');
			this.get('handle_player').get('cards').pushObject(card);
		}
		
		this.set('took', this.get('took') + 1);
				
		if (this.get('took') == 1 + this.get('handle_player').hasDistrict('library')) {
			
			game.get('deck').get('content').filterBy('status','on_choice').forEach(function(card) {
					card.set('status','in_deck');
					card.set('player',false);
				});
			this.checkAssassinated(game);
			this.checkBewitched(game);
			this.checkThanked(game);
		}		
	},
	build : function(game, card) {
		if (this.get('built') == this.get('max_build')) return;
		if (!this.get('took') || game.get('deck').get('cards_on_choose')) return;
		if (card.get('status') != 'in_hand') return;
		if (card.get('player')!== this.get('handle_player')) return;
		
		var build_cost = card.get('cost') - (this.get('handle_player').hasDistrict('factory') && card.get('color') == 'purple');
		
		if (build_cost > this.get('handle_player').get('coins'))
		{
			game.showError("You don't have enough coins to build this district");
			return;
		}
		
		if (this.get('handle_player').get('districts').filterBy('name', card.get('name')).length > this.get('handle_player').hasDistrict('quarry'))
		{
			game.showError("You can't build dublicate district");
			return;
		}
				
		card.set('status','built');
		if (card.get('name') == 'belltower') this.get('handle_player').set('can_use_belltower', true);
		if (card.get('name') == 'lighthouse') this.get('handle_player').set('can_use_lighthouse', true);			
		this.get('handle_player').get('districts').pushObject(card);
		
		game.checkFirstClosed(this.get('handle_player'));
		
		this.get('handle_player').set('coins', this.get('handle_player').get('coins')-build_cost); 
		this.set('built',this.get('built')+1);
		this.get('handle_player').get('cards').removeObject(card);
	},
	endTurn : function(game) {
		if (this.get('status') == 'in_hand') this.payTax(game);
		if (this.get('handle_player') 
		    && !this.get('handle_player').get('coins') 
		    && this.get('handle_player').hasDistrict("poorhouse"))
		    this.get('handle_player').set('coins',1);
		if (this.get('handle_player') 
		    && !this.get('handle_player').get('cards').length 
		    && this.get('handle_player').hasDistrict("park"))
		    game.drawCards(this.get('handle_player'), 2);
		if (this.get('handle_player') && this.get('handle_player').get('can_use_belltower'))
			this.get('handle_player').set('can_use_belltower', false);
		if (this.get('handle_player') && this.get('handle_player').get('using_lighthouse'))
			this.get('handle_player').set('using_lighthouse', false);
		if (this.get('handle_player') && this.get('handle_player').get('can_use_lighthouse'))
			this.get('handle_player').set('can_use_lighthouse', false);
		if (this.get('handle_player') && this.get('handle_player').get('exploding'))
			this.get('handle_player').set('exploding', false);
		this.set('is_current', false);
		game.nextCharacter();
	},
	payTax : function(game) {
		var tax = game.get('characters').get('content').findBy('name', 'Tax');
		if (tax && tax.get('status') == 'in_hand') {
			if (tax.get('state') == 'assassinated') return;
			var tax_owner = tax.get(this.get('isAssassin') ? 'player' : 'handle_player');
			if (tax_owner === this.get('handle_player')) return;
			if (!this.get('built')) return;
			if (!this.get('handle_player').get('coins')) return;
			this.get('handle_player').set('coins', this.get('handle_player').get('coins') - 1);
			tax_owner.set('coins', tax_owner.get('coins') + 1);
		}
	},
	checkBewitched : function(game) {
		if (this.get('state') == 'bewitched') {
			var witch_owner = game.get('characters').get('content').findBy('name', 'Witch').get('player');
			this.set('handle_player', witch_owner);
			game.set('activePlayer', witch_owner);
		}
	},
	checkAssassinated : function(game) {
		if (this.get('state') == 'assassinated') this.endTurn(game);
	},
	checkThanked : function(game) {
		if (this.get('state') == 'bewitched') return;
		var ballroom = game.get('deck').get('content').findBy('name', 'ballroom');
		if (ballroom && ballroom.get('status') == 'built')
		{
			var ballroom_owner = ballroom.get('player');
			if (ballroom_owner !== this.get('player')
			&& ballroom_owner.get('has_crown') && !this.get('thanked'))
				this.endTurn(game);
		}
	},
	useWorkshop : function(game) {
		if (!this.get('handle_player').get('hasWorkshop')) return;
		if (this.get('used_workshop')) return;
		
		if (this.get('handle_player').get('coins') < 2)
		{
			game.showError("Not enough coins");
			return;
		}
		this.get('handle_player').set('coins', this.get('handle_player').get('coins')-2);
		
		game.drawCards(this.get('handle_player'), 3);
		
		this.set('used_workshop', true);
	},
	useLab : function(card) {
		if (!this.get('handle_player').get('hasLab')) return;
		if (this.get('used_lab')) return;
		
		if ((card.get('status') == 'in_hand' || card.get('status') == 'on_wizard') && card.get('player') === this.get('handle_player'))
		{
			card.set('status', 'in_lab');
			card.set('player', false);
			this.get('handle_player').get('cards').removeObject(card);
			this.get('handle_player').set('coins', this.get('handle_player').get('coins') + 1);
			this.set('used_lab', true);
		}
	},
	underMuseum : function(game, card) {
		if (!this.get('handle_player').get('hasMuseum')) return;
		if (this.get('used_museum')) return;
		if (card.get('status') != 'in_hand' && card.get('status') != 'on_wizard') return;
		if (card.get('player') !== this.get('handle_player')) return;
		
		card.set('status', 'in_museum');
		this.get('handle_player').get('cards').removeObject(card);
		card.set('player', false);
		game.get('player1').set('cards_under_museum', game.get('player1').get('cards_under_museum') + 1);
		game.get('player2').set('cards_under_museum', game.get('player2').get('cards_under_museum') + 1);
		this.set('used_museum', true);
	},
	resetParams : function() {
		this.set('player', false);
		this.set('handle_player', false);
		this.set('took', 0);
		this.set('taking',false);
		this.set('revealed', false);
		this.set('built', 0);
		this.set('state','normal');
		this.set('status','in_round');
		this.set('used_workshop', false);
		this.set('used_lab', false);
		this.set('used_museum', false);
		this.set('thanked', false);
	},
	thanksYourExcellency : function() {
		this.set('thanked', true);
	},
	inRound : function() {
		return this.get('status') == 'in_round';
	}.property('status'),
	isAssassinated : function() {
		return this.get('state') == 'assassinated';
	}.property('state'),
	isRobbed : function() {
		return this.get('state') == 'robbed';
	}.property('state'),
	isBewitched : function() {
		return this.get('state') == 'bewitched';
	}.property('state'),
	isWarlordAndHuman : Ember.computed('name', 'player', 'player.is_robot', function() {
		return this.get('name') == 'Warlord' && this.get('player') && !this.get('player').get('is_robot');
	}),
	isDiplomatAndHuman : Ember.computed('name', 'player', 'player.is_robot', function() {
		return this.get('name') == 'Diplomat' && this.get('player') && !this.get('player').get('is_robot');
	}),
	serialize : function() {
		return {
			"player" : this.get('player') ? this.get('player').get('name') : false,
			"handle_player" : this.get('handle_player') ? this.get('handle_player').get('name') : false,
			"revealed" : this.get('revealed'),
			"took" : this.get('took'),
			"taking" : this.get('taking'),
			"built" : this.get('built'),
			"used_workshop" : this.get('used_workshop'),
			"used_lab" : this.get('used_lab'),
			"used_museum" : this.get('used_museum'),
			"status" : this.get('status'),
			"state" : this.get('state'),
			"thanked" : this.get('thanked'),
			"is_current" : this.get('is_current')
		}	
	}
});

App.Assassin = App.Character.extend({
	name : "Assassin",
	desc: "Assassin. May select a character to Assassinate. That character loses their turn.",
	isAssassin : true,
	number : 1,
	pic_class: "character1",
	assassinated: false,
	assassinate : function(character) {
		if (this.get('assassinated')) return;
		if (character.get('isAssassin')) return;
		character.set('state','assassinated');
		this.set('assassinated', true);
	},
	resetParams : function() {
		this._super();
		this.set('assassinated', false);
	},
	serialize : function() {
		var ret = this._super();
		ret['assassinated'] = this.get('assassinated');
		return ret;
	}
}
);

App.Thief = App.Character.extend({
	name: "Thief",
	desc: "Thief. May select a character to steal from. At the start of their turn, the Thief takes their gold.",
	isThief: true,
	pic_class: "character2",
	number: 2,
	robbed: false,
	rob : function(character) {
		if (this.get('robbed')) return;
		if (character.get('number') == 1 || character.get('isThief')) return;
		if (character.get('state') == 'assassinated') return;
		if (character.get('state') == 'bewitched') return;
		character.set('state','robbed');
		this.set('robbed',true);
	},
	resetParams : function() {
		this._super();
		this.set('robbed', false);
	},
	serialize : function() {
		var ret = this._super();
		ret['robbed'] = this.get('robbed');
		return ret;
	}
});

App.Magician = App.Character.extend({
	name: "Magician",
	desc: "Magician. May either exchange hands with another player, or swap cards in his hand for cards from the deck.",
	isMagician: true,
	pic_class: "character3",
	number: 3,
	did_magic: false,
	choosed_to_discard : false,
	discarded: false,
	exchange_cards : function(game, player) {
		if (this.get('did_magic')) return false;
		var cards_in_hand = game.get('deck').get('content').filterBy('status','in_hand');
		for (var j=0; j<cards_in_hand.length; j++)
		{
			var card = cards_in_hand.objectAt(j)
			if (card.get('player') === player) 
			{
				card.set('player',this.get('handle_player'));
				this.get('handle_player').get('cards').pushObject(card);
				player.get('cards').removeObject(card);
			}
			else if (card.get('player') === this.get('handle_player')) 
			{
				card.set('player',player);
				player.get('cards').pushObject(card);
				this.get('handle_player').get('cards').removeObject(card);
			}	
		}
		
		this.set('did_magic', true);	
	},
	chooseToDiscard : function() {
		if (this.get('did_magic')) return;
		this.set('choosed_to_discard', true);
		this.set('did_magic', true);
	},
	discardCards : function(game) {
		if (!this.get('choosed_to_discard')) return;
		if (this.get('discarded')) return;
		var n, draw;
		var deck_content = game.get('deck').get('content');
		var checked_cards = deck_content.filterBy('isChecked', true);
		game.drawCards(this.get('handle_player'), checked_cards.length);
		
		var that = this;
		checked_cards.forEach(function(item) {
			item.set('isChecked', false);
			item.set('status', 'in_deck');
			item.set('player', false);
			that.get('handle_player').get('cards').removeObject(item);
		});
		
		this.set('choosed_to_discard', false);
		this.set('discarded', true);	
	},
	resetParams : function() {
		this._super();
		this.set('did_magic', false);
		this.set('choosed_to_discard', false);
		this.set('discarded', false);
	},
	serialize : function() {
		var ret = this._super();
		ret['did_magic'] = this.get('did_magic');
		ret['choosed_to_discard'] = this.get('choosed_to_discard');
		ret['discarded'] = this.get('discarded');
		return ret;
	}
});

App.ColourCharacter = App.Character.extend({
	color: "",
	isColor: true,
	took_income : false,
	takeIncome : function()
	{
		if (this.get('took_income')) return;
		var player_districts = this.get('handle_player').get('districts');
		for (var j=0; j<player_districts.length; j++)
			if (player_districts.objectAt(j).get('color') == this.get('color'))
				this.get('handle_player').set('coins', this.get('handle_player').get('coins') + 1);
		this.get('handle_player').set('coins', this.get('handle_player').get('coins') + this.get('handle_player').hasDistrict('school'));
		this.set('took_income', true);
	},
	resetParams : function() {
		this._super();
		this.set('took_income', false);
	},
	serialize : function() {
		var ret = this._super();
		ret['took_income'] = this.get('took_income');
		return ret;
	}
});

App.King = App.ColourCharacter.extend({
	name: "King",
	desc: "King. Receives income for Noble (yellow) Districts. Also gets first choice of characters during the next turn.",
	number: 4,
	color: "yellow",
	pic_class: "character4",
	reveal : function(game) {
		if (this.get('status') == 'in_hand') game.setCrownTo(this.get('player'));	
		this._super(game);
	}
});

App.Bishop = App.ColourCharacter.extend({
	name: "Bishop",
	desc: "Bishop. Receives income from Religious (blue) Districts. His Buildings cannot be Destroyed by the Warlord or swapped by the Diplomat.",
	number: 5,
	color: "blue",
	pic_class: "character5"
});

App.Merchant = App.ColourCharacter.extend({
	name: "Merchant",
	desc: "Merchant. Receives income from Trade (green) Districts. Also receives one gold at the start of his turn.",
	number: 6,
	color: "green",
	pic_class: "character6",
	takeCoins: function(game)
	{
		if (this.get('took')) return;
		this._super(game);
		if (this.get('is_current')) this.get('handle_player').set('coins', this.get('handle_player').get('coins')+1);
	},
	takeCard(game, card) {
		this._super(game, card);
		if (this.get('is_current'))
			if (this.get('took') == 1 + this.get('player').hasDistrict('library'))
				this.get('handle_player').set('coins', this.get('handle_player').get('coins')+1);
	}
});

App.Architect = App.Character.extend({
	name: "Architect",
	desc: "Architect. Receives 2 additional cards when he takes his 2 gold or 1 card. Can build up to 3 Districts per turn.",
	number: 7,
	pic_class: "character7",
	max_build : 3,
	takeCoins: function(game)
	{
		if (this.get('took')) return;
		this._super(game);
		if (this.get('is_current')) this.take2Cards(game);
	},
	takeCard(game, card) {
		this._super(game, card);
		if (this.get('is_current'))
		    if (this.get('took') == 1 + this.get('player').hasDistrict('library'))
			    this.take2Cards(game);
	},
	take2Cards(game) {
		game.drawCards(this.get('handle_player'), 2);
	}
});

App.Warlord = App.ColourCharacter.extend({
	name: "Warlord",
	desc: "Warlord. Receives income from Military (red) Districts. At the end of his turn, he may destroy a District for the cost of that District -1 gold.",
	isWarlord: true,
	number: 8,
	pic_class: "character8",
	color: "red",
	destroyed : false,
	destroy : function(game, player_to, district) {
		if (this.get('destroyed')) return;
		
		if (player_to.get('closed')) 
		{
			game.showError("You can't destroy district in the city with "+player_to.get('districts_to_close')+" or more districts"); 
			return;
		}
		
		if (district.get('name') == 'keep')
		{
			game.showError("Keep can not be destroyed"); 
			return;
		}
		
		var bishop = game.get('characters').get('content').findBy('name','Bishop');
		if (bishop && bishop.get('state')!='assassinated' && bishop.get('handle_player') === player_to)
		{
			game.showError("You can't destroy Bishop's district"); 
			return;
		}
		
		if (district.get('cost') + player_to.hasDistrict('greatwall') - (district.get('name') == 'greatwall') - 1 > this.get('handle_player').get('coins'))
		{
			game.showError("You have not enough coins to destroy this district"); 
			return;
		}
		
		if (district.get('status') == 'built' && district.get('player') === player_to)
		{
			this.get('handle_player').set('coins',this.get('handle_player').get('coins')-district.get('cost')-player_to.hasDistrict('greatwall')+(district.get('name') == 'greatwall')+1);
			player_to.get('districts').removeObject(district);
			district.set('status', player_to.get('hasGraveyard') && player_to.get('coins') ? 'on_graveyard' : 'destroyed');
			if (player_to.get('hasGraveyard') && player_to.get('coins')) player_to.set('on_graveyard', true);
			if (district.get('name') == 'belltower') player_to.cancelRing(game);
			district.set('player', false);
			this.set('destroyed',true);
		}
	},
	resetParams : function() {
		this._super();
		this.set('destroyed', false);
	},
	serialize : function() {
		var ret = this._super();
		ret['destroyed'] = this.get('destroyed');
		return ret;
	}
});

App.Witch = App.Character.extend({
	name : "Witch",
	desc : "Witch. Can Bewitch a character of her choice, playing part of her turn with the chosen character skills.",
	isWitch : true,
	number : 1,
	pic_class: "character11",
	max_build: 0,
	bewitched : false,
	bewitch : function(character) {
		if (this.get('bewitched')) return;
		if (character.get('isWitch')) return;
		character.set('state','bewitched');
		this.set('bewitched', true);
	},
	resetParams : function() {
		this._super();
		this.set('bewitched', false);
	},
	serialize : function() {
		var ret = this._super();
		ret['bewitched'] = this.get('bewitched');
		return ret;
	}
});

App.TaxCollector = App.Character.extend({
	name : "Tax",
	desc : "Tax Collector. Each other player that builds at least one District in her turn, gives one gold to the Tax Collector.",
	number : 2,
	pic_class: "character12"
});

App.Wizard = App.Character.extend({
	name: "Wizard",
	number : 3,
	desc: "Wizard. Can choose a card from the hand of another player. Then, he can choose to put in his hand or to build it, regardless of the normal building in this turn.",
	pic_class: "character13",
	isWizard : true,
	stole : false,
	wizard_built : false,
	stealCard : function(player, card) {
		if (this.get('stole')) return;
		card.set('status', 'on_wizard');
		card.set('player', this.get('handle_player'));
		player.get('cards').removeObject(card);
		this.get('handle_player').get('cards').pushObject(card);
		this.set('stole', true);
	},
	wizardBuild : function(game, card) {
		if (this.get('wizard_built')) return;
		if (card.get('status') != 'on_wizard') return;
		if (card.get('player')!== this.get('handle_player')) return;
		
		var build_cost = card.get('cost') - (this.get('handle_player').hasDistrict('factory') && card.get('color') == 'purple');
		
		if (build_cost > this.get('handle_player').get('coins'))
		{
			game.showError("You don't have enough coins to build this district");
			return;
		}
			
		card.set('status','built');			
		this.get('handle_player').get('districts').pushObject(card);
		this.get('handle_player').set('coins', this.get('handle_player').get('coins')-build_cost); 
		this.set('wizard_built', true);
		this.get('handle_player').get('cards').removeObject(card);
		
		game.checkFirstClosed(this.get('handle_player'));
	},
	resetParams : function() {
		this._super();
		this.set('stole', false);
		this.set('wizard_built', false);
	},
	endTurn : function(game) {
		if (this.get('status') == 'in_hand' && this.get('state')!='assassinated')
		{
			this.get('handle_player').get('cards').forEach(function(card) {
				card.set('status', 'in_hand');
			});
		}
		
		this._super(game);
	},
	serialize : function() {
		var ret = this._super();
		ret['stole'] = this.get('stole');
		ret['wizard_built'] = this.get('wizard_built');
		return ret;
	}
});

App.Emperor = App.ColourCharacter.extend({
	name: "Emperor",
	desc: "Emperor. Receives income from Noble (gold) Districts. You must give the Crown to another player, who has to pay you a gold piece or a card (your choice).",
	number: 4,
	color: "yellow",
	pic_class: "character14",
	isEmperor: true,
	coronated: false,
	resetParams : function() {
		this._super();
		this.set('coronated', false);
	},
	serialize : function() {
		var ret = this._super();
		ret['coronated'] = this.get('coronated');
		return ret;
	},
	canTake : function() {
		return this.get('coronated') || this.get('state') == 'bewitched';
	}.property('coronated'),
	coronate : function(game, player) {
		if (player!==this.get('handle_player')) 
		{
			if (!player.get('coins')) {
				player.giveCardForCrown(game);
				this.set('coronated', true);
			}
			else if (!player.get('cards').length) {
				player.giveCoinForCrown(game);
				this.set('coronated', true);
			}
			else player.set('on_coronation', true);
		}
	}
});

App.Abbot = App.ColourCharacter.extend({
	name: "Abbot",
	desc: "Abbot. Receives income from Religious (blue) Districts. The most rich player must give him a gold piece.",
	number: 5,
	color: "blue",
	pic_class: "character15",
	reveal : function(game) {
		if (this.get('state') == 'assassinated' || this.get('status') == 'discarded' || this.get('state') == 'bewitched')
		{
			this._super(game);
		}
		else {
			this._super(game);
			this.stealCoin(game);
		} 
	},
	checkBewitched : function(game) {
		this._super(game);
		if (this.get('state') == 'bewitched') this.stealCoin(game);
	},
	stealCoin : function(game) {
		var handle_player = this.get('handle_player');
		var player_from = handle_player === game.get('player2') ? game.get('player1') : game.get('player2');
		if (player_from.get('coins') > handle_player.get('coins'))
		{
			player_from.set('coins', player_from.get('coins') - 1);
			handle_player.set('coins', handle_player.get('coins') + 1);
		}
	}
});

App.Alchemist = App.Character.extend({
	name: "Alchemist",
	desc: "Alchemist. He receives the total cost of a District after building it.",
	number: 6,
	pic_class: "character16",
	build : function(game, card) {
		if (this.get('built') == this.get('max_build')) return;
		var coins_to_return = card.get('cost') - (this.get('handle_player').hasDistrict('factory') && card.get('color') == 'purple');
		this._super(game, card);
		if (this.get('built')) this.get('handle_player').set('coins', this.get('handle_player').get('coins') + coins_to_return);
	}
});

App.Navigator = App.Character.extend({
	name: "Navigator",
	desc: "Navigator. You can take 4 gold or 4 cards. You cannot build.",
	isNavigator: true,
	number: 7,
	max_build: 0,
	pic_class: "character17",
	navigated: false,
	take4Cards : function(game) {
		if (this.get('navigated')) return;
		game.drawCards(this.get('handle_player'), 4);
		this.set('navigated', true);
	},
	take4Coins : function() {
		if (this.get('navigated')) return;
		this.get('handle_player').set('coins', this.get('handle_player').get('coins') + 4);
		this.set('navigated', true);
	},
	resetParams : function() {
		this._super();
		this.set('navigated', false);
	},
	serialize : function() {
		var ret = this._super();
		ret['navigated'] = this.get('navigated');
		return ret;
	}
});

App.Diplomat = App.ColourCharacter.extend({
	name: "Diplomat",
	desc: "Diplomat. Receives income from Military (red) Districts. He can swap a Distritct he owns for one of other player's (except the Bishop), paying them the difference.",
	isDiplomat: true,
	number: 8,
	color: "red",
	pic_class: "character18",
	swapped: false,
	resetParams : function() {
		this._super();
		this.set('swapped', false);
	},
	serialize : function() {
		var ret = this._super();
		ret['swapped'] = this.get('swapped');
		return ret;
	},
	swap : function(game, player, district) {
			if (this.get('swapped')) return;
			if (player === this.get('handle_player')) return;
			if (district.get('status') == 'on_swap') return;
			if (district.get('player').get('districts').filterBy('status', 'on_swap').length) return;
			district.set('status', 'on_swap');
			if (!this.get('handle_player').get('districts').filterBy('status', 'on_swap').length ||
			!player.get('districts').filterBy('status', 'on_swap').length) return;
			var compensation = 0;
			var your_district = this.get('handle_player').get('districts').findBy('status', 'on_swap');
			var enemy_district = player.get('districts').findBy('status', 'on_swap');
			
			if (player.get('closed')) 
			{
				game.showError("You can't swap district in the city with "+player.get('districts_to_close')+" or more districts"); 
				
			}
			else if (enemy_district.get('name') == 'keep')
			{
				game.showError("Keep can not be swapped");
			}
			else if (player.get('characters').findBy('name', 'Bishop') && player.get('characters').findBy('name', 'Bishop').get('state')!='assassinated'
			&& player.get('characters').findBy('name', 'Bishop').get('handle_player') === player)
			{
				game.showError("You cannot swap with Bishop");
			}
			else if (enemy_district.get('cost') + player.hasDistrict('greatwall') - (enemy_district.get('name') == 'greatwall') > your_district.get('cost') + this.get('handle_player').get('coins'))
			{
				game.showError("Not enough coins to swap this district");
			}
			else if (player.get('districts').filterBy('name', your_district.get('name')).length > player.hasDistrict('quarry')
			|| this.get('handle_player').get('districts').filterBy('name', enemy_district.get('name')).length > this.get('handle_player').hasDistrict('quarry'))
			{
			    game.showError("You cannot swap dublicate districts");
			}
			else {
				if (enemy_district.get('cost') + player.hasDistrict('greatwall') - (enemy_district.get('name') == 'greatwall') > your_district.get('cost'))
					compensation = enemy_district.get('cost') + player.hasDistrict('greatwall') - (enemy_district.get('name') == 'greatwall') - your_district.get('cost');
				this.get('handle_player').set('coins', this.get('handle_player').get('coins') - compensation);
				player.set('coins', player.get('coins') + compensation);
				player.get('districts').removeObject(enemy_district);
				player.get('districts').pushObject(your_district);
				this.get('handle_player').get('districts').removeObject(your_district);
				this.get('handle_player').get('districts').pushObject(enemy_district);
				your_district.set('player', player);
				enemy_district.set('player', this.get('handle_player'));
				if (your_district.get('name') == 'city') your_district.set('color', 'purple');
				if (enemy_district.get('name') == 'city') enemy_district.set('color', 'purple');
				this.set('swapped', true);
			}
			
			your_district.set('status', 'built');
			enemy_district.set('status', 'built');
	}
});

App.Characters = Ember.Object.extend({
	init() {
		this.set('content', []);
		var characters_content = this.get('content');
		characters_content.pushObject(this.inExtended(1) ? App.Witch.create() : App.Assassin.create());
		characters_content.pushObject(this.inExtended(2) ? App.TaxCollector.create() : App.Thief.create());
		characters_content.pushObject(this.inExtended(3) ? App.Wizard.create() : App.Magician.create());
		characters_content.pushObject(this.inExtended(4) ? App.Emperor.create() : App.King.create());
		characters_content.pushObject(this.inExtended(5) ? App.Abbot.create() : App.Bishop.create());
		characters_content.pushObject(this.inExtended(6) ? App.Alchemist.create() : App.Merchant.create());
		characters_content.pushObject(this.inExtended(7) ? App.Navigator.create() : App.Architect.create());
		characters_content.pushObject(this.inExtended(8) ? App.Diplomat.create() : App.Warlord.create());
	},
	extended : [],
	inExtended : function(number) {
		var extended = this.get('extended');
		for (var j=0; j<extended.length; j++)
			if (number == extended[j])
				return true;
		return false;
	}
});
