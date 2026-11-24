/*==============================================================================
Radius Raid // Overdrive — enemy bullets
==============================================================================*/
$.EnemyBullet = function( opt ) {
	for( var k in opt ) {
		this[k] = opt[k];
	}
	this.size = this.size || 3;
	this.speed = this.speed || 4;
	this.damage = this.damage || 0.01;
	this.hue = this.hue || 0;
	this.saturation = this.saturation || 100;
	this.lightness = this.lightness || 60;
	this.tick = 0;
	this.inView = 0;
};

$.EnemyBullet.prototype.update = function( i ) {
	this.tick += $.dt;
	this.x += Math.cos( this.direction ) * ( this.speed * $.dt );
	this.y += Math.sin( this.direction ) * ( this.speed * $.dt );

	/*==========================================================================
	Bounds
	==========================================================================*/
	if( !$.util.pointInRect( this.x, this.y, -60, -60, $.ww + 120, $.wh + 120 ) ) {
		$.enemyBullets.splice( i, 1 );
		return;
	}

	/*==========================================================================
	View
	==========================================================================*/
	if( $.util.pointInRect( this.x, this.y, -$.screen.x, -$.screen.y, $.cw, $.ch ) ) {
		this.inView = 1;
	} else {
		this.inView = 0;
	}

	/*==========================================================================
	Hero collision (respect shield + invulnerability)
	==========================================================================*/
	if( $.hero.life > 0 && this.inView && $.powerupTimers[ 5 ] <= 0 && $.hero.invulnTick <= 0 ) {
		if( $.util.distance( this.x, this.y, $.hero.x, $.hero.y ) <= $.hero.radius + this.size ) {
			$.particleEmitters.push( new $.ParticleEmitter( {
				x: this.x,
				y: this.y,
				count: 6,
				spawnRange: 0,
				friction: 0.8,
				minSpeed: 2,
				maxSpeed: 14,
				minDirection: 0,
				maxDirection: $.twopi,
				hue: this.hue,
				saturation: this.saturation
			} ) );
			$.hero.damage( this.damage );
			$.enemyBullets.splice( i, 1 );
		}
	}
};

$.EnemyBullet.prototype.render = function() {
	if( this.inView ) {
		// soft glow trail
		$.ctxmg.strokeStyle = 'hsla(' + this.hue + ', ' + this.saturation + '%, ' + this.lightness + '%, 0.35)';
		$.ctxmg.lineWidth = this.size * 1.8;
		$.ctxmg.beginPath();
		$.ctxmg.moveTo( this.x - Math.cos( this.direction ) * this.size * 3, this.y - Math.sin( this.direction ) * this.size * 3 );
		$.ctxmg.lineTo( this.x, this.y );
		$.ctxmg.stroke();

		$.util.fillCircle( $.ctxmg, this.x, this.y, this.size, 'hsla(' + this.hue + ', ' + this.saturation + '%, ' + ( this.lightness + 20 ) + '%, 1)' );
		$.util.strokeCircle( $.ctxmg, this.x, this.y, this.size + 1.5, 'hsla(' + this.hue + ', ' + this.saturation + '%, ' + this.lightness + '%, 0.8)', 1 );
	}
};
