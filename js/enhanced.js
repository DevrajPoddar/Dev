/*==============================================================================

==============================================================================*/

(function() {

/*==============================================================================
1. New sounds (added to definitions + pool built like audio.js does)
==============================================================================*/
var extraAudio = {
	'bossAlert':  { count: 1, params: [ [2,1,0.01,,0.84,0.19,,,,0.62,0.7,,,-0.7248,0.8522,,,,1,,,,,0.45] ] },
	'bossRoar':   { count: 1, params: [ [3,,0.15,0.7523,0.398,0.15,,-0.18,,0.39,0.53,-0.3428,0.6918,,,0.5792,0.6,0.56,1,,,,,0.25] ] },
	'bossShoot':  { count: 5, params: [ [0,,0.16,0.18,0.18,0.47,0.0084,-0.26,,,,,,0.74,-1,,-0.76,,1,,,,,0.15] ] },
	'bossDie':    { count: 2, params: [ [3,,0.2958,0.3173,0.3093,0.0665,,0.1334,,,,,,,,,,,1,,,,,0.25] ] },
	'buy':        { count: 2, params: [ [0,,0.01,,0.4384,0.2,,0.12,0.28,1,0.65,,,0.0419,,,,,1,,,,,0.4] ] },
	'deny':       { count: 2, params: [ [3,,0.18,,,1,,-1,-1,,,,,,,,,,1,,,0.64,,0.35] ] },
	'comboBreak': { count: 2, params: [ [3,,0.1606,0.5988,0.2957,0.1157,,-0.3921,,,,,,,,,0.3225,-0.2522,1,,,,,0.25] ] },
	'shieldHit':  { count: 5, params: [ [3,,0.0138,,0.2701,0.4935,,-0.6881,,,,,,,,,,,1,,,,,0.25] ] },
	'nuke':       { count: 1, params: [ [3,,0.1164,0.88,0.37,0.06,,0.1599,,,,-0.0846,0.6485,,,,0.3963,-0.0946,1,,,,,0.25] ] }
};

for( var k in extraAudio ) {
	$.definitions.audio[ k ] = extraAudio[ k ];
	$.audio.sounds[ k ] = [];
	extraAudio[ k ].params.forEach( function( elem, index ) {
		$.audio.sounds[ k ].push( { tick: 0, count: extraAudio[ k ].count, pool: [] } );
		for( var i = 0; i < extraAudio[ k ].count; i++ ) {
			var audio = new Audio();
			audio.src = jsfxr( elem );
			$.audio.references.push( audio );
			$.audio.sounds[ k ][ index ].pool.push( audio );
		}
	} );
}

/*==============================================================================
2. New enemy types (13 shooter, 14 mine, 15 dasher)
==============================================================================*/
$.definitions.enemies.push( {
	// Enemy 13 — shooter turret
	value: 40,
	speed: 1.2,
	life: 3,
	radius: 18,
	hue: 280,
	shootTick: 0,
	shootMax: 90,
	setup: function() {
		this.xTarget = $.util.rand( 60, $.ww - 60 );
		this.yTarget = $.util.rand( 60, $.wh - 60 );
	},
	behavior: function() {
		var speed = this.speed;
		if( $.slow ) { speed = this.speed / $.slowEnemyDivider; }
		var dx = this.xTarget - this.x,
			dy = this.yTarget - this.y,
			dir = Math.atan2( dy, dx );
		if( Math.sqrt( dx * dx + dy * dy ) > 30 ) {
			this.vx = Math.cos( dir ) * speed;
			this.vy = Math.sin( dir ) * speed;
		} else {
			this.vx = 0;
			this.vy = 0;
		}
		this.shootTick += ( $.slow ? $.dt / 2 : $.dt );
		if( this.shootTick >= this.shootMax ) {
			this.shootTick = 0;
			var aim = Math.atan2( $.hero.y - this.y, $.hero.x - this.x );
			var count = ( $.levelDiffOffset > 3 ) ? 3 : 1;
			for( var b = 0; b < count; b++ ) {
				var a = aim + ( b - ( count - 1 ) / 2 ) * 0.22;
				$.enemyBullets.push( new $.EnemyBullet( {
					x: this.x, y: this.y, direction: a, speed: 3.5,
					size: 3, hue: this.hue, saturation: 100, lightness: 65, damage: 0.008
				} ) );
			}
		}
	}
} );

$.definitions.enemies.push( {
	// Enemy 14 — proximity mine
	value: 45,
	speed: 0.6,
	life: 1,
	radius: 14,
	hue: 40,
	fuse: 0,
	dir: 0,
	setup: function() {
		this.dir = $.util.rand( 0, $.twopi );
	},
	behavior: function() {
		var speed = this.speed;
		if( $.slow ) { speed = this.speed / $.slowEnemyDivider; }
		this.vx = Math.cos( this.dir ) * speed;
		this.vy = Math.sin( this.dir ) * speed;

		var d = $.util.distance( this.x, this.y, $.hero.x, $.hero.y );
		if( d < 120 && $.hero.life > 0 ) {
			this.fuse += $.dt;
		} else if( this.fuse > 0 ) {
			this.fuse -= $.dt;
		}
		// blink faster as fuse burns
		this.lightness = ( Math.floor( this.fuse / 5 ) % 2 ) ? 80 : 45;
		this.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.lightness + '%, 1)';

		if( this.fuse >= 40 ) {
			var idx = $.enemies.indexOf( this );
			if( idx != -1 ) {
				for( var b = 0; b < 10; b++ ) {
					var a = ( b / 10 ) * $.twopi;
					$.enemyBullets.push( new $.EnemyBullet( {
						x: this.x, y: this.y, direction: a, speed: 3,
						size: 3, hue: this.hue, saturation: 100, lightness: 70, damage: 0.01
					} ) );
				}
				$.explosions.push( new $.Explosion( { x: this.x, y: this.y, radius: 26, hue: this.hue, saturation: 100 } ) );
				$.particleEmitters.push( new $.ParticleEmitter( {
					x: this.x, y: this.y, count: 30, spawnRange: this.radius, friction: 0.85,
					minSpeed: 4, maxSpeed: 18, minDirection: 0, maxDirection: $.twopi, hue: this.hue, saturation: 100
				} ) );
				$.rumble.level = Math.max( $.rumble.level, 10 );
				$.audio.play( 'explosion' );
				$.enemies.splice( idx, 1 );
			}
		}
	}
} );

$.definitions.enemies.push( {
	// Enemy 15 — dasher (telegraphs, then charges the hero)
	value: 50,
	speed: 2,
	life: 2,
	radius: 12,
	hue: 20,
	mode: 0,
	dashTick: 0,
	dashDir: 0,
	setup: function() {
		this.mode = 0;
		this.dashTick = $.util.rand( 0, 60 );
	},
	behavior: function() {
		if( this.mode === 0 ) {
			// wind up
			this.dashTick += ( $.slow ? $.dt / 2 : $.dt );
			this.vx = 0;
			this.vy = 0;
			this.lightness = 55 + ( Math.floor( this.dashTick / 3 ) % 2 ) * 35;
			this.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.lightness + '%, 1)';
			if( this.dashTick > 60 ) {
				this.mode = 1;
				this.dashTick = 0;
				this.dashDir = Math.atan2( $.hero.y - this.y, $.hero.x - this.x );
			}
		} else {
			// dash
			var spd = 7 + Math.min( 4, $.levelDiffOffset );
			if( $.slow ) { spd /= 2; }
			this.vx = Math.cos( this.dashDir ) * spd;
			this.vy = Math.sin( this.dashDir ) * spd;
			this.dashTick += $.dt;
			this.lightness = 90;
			if( this.dashTick > 40 ) {
				this.mode = 0;
				this.dashTick = 0;
			}
		}
	}
} );

/* regenerate the level distributions to include the new enemy types */
$.definitions.levels = [];
var base = 25;
for( var li = 0; li < $.definitions.enemies.length; li++ ) {
	var distribution = [];
	for( var di = 0; di < li + 1; di++ ) {
		var value = ( di == li ) ? Math.floor( ( ( li + 1 ) * base ) * 0.75 ) : ( li + 1 ) * base;
		value = ( li == 0 ) ? base : value;
		distribution.push( value );
	}
	$.definitions.levels.push( {
		killsToLevel: 10 + ( li + 1 ) * 7,
		distribution: distribution
	} );
}

/*==============================================================================
3. New powerups (5 shield, 6 nuke)
==============================================================================*/
$.definitions.powerups.push(
	{ title: 'SHIELD', hue: 40, saturation: 100, lightness: 60 },
	{ title: 'NUKE',   hue: 0,  saturation: 100, lightness: 60 }
);

/*==============================================================================
4. Difficulty scaling on enemies
==============================================================================*/
var OrigEnemy = $.Enemy;
$.Enemy = function( opt ) {
	OrigEnemy.call( this, opt );
	var diff = $.getDifficulty();
	if( diff.life != 1 ) {
		this.life *= diff.life;
		this.lifeMax = this.life;
	}
	if( diff.speed != 1 ) {
		this.speed *= diff.speed;
	}
};
$.Enemy.prototype = OrigEnemy.prototype;

/*==============================================================================
5. Enemy death — combo + difficulty/upgrade score multiplier
==============================================================================*/
$.Enemy.prototype.receiveDamage = function( i, val ) {
	if( this.inView ) {
		$.audio.play( 'hit' );
	}
	this.life -= val;
	this.hitFlag = 10;
	if( this.life <= 0 ) {
		$.comboAdd();
		var mult = $.comboMultiplier(),
			diff = $.getDifficulty(),
			gained = Math.round( this.value * diff.score * ( $.upgradeScore || 1 ) * mult );

		if( this.inView ) {
			$.explosions.push( new $.Explosion( {
				x: this.x, y: this.y, radius: this.radius, hue: this.hue, saturation: this.saturation
			} ) );
			$.particleEmitters.push( new $.ParticleEmitter( {
				x: this.x, y: this.y, count: 10, spawnRange: this.radius, friction: 0.85,
				minSpeed: 5, maxSpeed: 20, minDirection: 0, maxDirection: $.twopi, hue: this.hue, saturation: this.saturation
			} ) );
			$.textPops.push( new $.TextPop( {
				x: this.x, y: this.y, value: gained, hue: this.hue, saturation: this.saturation, lightness: 60
			} ) );
			$.rumble.level = 6;
		}
		this.death();
		$.spawnPowerup( this.x, this.y );
		$.score += gained;
		$.level.kills = Math.min( $.level.kills + 1, $.level.killsToLevel );
		$.kills++;
		$.enemies.splice( i, 1 );
	}
};

/*==============================================================================
6. Hero — damage method (shield + i-frames), touch aim, muzzle flash, glow
==============================================================================*/
$.Hero.prototype.damage = function( amount ) {
	if( $.powerupTimers[ 5 ] > 0 ) {
		$.audio.play( 'shieldHit' );
		$.particleEmitters.push( new $.ParticleEmitter( {
			x: this.x, y: this.y, count: 8, spawnRange: this.radius, friction: 0.8,
			minSpeed: 2, maxSpeed: 16, minDirection: 0, maxDirection: $.twopi, hue: 40, saturation: 100
		} ) );
		return 0;
	}
	if( this.invulnTick > 0 ) {
		return 0;
	}
	this.life -= amount;
	if( this.life < 0 ) { this.life = 0; }
	this.invulnTick = 22;
	this.takingDamage = 1;
	$.comboBreak();
	$.rumble.level = Math.max( $.rumble.level, 4 );
	if( Math.floor( $.tick ) % 5 === 0 ) {
		$.audio.play( 'takingDamage' );
	}
	return 1;
};

$.Hero.prototype.update = function() {
	if( this.life > 0 ) {
		if( this.invulnTick > 0 ) { this.invulnTick -= $.dt; }

		/* Apply forces */
		if( $.keys.state.up ) {
			this.vy -= this.accel * $.dt;
			if( this.vy < -this.vmax ) { this.vy = -this.vmax; }
		} else if( $.keys.state.down ) {
			this.vy += this.accel * $.dt;
			if( this.vy > this.vmax ) { this.vy = this.vmax; }
		}
		if( $.keys.state.left ) {
			this.vx -= this.accel * $.dt;
			if( this.vx < -this.vmax ) { this.vx = -this.vmax; }
		} else if( $.keys.state.right ) {
			this.vx += this.accel * $.dt;
			if( this.vx > this.vmax ) { this.vx = this.vmax; }
		}

		this.vy *= 0.9;
		this.vx *= 0.9;

		this.x += this.vx * $.dt;
		this.y += this.vy * $.dt;

		/* Lock bounds */
		if( this.x >= $.ww - this.radius ) { this.x = $.ww - this.radius; }
		if( this.x <= this.radius ) { this.x = this.radius; }
		if( this.y >= $.wh - this.radius ) { this.y = this.wh - this.radius; }
		if( this.y <= this.radius ) { this.y = this.radius; }

		/* Update direction (touch aim overrides mouse) */
		var dx, dy;
		if( $.touch.aim.active ) {
			dx = $.touch.aim.x - this.x;
			dy = $.touch.aim.y - this.y;
		} else {
			dx = $.mouse.x - this.x;
			dy = $.mouse.y - this.y;
		}
		this.direction = Math.atan2( dy, dx );

		/* Fire weapon */
		if( this.weapon.fireRateTick < this.weapon.fireRate ) {
			this.weapon.fireRateTick += $.dt;
		} else {
			if( $.autofire || ( !$.autofire && ( $.mouse.down || $.touch.fire ) ) ) {
				$.audio.play( 'shoot' );
				if( $.powerupTimers[ 2 ] > 0 || $.powerupTimers[ 3 ] > 0 || $.powerupTimers[ 4 ] > 0 ) {
					$.audio.play( 'shootAlt' );
				}

				this.weapon.fireRateTick = this.weapon.fireRateTick - this.weapon.fireRate;
				this.weapon.fireFlag = 6;

				if( this.weapon.count > 1 ) {
					var spreadStart = -this.weapon.spread / 2;
					var spreadStep = this.weapon.spread / ( this.weapon.count - 1 );
				} else {
					var spreadStart = 0;
					var spreadStep = 0;
				}

				var gunX = this.x + Math.cos( this.direction ) * ( this.radius + this.weapon.bullet.size );
				var gunY = this.y + Math.sin( this.direction ) * ( this.radius + this.weapon.bullet.size );

				// muzzle flash
				$.particleEmitters.push( new $.ParticleEmitter( {
					x: gunX, y: gunY, count: 2, spawnRange: 2, friction: 0.7,
					minSpeed: 2, maxSpeed: 10, minDirection: this.direction - 0.4, maxDirection: this.direction + 0.4,
					hue: 0, saturation: 0
				} ) );

				for( var i = 0; i < this.weapon.count; i++ ) {
					$.bulletsFired++;
					var color = this.weapon.bullet.strokeStyle;
					if( $.powerupTimers[ 2 ] > 0 || $.powerupTimers[ 3 ] > 0 || $.powerupTimers[ 4 ] > 0 ) {
						var colors = [];
						if( $.powerupTimers[ 2 ] > 0 ) { colors.push( 'hsl(' + $.definitions.powerups[ 2 ].hue + ', ' + $.definitions.powerups[ 2 ].saturation + '%, ' + $.definitions.powerups[ 2 ].lightness + '%)' ); }
						if( $.powerupTimers[ 3 ] > 0 ) { colors.push( 'hsl(' + $.definitions.powerups[ 3 ].hue + ', ' + $.definitions.powerups[ 3 ].saturation + '%, ' + $.definitions.powerups[ 3 ].lightness + '%)' ); }
						if( $.powerupTimers[ 4 ] > 0 ) { colors.push( 'hsl(' + $.definitions.powerups[ 4 ].hue + ', ' + $.definitions.powerups[ 4 ].saturation + '%, ' + $.definitions.powerups[ 4 ].lightness + '%)' ); }
						color = colors[ Math.floor( $.util.rand( 0, colors.length ) ) ];
					}
					$.bullets.push( new $.Bullet( {
						x: gunX, y: gunY, speed: this.weapon.bullet.speed, direction: this.direction + spreadStart + i * spreadStep,
						damage: this.weapon.bullet.damage, size: this.weapon.bullet.size, lineWidth: this.weapon.bullet.lineWidth,
						strokeStyle: color, piercing: this.weapon.bullet.piercing
					} ) );
				}
			}
		}

		/* Check collisions */
		this.takingDamage = 0;
		var ei = $.enemies.length;
		while( ei-- ) {
			var enemy = $.enemies[ ei ];
			if( enemy.inView && $.util.distance( this.x, this.y, enemy.x, enemy.y ) <= this.radius + enemy.radius ) {
				if( this.damage( 0.0075 ) ) {
					$.particleEmitters.push( new $.ParticleEmitter( {
						x: this.x, y: this.y, count: 2, spawnRange: 0, friction: 0.85,
						minSpeed: 2, maxSpeed: 15, minDirection: 0, maxDirection: $.twopi, hue: 0, saturation: 0
					} ) );
					$.rumble.level = 3;
				}
			}
		}
	}
};

$.Hero.prototype.render = function() {
	if( this.life > 0 ) {
		if( this.takingDamage ) {
			var fillStyle = 'hsla(0, 0%, ' + $.util.rand( 0, 100 ) + '%, 1)';
			$.ctxmg.fillStyle = 'hsla(0, 0%, ' + $.util.rand( 0, 100 ) + '%, ' + $.util.rand( 0.01, 0.15 ) + ')';
			$.ctxmg.fillRect( -$.screen.x, -$.screen.y, $.cw, $.ch );
		} else if( this.weapon.fireFlag > 0 ) {
			this.weapon.fireFlag -= $.dt;
			var fillStyle = 'hsla(' + $.util.rand( 0, 359 ) + ', 100%, ' + $.util.rand( 20, 80 ) + '%, 1)';
		} else {
			var fillStyle = this.fillStyle;
		}

		$.ctxmg.save();
		$.ctxmg.translate( this.x, this.y );
		$.ctxmg.rotate( this.direction - $.pi / 4 );
		$.ctxmg.fillStyle = fillStyle;
		$.ctxmg.fillRect( 0, 0, this.radius, this.radius );
		$.ctxmg.restore();

		$.ctxmg.save();
		$.ctxmg.translate( this.x, this.y );
		$.ctxmg.rotate( this.direction - $.pi / 4 + $.twopi / 3 );
		$.ctxmg.fillStyle = fillStyle;
		$.ctxmg.fillRect( 0, 0, this.radius, this.radius );
		$.ctxmg.restore();

		$.ctxmg.save();
		$.ctxmg.translate( this.x, this.y );
		$.ctxmg.rotate( this.direction - $.pi / 4 - $.twopi / 3 );
		$.ctxmg.fillStyle = fillStyle;
		$.ctxmg.fillRect( 0, 0, this.radius, this.radius );
		$.ctxmg.restore();

		$.util.fillCircle( $.ctxmg, this.x, this.y, this.radius - 3, fillStyle );

		// shield ring
		if( $.powerupTimers[ 5 ] > 0 ) {
			var pulse = Math.sin( $.tick / 6 ) * 3;
			$.util.strokeCircle( $.ctxmg, this.x, this.y, this.radius + 9 + pulse, 'hsla(40, 100%, 70%, ' + ( 0.5 + 0.3 * Math.sin( $.tick / 8 ) ) + ')', 2 );
		}
		// invulnerability blink
		if( this.invulnTick > 0 ) {
			$.util.strokeCircle( $.ctxmg, this.x, this.y, this.radius + 4, 'hsla(0, 0%, 100%, ' + ( 0.2 + 0.2 * Math.sin( $.tick ) ) + ')', 1 );
		}
	}
};

/*==============================================================================
7. Bullet glow trail
==============================================================================*/
var origBulletRender = $.Bullet.prototype.render;
$.Bullet.prototype.render = function( i ) {
	if( this.inView ) {
		$.ctxmg.strokeStyle = 'hsla(0, 0%, 100%, 0.15)';
		$.ctxmg.lineWidth = this.lineWidth * 2.6;
		$.ctxmg.beginPath();
		$.ctxmg.moveTo( this.x, this.y );
		$.ctxmg.lineTo( this.ex, this.ey );
		$.ctxmg.stroke();
	}
	origBulletRender.call( this, i );
};

/*==============================================================================
8. Powerup update — magnet + shield/nuke pickups
==============================================================================*/
$.Powerup.prototype.update = function( i ) {
	/* magnet attraction */
	var mag = $.upgradeMagnet || 0;
	if( mag > 0 && $.hero.life > 0 ) {
		var cxp = this.x + this.width / 2,
			cyp = this.y + this.height / 2,
			mx = $.hero.x - cxp,
			my = $.hero.y - cyp,
			md = Math.sqrt( mx * mx + my * my );
		if( md < mag && md > 1 ) {
			this.x += ( mx / md ) * 2.5 * $.dt;
			this.y += ( my / md ) * 2.5 * $.dt;
		}
	}

	/* apply forces */
	this.x += Math.cos( this.direction ) * this.speed * $.dt;
	this.y += Math.sin( this.direction ) * this.speed * $.dt;

	/* bounds */
	if( !$.util.rectInRect( this.x, this.y, this.width, this.height, 0, 0, $.ww, $.wh ) ) {
		$.powerups.splice( i, 1 );
		return;
	}

	/* collection */
	var pickupRadius = $.hero.radius + 2 + ( $.upgradeMagnet || 0 );
	if( $.hero.life > 0 && $.util.arcIntersectingRect( $.hero.x, $.hero.y, pickupRadius, this.x, this.y, this.width, this.height ) ) {
		$.audio.play( 'powerup' );

		if( this.type === 6 ) {
			/* NUKE — instant screen clear */
			$.nuke();
			$.powerups.splice( i, 1 );
			$.powerupsCollected++;
			return;
		}

		$.powerupTimers[ this.type ] = ( this.type === 5 ) ? 600 : 300;
		$.particleEmitters.push( new $.ParticleEmitter( {
			x: this.x + this.width / 2, y: this.y + this.height / 2, count: 15, spawnRange: 0, friction: 0.85,
			minSpeed: 2, maxSpeed: 15, minDirection: 0, maxDirection: $.twopi, hue: 0, saturation: 0
		} ) );
		$.powerups.splice( i, 1 );
		$.powerupsCollected++;
	}
};

/*==============================================================================
9. Nuke effect
==============================================================================*/
$.nuke = function() {
	$.audio.play( 'nuke' );
	$.rumble.level = 30;
	$.nukeFlash = 20;
	var i = $.enemies.length;
	while( i-- ) {
		var e = $.enemies[ i ];
		$.explosions.push( new $.Explosion( { x: e.x, y: e.y, radius: e.radius + 10, hue: e.hue, saturation: e.saturation } ) );
		$.score += e.value;
		$.kills++;
		$.level.kills = Math.min( $.level.kills + 1, $.level.killsToLevel );
	}
	$.enemies.length = 0;
	$.enemyBullets.length = 0;
	if( $.bossActive && $.boss ) {
		$.boss.receiveDamage( 0, $.boss.lifeMax * 0.3 );
	}
	$.particleEmitters.push( new $.ParticleEmitter( {
		x: $.hero.x, y: $.hero.y, count: 80, spawnRange: 420, friction: 0.9,
		minSpeed: 6, maxSpeed: 40, minDirection: 0, maxDirection: $.twopi, hue: 0, saturation: 0
	} ) );
};

/*==============================================================================
10. Spawn powerups (weighted, nuke rare) + spawn enemies (difficulty) + boss
==============================================================================*/
$.spawnPowerup = function( x, y, force ) {
	if( !force && Math.random() >= 0.12 ) { return; }
	var len = $.definitions.powerups.length; // 7
	var type;
	if( Math.random() < 0.06 ) {
		type = len - 1; // nuke
	} else {
		var min = ( $.hero.life < 0.9 ) ? 0 : 1;
		type = Math.floor( $.util.rand( min, len - 1 ) );
	}
	var params = $.definitions.powerups[ type ];
	params.type = type;
	params.x = x;
	params.y = y;
	$.powerups.push( new $.Powerup( params ) );
};

$.spawnEnemies = function() {
	var diff = $.getDifficulty();
	var floorTick = Math.floor( $.tick );
	for( var i = 0; i < $.level.distributionCount; i++ ) {
		var timeCheck = $.level.distribution[ i ];
		if( $.levelDiffOffset > 0 ) {
			timeCheck = Math.max( 1, timeCheck - ( $.levelDiffOffset * 2 ) );
		}
		timeCheck = Math.max( 1, Math.round( timeCheck * diff.spawn ) );
		if( floorTick % timeCheck === 0 ) {
			$.enemies.push( $.spawnEnemy( i ) );
		}
	}
};

$.updateLevel = function() {
	if( $.bossActive ) {
		$.level.kills = Math.min( $.level.kills, $.level.killsToLevel );
		return;
	}
	if( $.level.kills >= $.level.killsToLevel ) {
		var next = $.level.current + 1;
		$.level.current = next;
		$.level.kills = 0;
		if( next < $.levelCount ) {
			$.level.killsToLevel = $.definitions.levels[ next ].killsToLevel;
			$.level.distribution = $.definitions.levels[ next ].distribution;
			$.level.distributionCount = $.level.distribution.length;
		}
		$.levelDiffOffset = $.level.current + 1 - $.levelCount;

		/* medic upgrade — heal on level up */
		if( $.upgradeMedic > 0 ) {
			$.hero.life = Math.min( $.hero.lifeMax, $.hero.life + $.upgradeMedic );
		}

		$.levelPops.push( new $.LevelPop( { level: next + 1 } ) );

		if( ( next + 1 ) % 5 === 0 ) {
			$.spawnBoss();
		}
	}
};

/*==============================================================================
11. Powerup timers — new powerups + upgrade-based base weapon
==============================================================================*/
$.updatePowerupTimers = function() {
	/* HEALTH */
	if( $.powerupTimers[ 0 ] > 0 ) {
		if( $.hero.life < $.hero.lifeMax ) { $.hero.life += 0.001; }
		if( $.hero.life > $.hero.lifeMax ) { $.hero.life = $.hero.lifeMax; }
		$.powerupTimers[ 0 ] -= $.dt;
	}

	/* SLOW ENEMIES */
	if( $.powerupTimers[ 1 ] > 0 ) {
		$.slow = 1;
		$.powerupTimers[ 1 ] -= $.dt;
	} else {
		$.slow = 0;
	}

	/* base weapon from upgrades */
	var w = $.hero.weapon;
	w.fireRate = w.baseFireRate;
	w.bullet.speed = w.baseBulletSpeed;
	w.count = w.baseCount;
	w.bullet.piercing = 0;

	/* FAST SHOT */
	if( $.powerupTimers[ 2 ] > 0 ) {
		w.fireRate = Math.max( 1.2, w.baseFireRate * 0.4 );
		w.bullet.speed = w.baseBulletSpeed + 4;
		$.powerupTimers[ 2 ] -= $.dt;
	}

	/* TRIPLE SHOT */
	if( $.powerupTimers[ 3 ] > 0 ) {
		w.count = w.baseCount + 2;
		$.powerupTimers[ 3 ] -= $.dt;
	}

	/* PIERCE SHOT */
	if( $.powerupTimers[ 4 ] > 0 ) {
		w.bullet.piercing = 1;
		$.powerupTimers[ 4 ] -= $.dt;
	}

	/* SHIELD */
	if( $.powerupTimers[ 5 ] > 0 ) {
		$.powerupTimers[ 5 ] -= $.dt;
	}

	/* NUKE has no timer */
	if( $.powerupTimers[ 6 ] ) { $.powerupTimers[ 6 ] = 0; }
};

/*==============================================================================
12. HUD helper
==============================================================================*/
$.hudText = function( opt, color ) {
	$.ctxmg.beginPath();
	$.text( {
		ctx: $.ctxmg,
		x: opt.x, y: opt.y, text: opt.text,
		hspacing: opt.hspacing || 1, vspacing: opt.vspacing || 1,
		halign: opt.halign || 'left', valign: opt.valign || 'top',
		scale: opt.scale || 2, snap: 1, render: 1
	} );
	$.ctxmg.fillStyle = color;
	$.ctxmg.fill();
};

/*==============================================================================
13. Enhanced interface
==============================================================================*/
$.renderInterface = function() {
	/* ambient level tint */
	$.ctxmg.fillStyle = 'hsla(' + ( ( $.level.current * 30 ) % 360 ) + ', 60%, 50%, 0.03)';
	$.ctxmg.fillRect( 0, 0, $.cw, $.ch );

	/* instructions */
	if( $.instructionTick < $.instructionTickMax ) {
		$.instructionTick += $.dt;
		$.hudText( {
			x: $.cw / 2 - 10, y: $.ch - 20,
			text: 'MOVE\nAIM/FIRE\nAUTOFIRE\nPAUSE\nMUTE',
			hspacing: 1, vspacing: 17, halign: 'right', valign: 'bottom', scale: 2
		}, 'hsla(0, 0%, 100%, 0.5)' );
		$.hudText( {
			x: $.cw / 2 + 10, y: $.ch - 20,
			text: 'WASD/ARROWS\nMOUSE\nF\nP\nM',
			hspacing: 1, vspacing: 17, halign: 'left', valign: 'bottom', scale: 2
		}, 'hsla(0, 0%, 100%, 0.7)' );
	}

	/* slow enemies screen cover */
	if( $.powerupTimers[ 1 ] > 0 ) {
		$.ctxmg.fillStyle = 'hsla(200, 100%, 20%, 0.05)';
		$.ctxmg.fillRect( 0, 0, $.cw, $.ch );
	}

	/* HEALTH */
	var lifeRatio = ( $.hero.lifeMax > 0 ) ? ( $.hero.life / $.hero.lifeMax ) : 0;
	$.hudText( { x: 20, y: 20, text: 'HEALTH', scale: 2 }, 'hsla(0, 0%, 100%, 0.5)' );
	var healthBar = { x: 95, y: 22, width: 110, height: 10 };
	$.ctxmg.fillStyle = 'hsla(0, 0%, 20%, 1)';
	$.ctxmg.fillRect( healthBar.x, healthBar.y, healthBar.width, healthBar.height );
	$.ctxmg.fillStyle = 'hsla(0, 0%, 100%, 0.25)';
	$.ctxmg.fillRect( healthBar.x, healthBar.y, healthBar.width, healthBar.height / 2 );
	$.ctxmg.fillStyle = 'hsla(' + lifeRatio * 120 + ', 100%, 40%, 1)';
	$.ctxmg.fillRect( healthBar.x, healthBar.y, lifeRatio * healthBar.width, healthBar.height );
	$.ctxmg.fillStyle = 'hsla(' + lifeRatio * 120 + ', 100%, 75%, 1)';
	$.ctxmg.fillRect( healthBar.x, healthBar.y, lifeRatio * healthBar.width, healthBar.height / 2 );

	if( $.hero.takingDamage && $.hero.life > 0.01 ) {
		$.particleEmitters.push( new $.ParticleEmitter( {
			x: -$.screen.x + healthBar.x + lifeRatio * healthBar.width,
			y: -$.screen.y + healthBar.y + healthBar.height / 2,
			count: 1, spawnRange: 2, friction: 0.85, minSpeed: 2, maxSpeed: 20,
			minDirection: $.pi / 2 - 0.2, maxDirection: $.pi / 2 + 0.2, hue: lifeRatio * 120, saturation: 100
		} ) );
	}

	/* PROGRESS / BOSS */
	var progressLabel = $.bossActive ? 'BOSS' : 'PROGRESS';
	$.hudText( { x: 215, y: 20, text: progressLabel, scale: 2 }, 'hsla(0, 0%, 100%, 0.5)' );
	var progressBar = { x: 312, y: 22, width: 110, height: 10 };
	$.ctxmg.fillStyle = 'hsla(0, 0%, 20%, 1)';
	$.ctxmg.fillRect( progressBar.x, progressBar.y, progressBar.width, progressBar.height );
	$.ctxmg.fillStyle = 'hsla(0, 0%, 100%, 0.25)';
	$.ctxmg.fillRect( progressBar.x, progressBar.y, progressBar.width, progressBar.height / 2 );
	if( $.bossActive ) {
		$.ctxmg.fillStyle = 'hsla(' + $.boss.hue + ', 100%, 50%, 1)';
		$.ctxmg.fillRect( progressBar.x, progressBar.y, progressBar.width, progressBar.height );
	} else {
		var pr = ( $.level.kills / $.level.killsToLevel );
		$.ctxmg.fillStyle = 'hsla(0, 0%, 50%, 1)';
		$.ctxmg.fillRect( progressBar.x, progressBar.y, pr * progressBar.width, progressBar.height );
		$.ctxmg.fillStyle = 'hsla(0, 0%, 100%, 1)';
		$.ctxmg.fillRect( progressBar.x, progressBar.y, pr * progressBar.width, progressBar.height / 2 );
	}

	/* SCORE + BEST */
	$.hudText( { x: 432, y: 20, text: 'SCORE', scale: 2 }, 'hsla(0, 0%, 100%, 0.5)' );
	$.hudText( { x: 496, y: 20, text: $.util.pad( $.score, 6 ), scale: 2 }, 'hsla(0, 0%, 100%, 1)' );
	$.hudText( { x: 571, y: 20, text: 'BEST', scale: 2 }, 'hsla(0, 0%, 100%, 0.5)' );
	$.hudText( { x: 624, y: 20, text: $.util.pad( Math.max( $.storage['score'], $.score ), 6 ), scale: 2 }, 'hsla(0, 0%, 100%, 1)' );

	/* COMBO meter (top center) */
	if( $.combo.count >= 2 ) {
		var mult = $.comboMultiplier(),
			label = 'COMBO ' + $.combo.count;
		if( Math.round( mult ) >= 2 ) {
			label += ' X' + Math.round( mult );
		}
		var alpha = Math.min( 1, 0.6 + 0.4 * Math.sin( $.tick / 6 ) );
		$.hudText( { x: $.cw / 2, y: 30, text: label, halign: 'center', scale: 3 }, 'hsla(45, 100%, 60%, ' + alpha + ')' );
		// decay bar
		var bw = 120,
			ratio = $.combo.tick / $.combo.tickMax;
		$.ctxmg.fillStyle = 'hsla(0, 0%, 20%, 0.8)';
		$.ctxmg.fillRect( $.cw / 2 - bw / 2, 48, bw, 4 );
		$.ctxmg.fillStyle = 'hsla(45, 100%, 60%, 0.9)';
		$.ctxmg.fillRect( $.cw / 2 - bw / 2, 48, bw * ratio, 4 );
	} else if( $.combo.broken && $.combo.popTick > 0 ) {
		$.hudText( { x: $.cw / 2, y: 30, text: 'COMBO LOST', halign: 'center', scale: 3 }, 'hsla(0, 100%, 50%, ' + Math.min( 1, $.combo.popTick / 15 ) + ')' );
	} else if( $.combo.broken ) {
		$.combo.broken = 0;
	}

	/* CREDITS + DIFFICULTY (top right) */
	var diff = $.getDifficulty();
	$.hudText( { x: $.cw - 20, y: 20, text: 'CREDITS ' + $.util.commas( $.storage['credits'] ), halign: 'right', scale: 1 }, 'hsla(0, 0%, 100%, 0.45)' );
	$.hudText( { x: $.cw - 20, y: 32, text: diff.label, halign: 'right', scale: 1 }, 'hsla(0, 0%, 100%, 0.3)' );

	/* powerup timers (bottom right) */
	var py = $.ch - 24;
	for( var pi = 0; pi < 6; pi++ ) {
		if( $.powerupTimers[ pi ] > 0 ) {
			var secs = Math.ceil( $.powerupTimers[ pi ] / 60 );
			$.hudText( {
				x: $.cw - 20, y: py,
				text: $.definitions.powerups[ pi ].title + ' ' + secs,
				halign: 'right', scale: 1
			}, 'hsla(' + $.definitions.powerups[ pi ].hue + ', ' + $.definitions.powerups[ pi ].saturation + '%, ' + $.definitions.powerups[ pi ].lightness + '%, 0.8)' );
			py -= 13;
		}
	}

	/* BOSS bar + warning banner */
	if( $.bossActive && $.boss ) {
		var bw = 420,
			ratio = Math.max( 0, $.boss.life / $.boss.lifeMax );
		if( $.bossBannerTick > 0 ) {
			$.bossBannerTick -= $.dt;
			$.hudText( { x: $.cw / 2, y: 24, text: 'WARNING', halign: 'center', scale: 4 }, 'hsla(0, 100%, 50%, ' + Math.min( 1, $.bossBannerTick / 60 ) + ')' );
		}
		$.ctxmg.fillStyle = 'hsla(0, 0%, 0%, 0.7)';
		$.ctxmg.fillRect( $.cw / 2 - bw / 2, 60, bw, 12 );
		$.ctxmg.fillStyle = 'hsla(' + $.boss.hue + ', 100%, 45%, 1)';
		$.ctxmg.fillRect( $.cw / 2 - bw / 2 + 1, 61, ( bw - 2 ) * ratio, 10 );
		$.ctxmg.fillStyle = 'hsla(' + $.boss.hue + ', 100%, 80%, 0.5)';
		$.ctxmg.fillRect( $.cw / 2 - bw / 2 + 1, 61, ( bw - 2 ) * ratio, 4 );
	}

	/* nuke flash */
	if( $.nukeFlash > 0 ) {
		$.ctxmg.fillStyle = 'hsla(0, 0%, 100%, ' + Math.min( 0.7, $.nukeFlash / 20 ) + ')';
		$.ctxmg.fillRect( 0, 0, $.cw, $.ch );
		$.nukeFlash -= $.dt;
	}
};

/*==============================================================================
14. Minimap — boss marker
==============================================================================*/
var origRenderMinimap = $.renderMinimap;
$.renderMinimap = function() {
	origRenderMinimap();
	if( $.bossActive && $.boss ) {
		var x = $.minimap.x + Math.floor( $.boss.x * $.minimap.scale ),
			y = $.minimap.y + Math.floor( $.boss.y * $.minimap.scale );
		$.ctxmg.fillStyle = 'hsl(' + $.boss.hue + ', 100%, 60%)';
		$.ctxmg.fillRect( x - 2, y - 2, 5, 5 );
	}
};

/*==============================================================================
15. Slow-motion death + scale-corrected mouse
==============================================================================*/
var origUpdateDelta = $.updateDelta;
$.updateDelta = function() {
	origUpdateDelta();
	var target = ( $.hero && $.hero.life <= 0 ) ? 0.35 : 1;
	$.timeScale += ( target - $.timeScale ) * 0.08;
	$.dt *= $.timeScale;
};

$.mousescreen = function() {
	var s = $.scale || 1;
	$.mouse.sx = ( $.mouse.ax - $.cOffset.left ) / s;
	$.mouse.sy = ( $.mouse.ay - $.cOffset.top ) / s;
	$.mouse.x = $.mouse.sx - $.screen.x;
	$.mouse.y = $.mouse.sy - $.screen.y;
};

/*==============================================================================
16. Responsive scaling (safe-area aware)
==============================================================================*/
$.applyScale = function() {
	var pad = 20,
		viewportW = window.innerWidth || document.documentElement.clientWidth,
		viewportH = window.innerHeight || document.documentElement.clientHeight,
		s = Math.min( 1, viewportW / ( $.cw + pad ), viewportH / ( $.ch + pad ) );
	$.scale = s;
	var wrap = document.getElementById( 'wrap' );
	if( wrap ) {
		wrap.style.transform = 'scale(' + s + ')';
	}
};

/*==============================================================================
16b. Touch HUD buttons (pause / mute / fullscreen) + toggles
==============================================================================*/
$.buildTouchButtons = function() {
	var r = 17,
		margin = 14;
	$.touchButtons = [
		{ id: 'pause',      x: $.cw - margin - r,         y: margin + r,            r: r, label: 'II' },
		{ id: 'mute',       x: $.cw - margin - r,         y: margin + r * 3 + 10,   r: r, label: 'M'  },
		{ id: 'fullscreen', x: $.cw - margin - r * 3 - 8, y: margin + r,            r: r, label: 'F'  }
	];
};

$.renderTouchButtons = function() {
	if( !$.touch.supported ) { return; }
	var btns = $.touchButtons || [];
	for( var i = 0; i < btns.length; i++ ) {
		var b = btns[ i ];
		$.util.fillCircle( $.ctxmg, b.x, b.y, b.r, 'hsla(0, 0%, 0%, 0.45)' );
		$.ctxmg.strokeStyle = 'hsla(0, 0%, 100%, 0.35)';
		$.ctxmg.lineWidth = 1.5;
		$.ctxmg.beginPath();
		$.ctxmg.arc( b.x, b.y, b.r, 0, $.twopi );
		$.ctxmg.stroke();

		var label = b.label;
		if( b.id === 'mute' ) { label = $.mute ? 'X' : 'M'; }

		$.ctxmg.beginPath();
		$.text( {
			ctx: $.ctxmg, x: b.x, y: b.y, text: label,
			hspacing: 1, vspacing: 0, halign: 'center', valign: 'center', scale: 2, snap: 1, render: 1
		} );
		$.ctxmg.fillStyle = 'hsla(0, 0%, 100%, 0.85)';
		$.ctxmg.fill();
	}
};

$.toggleMute = function() {
	$.mute = ~~!$.mute;
	var i = $.audio.references.length;
	while( i-- ) {
		$.audio.references[ i ].volume = ~~!$.mute;
	}
	$.storage['mute'] = $.mute;
	$.updateStorage();
};

$.toggleFullscreen = function() {
	var el = document.documentElement;
	if( !document.fullscreenElement && !document.webkitFullscreenElement ) {
		if( el.requestFullscreen ) { el.requestFullscreen(); }
		else if( el.webkitRequestFullscreen ) { el.webkitRequestFullscreen(); }
	} else {
		if( document.exitFullscreen ) { document.exitFullscreen(); }
		else if( document.webkitExitFullscreen ) { document.webkitExitFullscreen(); }
	}
};

/*==============================================================================
17. Init / reset wrapping
==============================================================================*/
var origInit = $.init;
$.init = function() {
	origInit();
	$.enemyBullets = [];
	$.nukeFlash = 0;
	$.timeScale = 1;
	$.boss = null;
	$.bossActive = 0;
	$.bossBannerTick = 0;
	$.lastCredits = 0;
	$.newBest = 0;
	$.buildTouchButtons();
	$.applyScale();
	$.setupTouch();
	$.resizecb();
	window.addEventListener( 'resize', function() {
		$.applyScale();
		$.resizecb();
	} );
};

var origReset = $.reset;
$.reset = function() {
	origReset();

	if( !$.enemyBullets ) { $.enemyBullets = []; }
	$.enemyBullets.length = 0;
	$.boss = null;
	$.bossActive = 0;
	$.bossBannerTick = 0;
	$.timeScale = 1;
	$.nukeFlash = 0;

	$.comboReset();
	$.applyUpgrades();
	$.hero.invulnTick = 0;

	/* headstart upgrade */
	var ls = $.upgradeLevel( 'headstart' );
	$.levelStart = Math.min( ls, 4 );
	if( $.levelStart > 0 ) {
		$.level.current = $.levelStart;
		$.level.kills = 0;
		$.level.killsToLevel = $.definitions.levels[ $.level.current ].killsToLevel;
		$.level.distribution = $.definitions.levels[ $.level.current ].distribution;
		$.level.distributionCount = $.level.distribution.length;
		$.levelDiffOffset = 0;
	}

	/* spawn boss immediately if starting on a boss level */
	if( $.level.current > 0 && ( $.level.current + 1 ) % 5 === 0 ) {
		$.spawnBoss();
	}
};

/*==============================================================================
18. Menu / shop buttons
==============================================================================*/
$.buildMenuButtons = function() {
	var cx = $.cw / 2 + 1,
		y = 250,
		gap = 45,
		width = 299,
		height = 40,
		scale = 3;

	var play = new $.Button( { x: cx, y: y, lockedWidth: width, lockedHeight: height, scale: scale, title: 'PLAY',
		action: function() { $.reset(); $.audio.play( 'levelup' ); $.setState( 'play' ); } } );
	$.buttons.push( play );
	y += gap;

	var stats = new $.Button( { x: cx, y: y, lockedWidth: width, lockedHeight: height, scale: scale, title: 'STATS',
		action: function() { $.setState( 'stats' ); } } );
	$.buttons.push( stats );
	y += gap;

	var credits = new $.Button( { x: cx, y: y, lockedWidth: width, lockedHeight: height, scale: scale, title: 'CREDITS',
		action: function() { $.setState( 'credits' ); } } );
	$.buttons.push( credits );
	y += gap;

	var shop = new $.Button( { x: cx, y: y, lockedWidth: width, lockedHeight: height, scale: scale, title: 'UPGRADES',
		action: function() { $.setState( 'upgrades' ); } } );
	$.buttons.push( shop );
	y += gap;

	var diff = $.getDifficulty();
	var diffButton = new $.Button( { x: cx, y: y, lockedWidth: width, lockedHeight: 32, scale: 2,
		title: 'DIFFICULTY: ' + diff.label,
		action: function() {
			var order = [ 'easy', 'normal', 'hard', 'nightmare' ],
				cur = $.storage['difficulty'],
				idx = order.indexOf( cur );
			idx = ( idx + 1 ) % order.length;
			$.storage['difficulty'] = order[ idx ];
			$.updateStorage();
			this.title = 'DIFFICULTY: ' + $.getDifficulty().label;
			$.audio.play( 'click' );
		} } );
	$.buttons.push( diffButton );
};

$.upgradeLabel = function( def ) {
	var level = $.upgradeLevel( def.key );
	if( level >= def.max ) {
		return def.title + ' ' + level + '/' + def.max + ' MAX';
	}
	return def.title + ' ' + level + '/' + def.max + ' COST ' + $.util.commas( $.upgradeCost( def.key ) );
};

$.buildUpgradeButtons = function() {
	var cx = $.cw / 2 + 1,
		y = 175,
		gap = 34,
		width = 380,
		height = 28,
		scale = 2;

	for( var i = 0; i < $.definitions.upgrades.length; i++ ) {
		( function( def ) {
			var btn = new $.Button( {
				x: cx, y: y, lockedWidth: width, lockedHeight: height, scale: scale,
				title: $.upgradeLabel( def ),
				action: function() {
					var before = $.upgradeLevel( def.key );
					if( $.upgradeBuy( def.key ) ) {
						this.title = $.upgradeLabel( def );
						$.audio.play( 'buy' );
					} else if( before < def.max ) {
						this.title = def.title + ' NEED ' + $.util.commas( $.upgradeCost( def.key ) ) + ' CREDITS';
					}
				}
			} );
			btn.def = def;
			$.buttons.push( btn );
		} )( $.definitions.upgrades[ i ] );
		y += gap;
	}

	var menu = new $.Button( { x: cx, y: 530, lockedWidth: 299, lockedHeight: 40, scale: 3, title: 'MENU',
		action: function() { $.setState( 'menu' ); } } );
	$.buttons.push( menu );
};

/*==============================================================================
19. setState wrapping — buttons + game-over bookkeeping
==============================================================================*/
var origSetState = $.setState;
$.setState = function( state ) {
	var prevBest = $.storage['score'];
	origSetState( state );

	if( state == 'gameover' ) {
		$.newBest = ( $.score > prevBest && $.score > 0 );
		$.lastCredits = $.awardCredits();
	}

	if( state == 'menu' ) {
		$.buttons.length = 0;
		$.buildMenuButtons();
	}

	if( state == 'upgrades' ) {
		$.buttons.length = 0;
		$.buildUpgradeButtons();
	}
};

/*==============================================================================
20. State overrides
==============================================================================*/
var origSetupStates = $.setupStates;
$.setupStates = function() {
	origSetupStates();

	$.states['play'] = function() {
		$.updateDelta();
		$.updateScreen();
		$.updateLevel();
		$.updatePowerupTimers();
		$.spawnEnemies();
		$.enemyOffsetMod += ( $.slow ) ? $.dt / 3 : $.dt;
		$.touch.apply();
		$.comboUpdate();

		/* update entities */
		var i = $.enemies.length; while( i-- ){ $.enemies[ i ].update( i ) }
			i = $.explosions.length; while( i-- ){ $.explosions[ i ].update( i ) }
			i = $.powerups.length; while( i-- ){ $.powerups[ i ].update( i ) }
			i = $.particleEmitters.length; while( i-- ){ $.particleEmitters[ i ].update( i ) }
			i = $.textPops.length; while( i-- ){ $.textPops[ i ].update( i ) }
			i = $.levelPops.length; while( i-- ){ $.levelPops[ i ].update( i ) }
			i = $.bullets.length; while( i-- ){ $.bullets[ i ].update( i ) }
			i = $.enemyBullets.length; while( i-- ){ $.enemyBullets[ i ].update( i ) }
		if( $.bossActive && $.boss ) { $.boss.update(); }
		$.hero.update();

		/* render entities */
		$.clearScreen();
		$.ctxmg.save();
		$.ctxmg.translate( $.screen.x - $.rumble.x, $.screen.y - $.rumble.y );
		i = $.enemies.length; while( i-- ){ $.enemies[ i ].render( i ) }
		i = $.explosions.length; while( i-- ){ $.explosions[ i ].render( i ) }
		i = $.powerups.length; while( i-- ){ $.powerups[ i ].render( i ) }
		i = $.particleEmitters.length; while( i-- ){ $.particleEmitters[ i ].render( i ) }
		i = $.textPops.length; while( i-- ){ $.textPops[ i ].render( i ) }
		i = $.bullets.length; while( i-- ){ $.bullets[ i ].render( i ) }
		i = $.enemyBullets.length; while( i-- ){ $.enemyBullets[ i ].render() }
		if( $.bossActive && $.boss ) { $.boss.render(); }
		$.hero.render();
		$.ctxmg.restore();
		i = $.levelPops.length; while( i-- ){ $.levelPops[ i ].render( i ) }
		$.renderInterface();
		$.renderMinimap();
		$.renderTouchButtons();
		$.touch.render();

		/* handle gameover */
		if( $.hero.life <= 0 ) {
			var alpha = ( ( $.gameoverTick / $.gameoverTickMax ) * 0.8 );
			alpha = Math.min( 1, Math.max( 0, alpha ) );
			$.ctxmg.fillStyle = 'hsla(0, 100%, 0%, ' + alpha + ')';
			$.ctxmg.fillRect( 0, 0, $.cw, $.ch );
			if( $.gameoverTick < $.gameoverTickMax ) {
				$.gameoverTick += $.dt;
			} else {
				$.setState( 'gameover' );
			}

			if( !$.gameoverExplosion ) {
				$.audio.play( 'death' );
				$.rumble.level = 25;
				$.explosions.push( new $.Explosion( {
					x: $.hero.x + $.util.rand( -10, 10 ), y: $.hero.y + $.util.rand( -10, 10 ),
					radius: 50, hue: 0, saturation: 0
				} ) );
				$.particleEmitters.push( new $.ParticleEmitter( {
					x: $.hero.x, y: $.hero.y, count: 45, spawnRange: 10, friction: 0.95,
					minSpeed: 2, maxSpeed: 20, minDirection: 0, maxDirection: $.twopi, hue: 0, saturation: 0
				} ) );
				for( var t = 0; t < $.powerupTimers.length; t++ ) {
					$.powerupTimers[ t ] = 0;
				}
				$.gameoverExplosion = 1;
			}
		}

		/* update tick */
		$.tick += $.dt;

		/* listen for pause */
		if( $.keys.pressed.p ) {
			$.setState( 'pause' );
		}

		/* always listen for autofire toggle */
		if( $.keys.pressed.f ) {
			$.autofire = ~~!$.autofire;
			$.storage['autofire'] = $.autofire;
			$.updateStorage();
		}
	};

	$.states['menu'] = function() {
		$.clearScreen();
		$.updateScreen();

		var i = $.buttons.length; while( i-- ){ $.buttons[ i ].update( i ) }
			i = $.buttons.length; while( i-- ){ $.buttons[ i ].render( i ) }

		$.ctxmg.beginPath();
		var title = $.text( {
			ctx: $.ctxmg, x: $.cw / 2, y: 150, text: 'RADIUS FIGHT',
			hspacing: 2, vspacing: 1, halign: 'center', valign: 'bottom', scale: 10, snap: 1, render: 1
		} );
		var gradient = $.ctxmg.createLinearGradient( title.sx, title.sy, title.sx, title.ey );
		gradient.addColorStop( 0, '#fff' );
		gradient.addColorStop( 1, '#999' );
		$.ctxmg.fillStyle = gradient;
		$.ctxmg.fill();

		$.ctxmg.beginPath();
		var sub = $.text( {
			ctx: $.ctxmg, x: $.cw / 2, y: 158, text: 'DEV APPS AND GAMES',
			hspacing: 2, vspacing: 1, halign: 'center', valign: 'top', scale: 2, snap: 1, render: 1
		} );
		$.ctxmg.fillStyle = 'hsla(45, 100%, 60%, 0.9)';
		$.ctxmg.fill();

		$.ctxmg.beginPath();
		var creditsLine = $.text( {
			ctx: $.ctxmg, x: $.cw / 2, y: 556, text: 'CREATED BY DEVRAJ PODDAR',
			hspacing: 1, vspacing: 1, halign: 'center', valign: 'bottom', scale: 1, snap: 1, render: 1
		} );
		$.ctxmg.fillStyle = '#666';
		$.ctxmg.fill();

		$.ctxmg.beginPath();
		var enhancedLine = $.text( {
			ctx: $.ctxmg, x: $.cw / 2, y: 566, text: 'ENHANCED EDITION 2026',
			hspacing: 1, vspacing: 1, halign: 'center', valign: 'bottom', scale: 1, snap: 1, render: 1
		} );
		$.ctxmg.fillStyle = '#555';
		$.ctxmg.fill();

		if( $.touch.supported ) {
			$.ctxmg.beginPath();
			var touchHint = $.text( {
				ctx: $.ctxmg, x: $.cw / 2, y: 582, text: 'TOUCH: LEFT SIDE MOVE  RIGHT SIDE AIM/FIRE',
				hspacing: 1, vspacing: 1, halign: 'center', valign: 'bottom', scale: 1, snap: 1, render: 1
			} );
			$.ctxmg.fillStyle = 'hsla(0, 0%, 100%, 0.35)';
			$.ctxmg.fill();
		}
	};

	$.states['pause'] = function() {
		$.clearScreen();
		$.ctxmg.putImageData( $.screenshot, 0, 0 );

		$.ctxmg.fillStyle = 'hsla(0, 0%, 0%, 0.4)';
		$.ctxmg.fillRect( 0, 0, $.cw, $.ch );

		$.ctxmg.beginPath();
		var pauseText = $.text( {
			ctx: $.ctxmg, x: $.cw / 2, y: $.ch / 2 - 50, text: 'PAUSED',
			hspacing: 3, vspacing: 1, halign: 'center', valign: 'bottom', scale: 10, snap: 1, render: 1
		} );
		var gradient = $.ctxmg.createLinearGradient( pauseText.sx, pauseText.sy, pauseText.sx, pauseText.ey );
		gradient.addColorStop( 0, '#fff' );
		gradient.addColorStop( 1, '#999' );
		$.ctxmg.fillStyle = gradient;
		$.ctxmg.fill();

		$.hudText( { x: $.cw / 2, y: $.ch / 2 - 14, text: 'DIFFICULTY: ' + $.getDifficulty().label, halign: 'center', scale: 2 }, 'hsla(0, 0%, 100%, 0.6)' );

		var i = $.buttons.length; while( i-- ){ $.buttons[ i ].render( i ) }
			i = $.buttons.length; while( i-- ){ $.buttons[ i ].update( i ) }

		if( $.keys.pressed.p ) {
			$.setState( 'play' );
		}
	};

	$.states['gameover'] = function() {
		$.clearScreen();
		$.ctxmg.putImageData( $.screenshot, 0, 0 );

		var i = $.buttons.length; while( i-- ){ $.buttons[ i ].update( i ) }
			i = $.buttons.length; while( i-- ){ $.buttons[ i ].render( i ) }

		$.ctxmg.beginPath();
		var gameoverTitle = $.text( {
			ctx: $.ctxmg, x: $.cw / 2, y: 120, text: 'GAME OVER',
			hspacing: 3, vspacing: 1, halign: 'center', valign: 'bottom', scale: 10, snap: 1, render: 1
		} );
		var gradient = $.ctxmg.createLinearGradient( gameoverTitle.sx, gameoverTitle.sy, gameoverTitle.sx, gameoverTitle.ey );
		gradient.addColorStop( 0, '#f22' );
		gradient.addColorStop( 1, '#b00' );
		$.ctxmg.fillStyle = gradient;
		$.ctxmg.fill();

		if( $.newBest ) {
			$.hudText( { x: $.cw / 2, y: 130, text: 'NEW BEST', halign: 'center', scale: 3 }, 'hsla(45, 100%, 60%, ' + ( 0.6 + 0.4 * Math.sin( $.tick / 6 ) ) + ')' );
		}

		$.hudText( { x: $.cw / 2, y: 162, text: '+' + $.lastCredits + ' CREDITS', halign: 'center', scale: 2 }, 'hsla(45, 100%, 60%, 0.9)' );

		$.ctxmg.beginPath();
		var gameoverStatsKeys = $.text( {
			ctx: $.ctxmg, x: $.cw / 2 - 10, y: 200,
			text: 'SCORE\nLEVEL\nKILLS\nBULLETS\nPOWERUPS\nTIME',
			hspacing: 1, vspacing: 17, halign: 'right', valign: 'top', scale: 2, snap: 1, render: 1
		} );
		$.ctxmg.fillStyle = 'hsla(0, 0%, 100%, 0.5)';
		$.ctxmg.fill();

		$.ctxmg.beginPath();
		var gameoverStatsValues = $.text( {
			ctx: $.ctxmg, x: $.cw / 2 + 10, y: 200,
			text:
				$.util.commas( $.score ) + '\n' +
				( $.level.current + 1 ) + '\n' +
				$.util.commas( $.kills ) + '\n' +
				$.util.commas( $.bulletsFired ) + '\n' +
				$.util.commas( $.powerupsCollected ) + '\n' +
				$.util.convertTime( ( $.elapsed * ( 1000 / 60 ) ) / 1000 ),
			hspacing: 1, vspacing: 17, halign: 'left', valign: 'top', scale: 2, snap: 1, render: 1
		} );
		$.ctxmg.fillStyle = '#fff';
		$.ctxmg.fill();
	};

	$.states['stats'] = function() {
		$.clearScreen();

		$.ctxmg.beginPath();
		var statsTitle = $.text( {
			ctx: $.ctxmg, x: $.cw / 2, y: 130, text: 'STATS',
			hspacing: 3, vspacing: 1, halign: 'center', valign: 'bottom', scale: 10, snap: 1, render: 1
		} );
		var gradient = $.ctxmg.createLinearGradient( statsTitle.sx, statsTitle.sy, statsTitle.sx, statsTitle.ey );
		gradient.addColorStop( 0, '#fff' );
		gradient.addColorStop( 1, '#999' );
		$.ctxmg.fillStyle = gradient;
		$.ctxmg.fill();

		$.ctxmg.beginPath();
		var statKeys = $.text( {
			ctx: $.ctxmg, x: $.cw / 2 - 10, y: statsTitle.ey + 30,
			text: 'BEST SCORE\nBEST LEVEL\nROUNDS PLAYED\nENEMIES KILLED\nBULLETS FIRED\nPOWERUPS COLLECTED\nTIME ELAPSED\nCREDITS\nBEST COMBO\nDIFFICULTY',
			hspacing: 1, vspacing: 15, halign: 'right', valign: 'top', scale: 2, snap: 1, render: 1
		} );
		$.ctxmg.fillStyle = 'hsla(0, 0%, 100%, 0.5)';
		$.ctxmg.fill();

		$.ctxmg.beginPath();
		var statValues = $.text( {
			ctx: $.ctxmg, x: $.cw / 2 + 10, y: statsTitle.ey + 30,
			text:
				$.util.commas( $.storage['score'] ) + '\n' +
				( $.storage['level'] + 1 ) + '\n' +
				$.util.commas( $.storage['rounds'] ) + '\n' +
				$.util.commas( $.storage['kills'] ) + '\n' +
				$.util.commas( $.storage['bullets'] ) + '\n' +
				$.util.commas( $.storage['powerups'] ) + '\n' +
				$.util.convertTime( ( $.storage['time'] * ( 1000 / 60 ) ) / 1000 ) + '\n' +
				$.util.commas( $.storage['credits'] ) + '\n' +
				'X' + $.storage['bestcombo'] + '\n' +
				$.getDifficulty().label,
			hspacing: 1, vspacing: 15, halign: 'left', valign: 'top', scale: 2, snap: 1, render: 1
		} );
		$.ctxmg.fillStyle = '#fff';
		$.ctxmg.fill();

		var i = $.buttons.length; while( i-- ){ $.buttons[ i ].render( i ) }
			i = $.buttons.length; while( i-- ){ $.buttons[ i ].update( i ) }
	};

	$.states['upgrades'] = function() {
		$.clearScreen();

		$.ctxmg.beginPath();
		var shopTitle = $.text( {
			ctx: $.ctxmg, x: $.cw / 2, y: 70, text: 'UPGRADES',
			hspacing: 3, vspacing: 1, halign: 'center', valign: 'bottom', scale: 8, snap: 1, render: 1
		} );
		var gradient = $.ctxmg.createLinearGradient( shopTitle.sx, shopTitle.sy, shopTitle.sx, shopTitle.ey );
		gradient.addColorStop( 0, '#fff' );
		gradient.addColorStop( 1, '#999' );
		$.ctxmg.fillStyle = gradient;
		$.ctxmg.fill();

		$.hudText( { x: $.cw / 2, y: 100, text: 'CREDITS ' + $.util.commas( $.storage['credits'] ), halign: 'center', scale: 3 }, 'hsla(45, 100%, 60%, 0.95)' );
		$.hudText( { x: $.cw / 2, y: 124, text: 'EARN CREDITS EACH RUN TO UPGRADE YOUR SHIP', halign: 'center', scale: 1 }, 'hsla(0, 0%, 100%, 0.4)' );

		var i = $.buttons.length; while( i-- ){ $.buttons[ i ].render( i ) }
			i = $.buttons.length; while( i-- ){ $.buttons[ i ].update( i ) }
	};
};

})();
