/*==============================================================================
Radius Raid // Overdrive — boss fights
==============================================================================*/
$.Boss = function( opt ) {
	for( var k in opt ) {
		this[k] = opt[k];
	}
	this.lifeMax = this.life;
	this.radius = 60;
	this.value = this.value || 500;
	this.phase = 0;
	this.phaseTick = 0;
	this.phaseMax = 520;
	this.shootTick = 0;
	this.shootMax = 60;
	this.spin = 0;
	this.direction = $.util.rand( 0, $.twopi );
	this.vx = 0;
	this.vy = 0;
	this.hitFlag = 0;
	this.inView = 0;
	this.enterTick = 0;
};

$.Boss.prototype.update = function( i ) {
	this.enterTick += $.dt;
	this.spin += 0.02 * $.dt;
	this.phaseTick += $.dt;

	/*==========================================================================
	Phase cycling
	==========================================================================*/
	if( this.phaseTick >= this.phaseMax ) {
		this.phaseTick = 0;
		this.phase = ( this.phase + 1 ) % 3;
		this.shootTick = 0;
		$.audio.play( 'bossRoar' );
		$.rumble.level = Math.max( $.rumble.level, 10 );
	}

	/*==========================================================================
	Movement — slow drift toward hero with a wobble
	==========================================================================*/
	var dx = $.hero.x - this.x,
		dy = $.hero.y - this.y,
		dist = Math.max( 1, Math.sqrt( dx * dx + dy * dy ) ),
		aim = Math.atan2( dy, dx );
	var targetDir = aim + Math.sin( this.spin * 3 ) * 0.8;
	var spd = 0.35 + Math.min( 0.5, this.phase * 0.1 );
	if( $.slow ) { spd /= 2; }
	this.vx = Math.cos( targetDir ) * spd;
	this.vy = Math.sin( targetDir ) * spd;
	this.x += this.vx * $.dt;
	this.y += this.vy * $.dt;

	// keep inside world
	this.x = Math.max( this.radius, Math.min( $.ww - this.radius, this.x ) );
	this.y = Math.max( this.radius, Math.min( $.wh - this.radius, this.y ) );

	/*==========================================================================
	Shooting patterns
	==========================================================================*/
	if( this.enterTick > 120 ) {
		if( this.shootTick < this.shootMax ) {
			this.shootTick += $.dt;
		} else {
			this.shootTick = 0;
			this.firePattern( aim );
		}
	}

	/*==========================================================================
	View
	==========================================================================*/
	if( $.util.arcInRect( this.x, this.y, this.radius, -$.screen.x, -$.screen.y, $.cw, $.ch ) ) {
		this.inView = 1;
	} else {
		this.inView = 0;
	}

	if( this.hitFlag > 0 ) { this.hitFlag -= $.dt; }
};

$.Boss.prototype.firePattern = function( aim ) {
	var i, angle, count;
	if( this.phase === 0 ) {
		// radial ring
		count = 14 + Math.min( 10, Math.floor( $.level.current / 2 ) );
		var off = this.spin;
		for( i = 0; i < count; i++ ) {
			angle = off + ( i / count ) * $.twopi;
			this.shoot( angle, 3.2 );
		}
	} else if( this.phase === 1 ) {
		// aimed burst
		count = 5;
		for( i = 0; i < count; i++ ) {
			angle = aim + ( i - ( count - 1 ) / 2 ) * 0.18;
			this.shoot( angle, 5.5 );
		}
	} else {
		// spiral
		count = 4;
		for( i = 0; i < count; i++ ) {
			angle = this.spin * 6 + ( i / count ) * $.twopi;
			this.shoot( angle, 3.8 );
		}
	}
	$.audio.play( 'bossShoot' );
};

$.Boss.prototype.shoot = function( angle, speed ) {
	$.enemyBullets.push( new $.EnemyBullet( {
		x: this.x + Math.cos( angle ) * ( this.radius + 6 ),
		y: this.y + Math.sin( angle ) * ( this.radius + 6 ),
		direction: angle,
		speed: speed,
		size: 4,
		hue: this.hue,
		saturation: 100,
		lightness: 60,
		damage: 0.012
	} ) );
};

$.Boss.prototype.receiveDamage = function( i, val ) {
	this.life -= val;
	this.hitFlag = 10;
	if( this.inView ) {
		$.audio.play( 'hit' );
		$.rumble.level = Math.max( $.rumble.level, 6 );
	}
	if( this.life <= 0 ) {
		this.die();
	}
};

