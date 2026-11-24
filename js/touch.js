/*==============================================================================
Radius Raid // Overdrive — mobile & touch controls (v2)
During play:
  - left half of the play area  : floating joystick (movement)
  - right half of the play area : aim + hold-to-fire
  - top-right HUD buttons       : pause / mute / fullscreen (tap)
Outside play (menu, shop, stats, credits, pause, gameover):
  - every touch acts as the mouse so all buttons are tappable
==============================================================================*/
$.touch = {
	supported: ( 'ontouchstart' in window ) || ( navigator.maxTouchPoints > 0 ),
	joy: { active: 0, id: -1, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0 },
	aim: { active: 0, id: -1, x: 0, y: 0 },
	fire: 0,
	mouseId: -1,   // touch currently acting as the mouse (menus)
	buttonId: -1,  // touch currently pressing a HUD button
	active: 0      // any gameplay touch active (for rendering)
};

/* client coords -> play-area (canvas) coords */
$.touch.toGame = function( clientX, clientY ) {
	var rect = $.cmg.getBoundingClientRect(),
		s = $.scale || 1;
	return {
		x: ( clientX - rect.left ) / s,
		y: ( clientY - rect.top ) / s
	};
};

/* hit-test the in-game HUD buttons (pause / mute / fullscreen) */
$.touch.buttonAt = function( x, y ) {
	var btns = $.touchButtons || [];
	for( var i = 0; i < btns.length; i++ ) {
		if( $.util.distance( x, y, btns[ i ].x, btns[ i ].y ) <= btns[ i ].r ) {
			return btns[ i ];
		}
	}
	return null;
};

$.touch.pressButton = function( b ) {
	if( b.id === 'pause' ) { $.setState( 'pause' ); }
	else if( b.id === 'mute' ) { $.toggleMute(); }
	else if( b.id === 'fullscreen' ) { $.toggleFullscreen(); }
};

$.touch.cbDown = function( e ) {
	e.preventDefault();
	var isPlay = ( $.state === 'play' );

	for( var t = 0; t < e.changedTouches.length; t++ ) {
		var touch = e.changedTouches[ t ];

		if( !isPlay ) {
			/* menus / overlays: route the touch into the mouse pipeline */
			if( $.touch.mouseId === -1 ) {
				$.touch.mouseId = touch.identifier;
				$.mouse.ax = touch.clientX;
				$.mouse.ay = touch.clientY;
				$.mouse.down = 1;
				$.mousescreen();
			}
			continue;
		}

		/* play state */
		var g = $.touch.toGame( touch.clientX, touch.clientY );
		$.touch.active = 1;

		/* HUD buttons get priority */
		var btn = $.touch.buttonAt( g.x, g.y );
		if( btn && $.touch.buttonId === -1 && !$.touch.joy.active && !$.touch.aim.active ) {
			$.touch.buttonId = touch.identifier;
			$.touch.pressButton( btn );
			continue;
		}

		/* left half = joystick, right half = aim + fire */
		if( g.x < $.cw / 2 && !$.touch.joy.active ) {
			$.touch.joy.active = 1;
			$.touch.joy.id = touch.identifier;
			$.touch.joy.ox = $.touch.joy.x = g.x;
			$.touch.joy.oy = $.touch.joy.y = g.y;
			$.touch.joy.dx = 0;
			$.touch.joy.dy = 0;
		} else if( g.x >= $.cw / 2 && !$.touch.aim.active ) {
			$.touch.aim.active = 1;
			$.touch.aim.id = touch.identifier;
			$.touch.aim.x = g.x;
			$.touch.aim.y = g.y;
			$.touch.fire = 1;
		}
	}
};

$.touch.cbMove = function( e ) {
	e.preventDefault();
	for( var t = 0; t < e.changedTouches.length; t++ ) {
		var touch = e.changedTouches[ t ];

		if( touch.identifier === $.touch.mouseId ) {
			$.mouse.ax = touch.clientX;
			$.mouse.ay = touch.clientY;
			$.mousescreen();
			continue;
		}

		var g = $.touch.toGame( touch.clientX, touch.clientY );

		if( touch.identifier === $.touch.joy.id ) {
			var dx = g.x - $.touch.joy.ox,
				dy = g.y - $.touch.joy.oy,
				len = Math.sqrt( dx * dx + dy * dy ),
				max = 48;
			if( len > max ) {
				dx = dx / len * max;
				dy = dy / len * max;
			}
			$.touch.joy.x = $.touch.joy.ox + dx;
			$.touch.joy.y = $.touch.joy.oy + dy;
			$.touch.joy.dx = dx;
			$.touch.joy.dy = dy;
		}
		if( touch.identifier === $.touch.aim.id ) {
			$.touch.aim.x = g.x;
			$.touch.aim.y = g.y;
		}
	}
};

