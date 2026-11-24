/*==============================================================================
Init
==============================================================================*/
$.Bullet = function( opt ) {
	for( var k in opt ) {
		this[k] = opt[k];
	}
	this.enemiesHit = [];
	this.hitBoss = 0;
	this.inView = 0;
	$.particleEmitters.push( new $.ParticleEmitter( {
		x: this.x,
		y: this.y,
		count: 1,
		spawnRange: 1,
		friction: 0.75,
		minSpeed: 2,
		maxSpeed: 10,
		minDirection: 0,
		maxDirection: $.twopi,
		hue: 0,
		saturation: 0
	} ) );
};

/*==============================================================================
Update
==============================================================================*/
$.Bullet.prototype.update = function( i ) {
	/*==============================================================================
	Apply Forces
	==============================================================================*/
	this.x += Math.cos( this.direction ) * ( this.speed * $.dt );
	this.y += Math.sin( this.direction ) * ( this.speed * $.dt );
	this.ex = this.x - Math.cos( this.direction ) * this.size;
	this.ey = this.y - Math.sin( this.direction ) * this.size;

	var dead = 0;

	/*==============================================================================
	Check Collisions — enemies
	==============================================================================*/
	var ei = $.enemies.length;
	while( ei-- ) {
		var enemy = $.enemies[ ei ];
		if( $.util.distance( this.x, this.y, enemy.x, enemy.y ) <= enemy.radius ) {
			if( this.enemiesHit.indexOf( enemy.index ) == -1 ){
				$.particleEmitters.push( new $.ParticleEmitter( {
					x: this.x,
					y: this.y,
					count: Math.floor( $.util.rand( 1, 4 ) ),
					spawnRange: 0,
					friction: 0.85,
					minSpeed: 5,
					maxSpeed: 12,
					minDirection: ( this.direction - $.pi ) - $.pi / 5,
					maxDirection: ( this.direction - $.pi ) + $.pi / 5,
					hue: enemy.hue
				} ) );

				this.enemiesHit.push( enemy.index );
				enemy.receiveDamage( ei, this.damage );

				if( this.enemiesHit.length > 3 ) {
					dead = 1;
				}
			}
			if( !this.piercing ) {
				dead = 1;
			}
		}
	}

	/*==============================================================================
	Check Collisions — boss (Overdrive addition)
	==============================================================================*/
	if( !dead && $.bossActive && $.boss ) {
		if( $.util.distance( this.x, this.y, $.boss.x, $.boss.y ) <= $.boss.radius + this.size ) {
			if( !this.hitBoss ) {
				this.hitBoss = 1;
				$.particleEmitters.push( new $.ParticleEmitter( {
					x: this.x,
					y: this.y,
					count: 3,
					spawnRange: 0,
					friction: 0.85,
					minSpeed: 5,
					maxSpeed: 14,
					minDirection: ( this.direction - $.pi ) - $.pi / 4,
					maxDirection: ( this.direction - $.pi ) + $.pi / 4,
					hue: $.boss.hue,
					saturation: 100
				} ) );
				$.boss.receiveDamage( 0, this.damage );
			}
			if( !this.piercing ) {
				dead = 1;
			}
		}
	}

	/*==============================================================================
	Lock Bounds
	==============================================================================*/
	if( !dead && !$.util.pointInRect( this.ex, this.ey, 0, 0, $.ww, $.wh ) ) {
		dead = 1;
	}
	if( dead ) {
		$.bullets.splice( i, 1 );
	}

	/*==============================================================================
	Update View
	==============================================================================*/
	if( $.util.pointInRect( this.ex, this.ey, -$.screen.x, -$.screen.y, $.cw, $.ch ) ) {
		this.inView = 1;
	} else {
		this.inView = 0;
	}
};

/*==============================================================================
Render
==============================================================================*/
$.Bullet.prototype.render = function( i ) {
	if( this.inView ) {
		$.ctxmg.beginPath();
		$.ctxmg.moveTo( this.x, this.y );
		$.ctxmg.lineTo( this.ex, this.ey );
		$.ctxmg.lineWidth = this.lineWidth;		
		$.ctxmg.strokeStyle = this.strokeStyle;
		$.ctxmg.stroke();
	}
};
