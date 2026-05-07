'use strict';

Crafty.c("Brick", {
	init : function() {
		this.addComponent("2D, DOM, Color, Tween");
		this.w = Crafty("Global").get(0).brickSize;
        this.h = Crafty("Global").get(0).brickSize;
        this.caption = Crafty.e("2D, DOM, Color, Text, Tween")
		                     .attr({ x: this.x, y: this.y + Crafty("Global").get(0).basicSize * 3, w : this.w })
		                     .textAlign('center')
		                     .textColor('#000000')
		                     .textFont({ size: (7*this.w/12)+'px', 
								         family: 'Arial',
								         weight: 'bold'}).text('');
		this.strength = 1;						         
	},
	initLevel : function(level) {
		this.setLevel(level);
		Crafty.trigger("AddBrickStrength", this.strength);
		return this;
	},
	setLevel : function(level) {
		this.color(level < 10 ? "white" : Crafty("Global").chromaRange(Math.min(1, Math.log2(level/10, 2)/6)).toString());
		this.caption.text(level);
		this.strength = level;
		return this;
	},
	place : function(i) {
		this.x = Crafty("Global").get(0).brickWithGap * i;
		this.y = Crafty("Global").get(0).roofY + Crafty("Global").get(0).brickWithGap + Crafty("Global").get(0).gapSize;
		this.caption.x = this.x;
		this.caption.y = this.y + Crafty("Global").get(0).basicSize * 2;
		return this;
	},
	down : function() {
		var diff = {y : this.y + Crafty("Global").get(0).brickWithGap};
		var diff_caption = {y : this.caption.y + Crafty("Global").get(0).brickWithGap};
		this.tween(diff, Crafty("Global").get(0).tweenDuration);
		this.caption.tween(diff_caption, Crafty("Global").get(0).tweenDuration).bind("TweenEnd", function() {
			if (diff.y + Crafty("Global").get(0).brickWithGap + Crafty("Global").get(0).gapSize >= Crafty("Floor").get(0).y) Crafty.trigger("GameOver");
	}.bind(this));
	},
	damage : function() {
		this.strength--;
		Crafty.trigger("RemoveBrickStrength");
		if (this.strength === 0) this.destroy();
		else { Crafty.trigger("PlaySound", "kick"); this.setLevel(this.strength); }
	},
	remove : function() {
		Crafty.trigger("PlaySound", "bubble");
		this.caption.destroy();
	}
});

Crafty.c("Ball", {
	init : function() {
		this.addComponent("2D, Canvas, ball_sprite, Motion, Collision, Tween");
		this.w = Crafty("Global").get(0).ballSize;
		this.h = Crafty("Global").get(0).ballSize;
		this.direction = 45;
		//this.bind("Click", this.move.bind(this));
		this.onHit("LeftWall", function() { this.changeDirection(180 - this.direction); }.bind(this));
		this.onHit("RightWall", function() {this.changeDirection(180 - this.direction); }.bind(this));
		this.onHit("Roof", function() {this.changeDirection( - this.direction); }.bind(this));
		this.onHit("Floor", function() { if (this.state=="moving") this.stop(); }.bind(this));
		this.onHit("Brick", function(bricks) { this.hitBrick(bricks[0].obj); }.bind(this));
		this.onHit("ExtraBall", function(balls) { balls[0].obj.picked(); });
		this.state = "init";
		this.speed = Crafty("Global").get(0).basicSpeed;
		
	},
	place : function(x, y) {
		this.x = x;
		this.y = y;
	},
	changeDirection : function(dir) {
		this.direction = dir;
		this.moving();
	},
	moving : function() {
		this.state = "moving";
		this.vx = 0;
		this.vy = 0;
		this.vx -= this.speed * Math.cos(Math.PI * this.direction / 180);
		this.vy -= this.speed * Math.sin(Math.PI * this.direction / 180);
	},
	stop : function() {
		this.state = "stop";
		this.resetMotion();
		if (this.x <= Crafty("LeftWall").get(0).x) 
			this.x = Crafty("LeftWall").get(0).x + Crafty("Global").get(0).basicSize; 
	    if (this.x + this.w >= Crafty("RightWall").get(0).x) 
	    	this.x = Crafty("RightWall").get(0).x - this.w - Crafty("Global").get(0).basicSize;
		this.speed = Crafty("Global").get(0).basicSpeed;
		this.direction = 45;
		Crafty.trigger("NextPlace", this);
		Crafty.trigger("BallStop");		
	},
	hitBrick : function(brick) {
		if (this.y - this.dy <= brick.y || this.y - this.dy >= brick.y + brick.h) this.changeDirection(-this.direction);
		else this.changeDirection(180 - this.direction); 
		brick.damage();
	},
	faster : function() {
		if (this.state != "moving") return;
		this.speed = Crafty("Global").get(0).basicSpeed * 2;
		this.moving();
	},
	slower : function() {
		if (this.state != "moving") return;
		this.speed = Crafty("Global").get(0).basicSpeed;
		this.moving();
	}
});