$.touch.cbUp = function( e ) {
	e.preventDefault();
	for( var t = 0; t < e.changedTouches.length; t++ ) {
		var touch = e.changedTouches[ t ];

		if( touch.identifier === $.touch.mouseId ) {
			$.touch.mouseId = -1;
			$.mouse.down = 0;
		}
		if( touch.identifier === $.touch.buttonId ) {
			$.touch.buttonId = -1;
		}
		if( touch.identifier === $.touch.joy.id ) {
			$.touch.joy.active = 0;
			$.touch.joy.id = -1;
			$.touch.joy.dx = 0;
			$.touch.joy.dy = 0;
		}
		if( touch.identifier === $.touch.aim.id ) {
			$.touch.aim.active = 0;
			$.touch.aim.id = -1;
			$.touch.fire = 0;
		}
	}
	if( e.touches.length === 0 ) {
		$.touch.active = 0;
	}
};

/* show/hide the "rotate device" hint (portrait on a touch device) */
$.touch.updateOrientationHint = function() {
	var el = document.getElementById( 'rotate-hint' );
	if( !el ) { return; }
	var portrait = $.touch.supported && window.innerHeight > window.innerWidth;
	el.style.display = portrait ? 'block' : 'none';
};

$.setupTouch = function() {
	if( !$.touch.supported ) { return; }

	window.addEventListener( 'touchstart', $.touch.cbDown, { passive: false } );
	window.addEventListener( 'touchmove', $.touch.cbMove, { passive: false } );
	window.addEventListener( 'touchend', $.touch.cbUp, { passive: false } );
	window.addEventListener( 'touchcancel', $.touch.cbUp, { passive: false } );

	/* kill iOS pinch-zoom + long-press menu */
	window.addEventListener( 'gesturestart', function( e ) { e.preventDefault(); }, { passive: false } );
	window.addEventListener( 'gesturechange', function( e ) { e.preventDefault(); }, { passive: false } );
	window.addEventListener( 'contextmenu', function( e ) { e.preventDefault(); } );
	window.addEventListener( 'dblclick', function( e ) { e.preventDefault(); } );

	window.addEventListener( 'orientationchange', $.touch.updateOrientationHint );
	window.addEventListener( 'resize', $.touch.updateOrientationHint );
	$.touch.updateOrientationHint();
};

/* apply joystick input to the movement keys each frame */
$.touch.apply = function() {
	var dead = 8;
	$.keys.state.up = $.keys.state.up || ( $.touch.joy.active && $.touch.joy.dy < -dead );
	$.keys.state.down = $.keys.state.down || ( $.touch.joy.active && $.touch.joy.dy > dead );
	$.keys.state.left = $.keys.state.left || ( $.touch.joy.active && $.touch.joy.dx < -dead );
	$.keys.state.right = $.keys.state.right || ( $.touch.joy.active && $.touch.joy.dx > dead );
};

$.touch.render = function() {
	if( !$.touch.active ) { return; }
	$.ctxmg.globalAlpha = 0.25;

	if( $.touch.joy.active ) {
		$.util.strokeCircle( $.ctxmg, $.touch.joy.ox, $.touch.joy.oy, 48, '#fff', 2 );
		$.util.fillCircle( $.ctxmg, $.touch.joy.x, $.touch.joy.y, 24, 'hsla(0, 0%, 100%, 0.35)' );
	}

	if( $.touch.aim.active ) {
		$.util.strokeCircle( $.ctxmg, $.touch.aim.x, $.touch.aim.y, 20 + Math.sin( $.tick / 8 ) * 4, 'hsla(0, 0%, 100%, 0.9)', 2 );
		$.util.fillCircle( $.ctxmg, $.touch.aim.x, $.touch.aim.y, 6, 'hsla(0, 0%, 100%, 0.6)' );
	}

	$.ctxmg.globalAlpha = 1;
};
