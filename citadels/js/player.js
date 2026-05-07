App.Player = Ember.Object.extend({
	is_robot: false,
	time: 0,
	has_crown : false,
	name : null,
	closed : Ember.computed('districts.length', 'districts_to_close', function() {
		return this.get('districts').length >= this.get('districts_to_close');
	}),
	closed_first : false,
	districts_to_close : 8,
	coins : 2,
	cards_under_museum : 0,
	on_coronation: false,
	on_graveyard: false,
	districtOnSwap : Ember.computed('districts.@each.status', function() {
		return this.get('districts').filterBy('status', 'on_swap').length;
	}),
	giveCoinForCrown : function(game) {
		var emperor = game.get('characters').get('content').findBy('name', 'Emperor');
		var emperor_owner = emperor.get('handle_player');
		this.set('coins', this.get('coins') - 1);
		emperor_owner.set('coins', emperor_owner.get('coins') + 1);
		emperor.set('coronated', true);
		game.setCrownTo(this);
		this.set('on_coronation', false);
	},
	giveCardForCrown : function(game) {
		var emperor = game.get('characters').get('content').findBy('name', 'Emperor');
		var emperor_owner = emperor.get('handle_player');
		var cards = this.get('cards');
		if (cards.length) {
			var n = Math.floor(Math.random() * cards.length);
			var given_card = cards.objectAt(n);
			given_card.set('player', emperor_owner);
			cards.removeObject(given_card);
			emperor_owner.get('cards').pushObject(given_card);
		}
		emperor.set('coronated', true);
		game.setCrownTo(this);
		this.set('on_coronation', false);
	},
	hasAllColours : Ember.computed('districts.@each.color', function() {
		var colors = [];
		this.get('districts').forEach(function(item) {
			if (item.get('color')) colors.push(item.get('color'));
		});
		return colors.uniq().length >= 5;
	}),
	score : Ember.computed('districts.@each.color', 'closed', 'closed_first', 'coins', 'cards.[]', 'cards_under_museum', function() {
    	var ret = 0;
		this.get('districts').forEach(function(item) {
			ret += item.get('cost');
		});
		ret += this.hasDistrict('fountain') * 
		(this.get('districts').filterBy('color', 'purple').length
		 + this.get('districts').filterBy('color', 'city').length
		 - this.hasDistrict('fountain'));
		ret += this.hasDistrict('treasury') * this.get('coins');
		ret += this.hasDistrict('maproom') * this.get('cards').length;
		ret += this.hasDistrict('museum') * this.get('cards_under_museum');
		 
		if (this.hasDistrict('dragongate')) ret += 2;
		if (this.hasDistrict('university')) ret += 2;
		if (this.get('hasAllColours')) ret += 3;
		if (this.get('closed')) ret += 2;
		if (this.get('closed_first')) ret += 2;
		
		return ret;
  	}),
  	init() {
  		this.set('cards', []);
  		this.set('characters', []);
  		this.set('districts', []);
  	},
  	hasDistrict : function(name) {
  		return this.get('districts').filterBy('name', name).length;
  	},
  	hasWorkshop : Ember.computed('districts.[]', function() {
  		return this.hasDistrict('workshop');
  	}),
  	hasLab : Ember.computed('districts.[]', function() {
		return this.hasDistrict('lab');
	}),
	hasGraveyard : Ember.computed('districts.[]', function() {
		return this.hasDistrict('graveyard');
	}),
	hasArmory : Ember.computed('districts.[]', function() {
		return this.hasDistrict('armory');
	}),
	hasMuseum : Ember.computed('districts.[]', function() {
		return this.hasDistrict('museum');
	}),
	hasLighthouse : Ember.computed('districts.[]', function() {
		return this.hasDistrict('lighthouse');
	}),
	hasBallroom : Ember.computed('districts.[]', function() {
		return this.hasDistrict('ballroom');
	}),
	can_use_belltower : false,
	exploging : false,
	can_use_lighthouse : false,
	using_lighthouse : false,
	useLighthouse : function() {
		if (this.get('can_use_lighthouse'))
			this.set('using_lighthouse', true);
	},
	lighthouseTake : function(card) {
		if (this.get('using_lighthouse')) {
			card.set('status', 'in_hand');
			card.set('player', this);
			this.get('cards').pushObject(card);
			this.set('using_lighthouse', false);
			this.set('can_use_lighthouse', false);
		}
	},
	ringTheBell : function(game) {
		if (this.get('can_use_belltower')) {
			game.get('player1').set('districts_to_close', 7);
			game.get('player2').set('districts_to_close', 7);
			this.set('can_use_belltower', false);
		}
	},
	cancelRing : function(game) {
			game.get('player1').set('districts_to_close', 8);
			game.get('player2').set('districts_to_close', 8);
	},
	onExplode : function() {
		if (this.get('hasArmory')) this.set('exploding', true);
	},
	explodeArmory : function(game, district) {
		if (this.get('exploding')) {
			var armory = this.get('districts').findBy('name', 'armory');
			armory.set('status', 'destroyed');
			armory.set('player', false);
			this.get('districts').removeObject(armory);
			district.set('status', 'destroyed');
			if (district.get('player')) 
			{
				var district_owner = district.get('player');
				district_owner.get('districts').removeObject(district);
				if (district.get('name') == 'belltower') district_owner.cancelRing(game);
				if (district_owner.get('districts').length < district_owner.get('districts_to_close'))
				{
					district_owner.set('closed_first', false);
					if (this.get('districts').length < this.get('districts_to_close')) 
					{
						this.set('closed_first', false);
						game.set('first_full_city', false);
					}
				}
				
			}
			
			district.set('player', false);
			this.set('exploding', false);
		}
	},
	useGraveyard : function(game, pay) {
		if (!this.get('hasGraveyard')) return;
		if (this.get('coins') < 1) return;
		
		var card = game.get('deck').get('card_on_graveyard');

		if (pay) {
			this.set('coins', this.get('coins') - 1);
			this.get('cards').pushObject(card);
		}
		
		this.set('on_graveyard', false);
		card.set('status', pay ? 'in_hand' : 'destroyed');
		card.set('player', pay ? this : false);
	},
	takeCharacter : function(character) {
		if (character.get('status') == 'in_round')
		{
			this.get('characters').pushObject(character);
			character.set('status', 'in_hand');
			character.set('player', this);
			this.addToPossibleCharacters(character);
		}
	},
	discardCharacter : function(character) {
		if (character.get('status') == 'in_round') {
			character.set('status', 'discarded');
			this.addToPossibleCharacters(character);
		}
	},
	addToPossibleCharacters : function(character) {
		this.get('possible_characters').pushObject(character.get('number'));
	},
	serialize : function() {
		return {"name" : this.get("name"),
		"is_robot" : this.get("is_robot"),
		"has_crown" : this.get("has_crown"),
		"coins" : this.get("coins"),
		"closed_first" : this.get("closed_first"),
		"on_coronation" : this.get("on_coronation"),
		"on_graveyard" : this.get("on_graveyard"),
		"districts_to_close" : this.get("districts_to_close"),
		"can_use_belltower" : this.get("can_use_belltower"),
		"can_use_lighthouse" : this.get("can_use_lighthouse"),
		"using_lighthouse" : this.get("using_lighthouse"),
		"exploding" : this.get("exploding"),
		"cards_under_museum" : this.get("cards_under_museum"),
		"possible_characters" : this.get("possible_characters")
		}
	}
});
