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
		this.caption.bind("TweenEnd", (function() {
			if (this.caption.y + Crafty("Global").get(0).brickWithGap + Crafty("Global").get(0).gapSize >= Crafty("Floor").get(0).y) Crafty.trigger("GameOver");
		}).bind(this));
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
		this.caption.tween(diff_caption, Crafty("Global").get(0).tweenDuration);
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
		this.onHit("Brick", function(bricks) { this.hitBrick(bricks); }.bind(this));
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
	hitBrick : function(bricks) {
		var flipX = 0, flipY = 0;
		for (var i = 0; i < bricks.length; i++) {
			var brick = bricks[i].obj;
			var prevY = this.y - this.dy;
			var prevX = this.x - this.dx;
			if (prevY + this.h <= brick.y || prevY >= brick.y + brick.h) {
				flipY++;
			} else if (prevX + this.w <= brick.x || prevX >= brick.x + brick.w) {
				flipX++;
			} else {
				// Corner/gap ambiguity: the axis with smaller penetration depth is the one entered first
				var penY = Math.abs(this.dy) < 0.001 ? Infinity : (this.dy > 0 ? (this.y + this.h) - brick.y : brick.y + brick.h - this.y);
				var penX = Math.abs(this.dx) < 0.001 ? Infinity : (this.dx > 0 ? (this.x + this.w) - brick.x : brick.x + brick.w - this.x);
				if (penY <= penX) flipY++; else flipX++;
			}
			brick.damage();
		}
		if (flipY >= flipX) this.changeDirection(-this.direction);
		else this.changeDirection(180 - this.direction);
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
		this.addComponent("2D");
		var ball = Crafty("Ball").get(0);
		this.x = ball.x + ball.w / 2;
		this.y = ball.y + ball.h / 2;
		this._aimRotation = 270;
		this._dashes = [];
		this._rebuild();
	},
	remove : function() {
		this._clearDashes();
	},
	getRotation : function() {
		return this._aimRotation;
	},
	setRotation : function(r) {
		this._aimRotation = r;
		this._rebuild();
	},
	_clearDashes : function() {
		for (var i = 0; i < this._dashes.length; i++) this._dashes[i].destroy();
		this._dashes = [];
	},
	_rebuild : function() {
		this._clearDashes();
		var direction = this._aimRotation - 180;
		var dx = -Math.cos(Math.PI * direction / 180);
		var dy = -Math.sin(Math.PI * direction / 180);
		var segments = this._computeSegments(this.x, this.y, dx, dy);
		this._drawDashes(segments);
	},
	_computeSegments : function(x, y, dx, dy) {
		var MAX_BOUNCES = 2;
		var MAX_LEN = (Crafty.viewport.width + Crafty.viewport.height) * 2;
		var EPS = 0.5;
		var ball = Crafty("Ball").get(0);
		var r = ball.w / 2;
		var leftX = Crafty("LeftWall").get(0).x + r;
		var rightX = Crafty("RightWall").get(0).x - r;
		var roofY = Crafty("Roof").get(0).y + Crafty("Roof").get(0).h + r;
		var floorY = Crafty("Floor").get(0).y - r;
		var bricks = Crafty("Brick").get();
		var segments = [];
		var totalLen = 0;
		for (var i = 0; i <= MAX_BOUNCES && totalLen < MAX_LEN; i++) {
			var tBest = Infinity, hit = null, t;
			if (dx < 0) { t = (leftX - x) / dx; if (t > EPS && t < tBest) { tBest = t; hit = "L"; } }
			else if (dx > 0) { t = (rightX - x) / dx; if (t > EPS && t < tBest) { tBest = t; hit = "R"; } }
			if (dy < 0) { t = (roofY - y) / dy; if (t > EPS && t < tBest) { tBest = t; hit = "T"; } }
			else if (dy > 0) { t = (floorY - y) / dy; if (t > EPS && t < tBest) { tBest = t; hit = "B"; } }
			var dxSafe = dx === 0 ? 1e-9 : dx;
			var dySafe = dy === 0 ? 1e-9 : dy;
			for (var b = 0; b < bricks.length; b++) {
				var brk = bricks[b];
				var bxMin = brk.x - r, bxMax = brk.x + brk.w + r;
				var byMin = brk.y - r, byMax = brk.y + brk.h + r;
				var tx1 = (bxMin - x) / dxSafe, tx2 = (bxMax - x) / dxSafe;
				var ty1 = (byMin - y) / dySafe, ty2 = (byMax - y) / dySafe;
				var txMin = Math.min(tx1, tx2), txMax = Math.max(tx1, tx2);
				var tyMin = Math.min(ty1, ty2), tyMax = Math.max(ty1, ty2);
				var tEnter = Math.max(txMin, tyMin), tExit = Math.min(txMax, tyMax);
				if (tEnter > tExit || tExit < EPS || tEnter < EPS) continue;
				if (tEnter >= tBest) continue;
				tBest = tEnter;
				hit = txMin > tyMin ? "BX" : "BY";
			}
			if (tBest === Infinity) break;
			var endX = x + dx * tBest;
			var endY = y + dy * tBest;
			segments.push([x, y, endX, endY]);
			totalLen += tBest;
			if (hit === "B") break;
			if (hit === "L" || hit === "R" || hit === "BX") dx = -dx;
			if (hit === "T" || hit === "BY") dy = -dy;
			x = endX + dx * EPS;
			y = endY + dy * EPS;
		}
		return segments;
	},
	_drawDashes : function(segments) {
		var basic = Crafty("Global").get(0).basicSize;
		var dashLen = Math.max(4, basic * 2);
		var gapLen = Math.max(3, basic);
		var thickness = Math.max(1, basic / 2);
		for (var s = 0; s < segments.length; s++) {
			var seg = segments[s];
			var sx = seg[0], sy = seg[1], ex = seg[2], ey = seg[3];
			var segDx = ex - sx, segDy = ey - sy;
			var segLen = Math.sqrt(segDx * segDx + segDy * segDy);
			if (segLen < 1) continue;
			var ndx = segDx / segLen, ndy = segDy / segLen;
			var angleDeg = Math.atan2(segDy, segDx) * 180 / Math.PI;
			for (var pos = 0; pos < segLen; pos += dashLen + gapLen) {
				var dashThisLen = Math.min(dashLen, segLen - pos);
				if (dashThisLen < 1) break;
				var dash = Crafty.e("Line")
					.attr({ x: sx + ndx * pos, y: sy + ndy * pos - thickness / 2, w: dashThisLen, h: thickness });
				dash.origin(0, thickness / 2);
				dash.rotation = angleDeg;
				this._dashes.push(dash);
			}
		}
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