Crafty.c("ExtraBall", {
	init : function() {
		this.addComponent("2D, Canvas, ball_sprite, Tween, Motion, Collision");
		this.w = Crafty("Global").get(0).ballSize;
		this.h = Crafty("Global").get(0).ballSize;
		this.onHit("Floor", this.picked_end);
		this.isPicked = false;
	},
	picked : function() {
		if (this.isPicked) return;
		this.isPicked = true;
		this.ax = 0;
		this.ay += Crafty("Global").get(0).basicSpeed * 3;
		Crafty.trigger("AddBall");
		Crafty.trigger("PlaySound", "pick");
	},
	place : function(i) {
		this.x = Crafty("Global").get(0).brickWithGap * i + Crafty("Global").get(0).brickSize / 2 - this.w / 2;
		this.y = Crafty("Global").get(0).roofY + Crafty("Global").get(0).gapSize + Crafty("Global").get(0).brickWithGap + Crafty("Global").get(0).brickSize / 2 - this.h / 2;
		return this;
	},
	down : function() {
		var diff = {y : this.y + Crafty("Global").get(0).brickWithGap};
		this.tween(diff, Crafty("Global").get(0).tweenDuration);
		if (diff.y + Crafty("Global").get(0).brickWithGap + Crafty("Global").get(0).gapSize >= Crafty("Floor").get(0).y)
			this.picked();
	},
	picked_end : function() {
		var plusText = Crafty.e("2D, DOM, Text").attr({ x : this.x, y : Crafty("Floor").get(0).y + Crafty("Global").get(0).ballSize})
		.textFont({ size: (Crafty("Global").get(0).ballSize * 1.5)+'px'}).text("+1");
		setTimeout(function() {plusText.destroy();}, 300);
		this.destroy();
	},
	remove : function() {
		
	}
});

Crafty.c("Line", {
	init : function() {
		this.addComponent("2D, Canvas, Color");
		this.color('#FFFFFF');
	}
});

Crafty.c("BorderLine", {
	init : function() {
		this.addComponent("Line");
		this.w = Crafty.viewport.width;
		this.h = Crafty("Global").get(0).basicSize
		this.x = 0;
	}
});

Crafty.c("Roof", {
	init : function() {
		this.addComponent("BorderLine");
		this.y = Crafty("Global").get(0).roofY;
	}
});

Crafty.c("Floor", {
	init : function() {
		this.addComponent("BorderLine");
		this.y = Crafty("Global").get(0).floorY;
	}
});

Crafty.c("Direction", {
	init : function() {
		console.log('init direction', Crafty.viewport.width);
		this.addComponent("Line");
		this.x = Crafty("Ball").get(0).x + Crafty("Ball").get(0).w / 2;
		this.y = Crafty("Ball").get(0).y + Crafty("Ball").get(0).w / 2;
		this.w = Crafty.viewport.width;
		this.h = Math.max(1, Crafty("Global").get(0).basicSize / 2);
		this.rotation = 270;
	}
});

Crafty.c("LeftWall", {
	init : function() {
		this.addComponent("2D, Canvas, Color");
		this.x = 0;
		this.y = 0;
		this.h = Crafty.viewport.height;
		this.w = 0;
		this.color('#FFFFFF');
	}
});

Crafty.c("RightWall", {
	init : function() {
		this.addComponent("2D, Canvas, Color");
		this.x = Crafty.viewport.width;
		this.y = 0;
		this.h = Crafty.viewport.height;
		this.w = 0;
		this.color('#FFFFFF');
	}
});

Crafty.c("Background", {
	init : function() { 
		this.addComponent("2D, DOM, Color");
		this.x = 0;
		this.y = 0;
		this.z = 1;
		this.w = Crafty.viewport.width;
		this.h = Crafty.viewport.height;
		this.color(100, 100, 100, 0.6);
		this.title = Crafty.e("2D, DOM, Color, Text")
		             .attr({ x : 0, 
						     y : Crafty("Roof").get(0).y + Crafty("Global").get(0).basicSize * 40, 
						     z : 2,
						     w : Crafty.viewport.width})
				     .color('#FFFFFF')
				     .textFont({ size : (Crafty("Global").get(0).basicSize * 10)+'px', weight : 'bold'})
				     .textAlign('center')
				     .text("TITLE");
		this.buttons = [];
	},
	setTitle : function(title) {
		this.title.text(title);
		return this;
	},
	remove : function() {
		this.title.destroy();
		this.buttons.forEach(function(button) {button.destroy();});
	},
	addButton : function(button_id, onclick, x, y) {
		var new_button = Crafty.e("2D, DOM, Mouse, "+button_id)
		                 .attr({ x : x, 
							     y : y, 
							     z : 3,
							     w : Crafty("Global").get(0).basicSize * 18, 
							     h : Crafty("Global").get(0).basicSize * 18 }).bind("Click", onclick);
		this.buttons.push(new_button);
	}
	
});


