'use strict';

Crafty.scene("Level", function() {
	 var level = 0;
	 var checkpoint = 1;
	 var balls_cnt, balls_init = 0;
	 var level_state = "init";
	 var bricks_total_strength = 0, old_bts = -1;
	 var p, down_btn, forward_btn;
	 var prepend_infinity_interval = null;
	 var appear_buttons_timeout = null;
	 var playSounds = true;
	 var oldMousePos = {};
	 
	 Crafty.e("Global");
	 Crafty.e("Roof");
	 var floor = Crafty.e("Floor");
	 Crafty.e("LeftWall");
	 Crafty.e("RightWall");
	 var pause_btn = Crafty.e("2D, Canvas, pause_btn, Mouse").attr({ x : Crafty("Global").get(0).basicSize * 4,
	  										  y : Crafty("Global").get(0).basicSize * 2,
	  										  w : Crafty("Global").get(0).basicSize * 12,
	  										  h : Crafty("Global").get(0).basicSize * 12}).bind("Click", function() {
	  										  	if (game_over || Crafty.isPaused()) return;
	  										  	if (!Crafty.isPaused()) Crafty.e("Background").setTitle("GAME PAUSED")
	  										  	.addButton("resume_btn", 
												function() { Crafty.pause(); Crafty("Background").get(0).destroy(); Crafty.trigger("PlaySound", "pause"); }, 
												floor.w / 2 - Crafty("Global").get(0).basicSize * 9, 
												Crafty("Roof").get(0).y + Crafty("Global").get(0).basicSize * 55);
	  										  	else if (Crafty("Background").get(0)) Crafty("Background").get(0).destroy();
	  										  	setTimeout(function() { Crafty.trigger("PlaySound", "pause"); Crafty.pause(); }, 50);
	  										  }.bind(this));
	 var sound_btn = Crafty.e("2D, Canvas, soundon_btn, SpriteAnimation, Mouse").attr({ x : Crafty("Global").get(0).basicSize * 74,
		                                                                                y : Crafty("Global").get(0).basicSize * 2,
																						w : Crafty("Global").get(0).basicSize * 12,
																						h : Crafty("Global").get(0).basicSize * 12})
																				.reel("switchoff", 100, [[2, 2], [1, 2]])
																				.reel("switchon", 100, [[1, 2], [2, 2]])
										                                        .bind("Click", function() {
																					
																					if (playSounds) sound_btn.animate("switchoff");
																					else sound_btn.animate("switchon");
																					playSounds = !playSounds;
																				}.bind(this));
		 
	 
	 var places = [0,1,2,3,4,5,6];
	 var bricks_cnt;
	 var moving_balls = 0;
	 var next_place_defined = false;
	 var next_place = {};
	 var mouse_clicked = false;
	 var game_over = false;
	 
	 var level_text = Crafty.e("2D, DOM, Text").attr({ x: 0, y : Crafty("Global").get(0).basicSize * 4, w : Crafty.viewport.width})
    .text(function () { return "Level&nbsp;"+level; }).textFont({ size: (Crafty("Global").get(0).basicSize * 8)+'px', weight: 'bold' }).textAlign('center')
    .dynamicTextGeneration(true);
     var balls_cnt_text = Crafty.e("2D, DOM, Text").attr({ y : floor.y + Crafty("Global").get(0).basicSize * 2})
    .text(function () { return balls_init > 0 ? "x"+balls_init : ""; })
    .textFont({ size: (Crafty("Global").get(0).ballSize * 1.5)+'px'})
    .dynamicTextGeneration(true);
    
     
    
     function resetVars(r) {
		 Crafty("Ball").each(function() { this.destroy(); });
		 Crafty("Brick").each(function() { this.destroy(); });
		 Crafty("ExtraBall").each(function() { this.destroy(); });
		 
		 level = r - 1;
		 checkpoint = 1;
		 moving_balls = 0;
		 balls_cnt = r;
		 level_state = "init";
		 bricks_total_strength = 0; 
		 old_bts = 0;
		 game_over = false;
		 
		 for (var i=0; i<balls_cnt; i++)
			 Crafty.e("Ball").place(floor.w / 2 - Crafty("Global").get(0).ballSize / 2, floor.y - Crafty("Global").get(0).ballSize);
		 next_place = {x : Crafty("Ball").get(0).x, y : Crafty("Ball").get(0).y };
	 }
	 
	 Crafty.bind("PlaySound", function(sound) {
		 if (playSounds) Crafty.audio.play(sound);
	 });
	 	 
	 Crafty.bind("NextLevel", function() {
		level++;
		
		
		Crafty("Brick").each(function() {
			this.down();
		});
		
		Crafty("ExtraBall").each(function() {
			this.down();
		});

		
		p = 1 / (6 - Math.floor(level/200)); 
		bricks_cnt = Math.random() >= p ? Crafty.math.randomInt(1, 5) : 6;
		places.sort(function() { return Math.random() - 0.5 });
		console.log('places', places);
		var strength = level % 5 ? level : 2*level;
		if (level % 5 == 0) bricks_cnt = bricks_cnt / 2;
		Crafty.e("Delay").delay(function() {
		for (var i=0; i<7; i++) {
			if (places.slice(0, Math.floor(bricks_cnt)).indexOf(i)!==-1) Crafty.e("Brick").initLevel(strength).place(i);
			if (bricks_cnt > Math.floor(bricks_cnt) && i == places[Math.floor(bricks_cnt)]) Crafty.e("Brick").initLevel(level).place(i); 
			if (i == places[Math.floor(bricks_cnt) + (bricks_cnt > Math.floor(bricks_cnt))]) Crafty.e("ExtraBall").place(i);
		}
		
		if (!game_over) level_state = "init";
		
		}, Crafty("Global").get(0).tweenDuration);

		if (Crafty("Ball").length < balls_cnt) {
			var len = Crafty("Ball").length;
			for (var j=0; j< balls_cnt - len; j++) 
				Crafty.e("Ball").place(next_place.x, next_place.y);
		}
		
		balls_init = balls_cnt;
		balls_cnt_text.x = next_place.x + Crafty("Global").get(0).basicSize;
		
		next_place_defined = false;
		next_place = {};
		
		clearInterval(prepend_infinity_interval);
		clearTimeout(appear_buttons_timeout);
	 });
	 
	 Crafty.bind("AddBall", function() {
		 balls_cnt++;
	 });
	 
	 Crafty.bind("BallStop", function() {
		moving_balls--;
		if (moving_balls == 0) {
			level_state = "stop";
			destroyButtons();
			Crafty.trigger("NextLevel"); 
		}
	 });
	 
	 Crafty.bind("NextPlace", function(ball) {
		 console.log('next place', next_place);
		 if (!next_place_defined) {
			 ball.y = Crafty("Floor").get(0).y - ball.h;
			 next_place.x = ball.x;
			 next_place.y = ball.y;
			 next_place_defined = true;
		 }
		 else {
			 ball.y = next_place.y;
			 ball.tween({x : next_place.x}, Crafty("Global").get(0).tweenDuration );
		 }
	 });
	 
	 Crafty.bind("GameOver", function() {
		 if (!game_over) {
			 Crafty.e("Background")
				   .setTitle("GAME OVER")
				   .addButton("restart_btn", 
							  function() { resetGame(checkpoint); Crafty("Background").get(0).destroy(); }, 
							  floor.w / 2 - Crafty("Global").get(0).basicSize * 9, 
							  Crafty("Roof").get(0).y + Crafty("Global").get(0).basicSize * 55);
			 game_over = true;
			 Crafty.trigger("PlaySound", "over");
		}
	 });
	 
	 Crafty.bind("Clear", function() {
	 	var clear_text = Crafty.e("2D, DOM, Text").attr({ x: 0, y : Crafty("Roof").get(0).y + Crafty("Global").get(0).basicSize * 40, w : Crafty.viewport.width})
    	.text("CLEAR!").textFont({ size: (Crafty("Global").get(0).basicSize * 10)+'px', weight: 'bold' }).textAlign('center');
    	setTimeout(function() { clear_text.destroy(); }, 1000);
    	checkpoint = level;
    	Crafty.trigger("PlaySound", "clear");
	 });
	 
	 Crafty.bind("AddBrickStrength", function(s) {
	 	bricks_total_strength += s;
	 });
	 
	 Crafty.bind("RemoveBrickStrength", function() {
	 	bricks_total_strength--;
	 	if (bricks_total_strength <= 0) Crafty.trigger("Clear");
	 });
	 	 
	 var startMoving = function(direction) {
			if (level_state!="init") return;
			prepend_infinity_interval = setInterval(prependInfinity, 5000);
			appear_buttons_timeout = setTimeout(appearButtons, 10000);
			
			var i=0, ballTimers = [];
			
			function moveBalls() {
				if (i>1) clearTimeout(ballTimers[i-2]);
				Crafty("Ball").get(i).direction = direction;
				Crafty("Ball").get(i).moving();
				moving_balls++;
				balls_init--;
				i++;
				if (i<Crafty("Ball").length) ballTimers[i-1] = setTimeout(moveBalls, 100);
			}
			
			moveBalls();
			level_state = "moving";
	 };
	 
	 var oldMousePos = {};
	 
	 function stageMouseDown(e) {
	 	if (!Crafty.isPaused() && level_state == "init" && !pause_btn.isAt(e.realX, e.realY) && !sound_btn.isAt(e.realX, e.realY))
		 {
			 Crafty.e("Direction");
			 mouse_clicked = true;
			 oldMousePos = {x : e.realX, y : e.realY};
		 }
	 }
	 
	 function stageMouseMove(e) { console.log('mouse move', e);
	 	 if (mouse_clicked) {
			 var movementX = e.realX - oldMousePos.x, movementY = e.realY - oldMousePos.y;
			 var rotation = Crafty("Direction").get(0).rotation;
			 rotation += -Math.sign(movementX);
			 rotation += Math.sign(movementY)*Math.sign(270-rotation);
			 if (rotation <= 180 || rotation >=360) cancelDirection();
			 else Crafty("Direction").get(0).rotation = rotation;
			 oldMousePos = {x : e.realX, y : e.realY};
		}
	 }
	 
	 function stageMouseUp(e) {
	 	if (mouse_clicked) {
		 var direction = Crafty("Direction").get(0).rotation - 180;
		 Crafty("Direction").get(0).destroy();
		 mouse_clicked = false;
		 startMoving(direction);
		}
	 }
	 
	 function cancelDirection() {
		 if (Crafty("Direction").length) Crafty("Direction").get(0).destroy();
		 mouse_clicked = false;
	 }
	 
	 Crafty.addEvent(this, Crafty.stage.elem, "mousedown", stageMouseDown);
	 Crafty.addEvent(this, Crafty.stage.elem, "mousemove", stageMouseMove);
	 Crafty.addEvent(this, Crafty.stage.elem, "mouseup", stageMouseUp);
	 Crafty.addEvent(this, Crafty.stage.elem, "mouseout", cancelDirection);
	 
	 function resetGame(r) {
		resetVars(r);
		Crafty.trigger("PlaySound", "start");
		Crafty.trigger("NextLevel");
	 }
	 
	 resetGame(1);
	
	 function prependInfinity() {
		console.log('prepend infinity', old_bts, bricks_total_strength);
	 	if (balls_init == 0 && moving_balls > 0 && old_bts == bricks_total_strength) {
	 	Crafty("Ball").each(function() {
	 		if (this.state == "moving") {
				if (!next_place_defined) this.x = floor.w / 2 - Crafty("Global").get(0).ballSize / 2;
				this.stop();
			}
	 	});
		
		clearInterval(prepend_infinity_interval);
		prepend_infinity_interval = null;
		
		}
	 	
	 	old_bts = bricks_total_strength;
	 }
	 
	 function appearButtons() {
		 down_btn = Crafty.e("2D, Canvas, down_btn, Mouse").attr({ x : Crafty("Global").get(0).basicSize * 4,
	  										  y : Crafty("Floor").get(0).y + Crafty("Global").get(0).basicSize * 3,
	  										  w : Crafty("Global").get(0).basicSize * 10,
	  										  h : Crafty("Global").get(0).basicSize * 10}).bind("Click", function() {
	  										  	Crafty("Ball").each(function() {
													if (this.state == "moving") {
														if (!next_place_defined) this.x = floor.w / 2 - Crafty("Global").get(0).ballSize / 2;
														this.stop();
													}
												});
	  										  });
	 
		 
		 forward_btn = Crafty.e("2D, Canvas, forward_btn, Mouse").attr({ x : Crafty("Global").get(0).basicSize * 74,
	  										  y : Crafty("Floor").get(0).y + Crafty("Global").get(0).basicSize * 3,
	  										  w : Crafty("Global").get(0).basicSize * 10,
	  										  h : Crafty("Global").get(0).basicSize * 10}).bind("MouseDown", function() {
	  										  	Crafty("Ball").each(function() {
														this.faster();
												});
	  										  })
	  										  .bind("MouseUp", function() {
	  										  	Crafty("Ball").each(function() {
														this.slower();
												});
	  										  });
	 }
	 
	 function destroyButtons() {
		 if (down_btn) { down_btn.destroy(); down_btn = false; }
		 if (forward_btn) { forward_btn.destroy(); forward_btn = false; }
	 }	 
});