$.Boss.prototype.die = function() {
	$.bossActive = 0;
	$.boss = null;
	$.score += Math.round( this.value * ( $.upgradeScore || 1 ) );
	$.comboAdd();

	// big death explosion
	var hue = this.hue;
	$.explosions.push( new $.Explosion( { x: this.x, y: this.y, radius: 70, hue: hue, saturation: 100 } ) );
	$.explosions.push( new $.Explosion( { x: this.x + 20, y: this.y - 10, radius: 50, hue: hue, saturation: 100 } ) );
	$.explosions.push( new $.Explosion( { x: this.x - 20, y: this.y + 10, radius: 50, hue: hue, saturation: 100 } ) );
	$.particleEmitters.push( new $.ParticleEmitter( {
		x: this.x, y: this.y, count: 120, spawnRange: this.radius, friction: 0.9,
		minSpeed: 4, maxSpeed: 30, minDirection: 0, maxDirection: $.twopi, hue: hue, saturation: 100
	} ) );
	$.rumble.level = 30;
	$.audio.play( 'bossDie' );

	// reward: guaranteed powerup + credit bonus pop
	for( var p = 0; p < 3; p++ ) {
		$.spawnPowerup( this.x + $.util.rand( -40, 40 ), this.y + $.util.rand( -40, 40 ), 1 );
	}
	$.textPops.push( new $.TextPop( {
		x: this.x, y: this.y - this.radius,
		value: Math.round( this.value * ( $.upgradeScore || 1 ) ),
		hue: hue, saturation: 100, lightness: 60
	} ) );

	// clear remaining enemy bullets so the player gets a breather
	$.enemyBullets.length = 0;
};

$.Boss.prototype.render = function() {
	if( !this.inView ) { return; }
	var mod = $.tick / 20;

	// outer glow
	$.ctxmg.fillStyle = 'hsla(' + this.hue + ', 100%, 50%, 0.08)';
	$.util.fillCircle( $.ctxmg, this.x, this.y, this.radius + 14 + Math.sin( mod ) * 4, 'hsla(' + this.hue + ', 100%, 50%, 0.08)' );

	// body
	$.util.fillCircle( $.ctxmg, this.x, this.y, this.radius, 'hsla(' + this.hue + ', 100%, 25%, 0.85)' );
	$.util.strokeCircle( $.ctxmg, this.x, this.y, this.radius, 'hsla(' + this.hue + ', 100%, 60%, 1)', 3 );

	// rotating outer ring
	$.ctxmg.strokeStyle = 'hsla(' + this.hue + ', 100%, 70%, 0.9)';
	$.ctxmg.lineWidth = 3;
	$.ctxmg.beginPath();
	$.ctxmg.arc( this.x, this.y, this.radius - 6, this.spin, this.spin + $.pi * 1.4 );
	$.ctxmg.stroke();
	$.ctxmg.beginPath();
	$.ctxmg.arc( this.x, this.y, this.radius - 6, this.spin + $.pi, this.spin + $.pi + $.pi * 1.4 );
	$.ctxmg.stroke();

	// core
	var corePulse = 10 + Math.sin( mod * 2 ) * 4;
	$.util.fillCircle( $.ctxmg, this.x, this.y, corePulse, 'hsla(' + this.hue + ', 100%, ' + ( 55 + Math.sin( mod * 2 ) * 15 ) + '%, 1)' );

	// hit flash
	if( this.hitFlag > 0 ) {
		$.util.fillCircle( $.ctxmg, this.x, this.y, this.radius, 'hsla(' + this.hue + ', 100%, 80%, ' + ( this.hitFlag / 10 ) * 0.5 + ')' );
	}
};

$.spawnBoss = function() {
	var diff = $.getDifficulty(),
		level = $.level.current + 1,
		hue = Math.floor( $.util.rand( 0, 360 ) ),
		life = Math.round( 60 * ( 1 + level * 0.65 ) * diff.life );

	$.boss = new $.Boss( {
		x: $.util.rand( $.ww * 0.3, $.ww * 0.7 ),
		y: $.util.rand( $.wh * 0.3, $.wh * 0.7 ),
		life: life,
		hue: hue,
		value: Math.round( 500 * diff.score * ( 1 + level * 0.15 ) )
	} );
	$.bossActive = 1;
	$.bossBannerTick = 180;
	$.audio.play( 'bossAlert' );
	$.rumble.level = 20;
};
