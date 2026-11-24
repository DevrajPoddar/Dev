/*==============================================================================
Radius Raid // Overdrive — meta-progression upgrade shop
==============================================================================*/

$.definitions.difficulties = {
	'easy':     { life: 0.75,  speed: 0.85,  spawn: 1.35, score: 0.7,  label: 'EASY' },
	'normal':   { life: 1,     speed: 1,     spawn: 1,    score: 1,    label: 'NORMAL' },
	'hard':     { life: 1.5,   speed: 1.15,  spawn: 0.8,  score: 1.5,  label: 'HARD' },
	'nightmare':{ life: 2.2,   speed: 1.35,  spawn: 0.62, score: 2.5,  label: 'NIGHTMARE' }
};

/* rank 0 = not owned, effect applies once per rank above 0 */
$.definitions.upgrades = [
	{ key: 'hull',      title: 'HULL',      desc: 'MAX HP UP',          baseCost: 50,  max: 5 },
	{ key: 'thrust',    title: 'THRUST',    desc: 'MOVE SPEED UP',      baseCost: 50,  max: 5 },
	{ key: 'rapid',     title: 'RAPID',     desc: 'FIRE RATE UP',       baseCost: 75,  max: 5 },
	{ key: 'caliber',   title: 'CALIBER',   desc: 'BULLET DAMAGE UP',   baseCost: 75,  max: 5 },
	{ key: 'velocity',  title: 'VELOCITY',  desc: 'BULLET SPEED UP',    baseCost: 75,  max: 5 },
	{ key: 'spread',    title: 'SPREAD',    desc: 'EXTRA PROJECTILE',   baseCost: 125, max: 3 },
	{ key: 'magnet',    title: 'MAGNET',    desc: 'PICKUP RADIUS UP',   baseCost: 100, max: 5 },
	{ key: 'medic',     title: 'MEDIC',     desc: 'HEAL ON LEVEL UP',   baseCost: 100, max: 5 },
	{ key: 'scrooge',   title: 'SCROOGE',   desc: 'SCORE BONUS UP',     baseCost: 125, max: 5 },
	{ key: 'headstart', title: 'HEADSTART', desc: 'START ON LATER LEVEL', baseCost: 200, max: 4 }
];

$.getDifficulty = function() {
	return $.definitions.difficulties[ $.storage['difficulty'] ] || $.definitions.difficulties['normal'];
};

$.upgradeLevel = function( key ) {
	return ( $.storage['upgrades'] && $.storage['upgrades'][ key ] ) || 0;
};

$.upgradeDef = function( key ) {
	for( var i = 0; i < $.definitions.upgrades.length; i++ ) {
		if( $.definitions.upgrades[ i ].key == key ) {
			return $.definitions.upgrades[ i ];
		}
	}
	return null;
};

$.upgradeCost = function( key ) {
	var def = $.upgradeDef( key );
	return def.baseCost * ( $.upgradeLevel( key ) + 1 );
};

$.upgradeBuy = function( key ) {
	var def = $.upgradeDef( key ),
		level = $.upgradeLevel( key ),
		cost = $.upgradeCost( key );
	if( level < def.max && $.storage['credits'] >= cost ) {
		$.storage['credits'] -= cost;
		$.storage['upgrades'][ key ] = level + 1;
		$.updateStorage();
		$.audio.play( 'buy' );
		return 1;
	}
	$.audio.play( 'deny' );
	return 0;
};

$.awardCredits = function() {
	// score / 40 + kills / 8 + level * 4
	var gained = Math.floor( $.score / 40 ) + Math.floor( $.kills / 8 ) + ( $.level.current + 1 ) * 4;
	gained = Math.max( 1, gained );
	$.storage['credits'] += gained;
	$.lastCredits = gained;
	$.updateStorage();
	return gained;
};

/* apply purchased ranks to the hero + global multipliers */
$.applyUpgrades = function() {
	var hull = $.upgradeLevel( 'hull' ),
		thrust = $.upgradeLevel( 'thrust' ),
		rapid = $.upgradeLevel( 'rapid' ),
		caliber = $.upgradeLevel( 'caliber' ),
		velocity = $.upgradeLevel( 'velocity' ),
		spread = $.upgradeLevel( 'spread' ),
		magnet = $.upgradeLevel( 'magnet' ),
		scrooge = $.upgradeLevel( 'scrooge' ),
		headstart = $.upgradeLevel( 'headstart' );

	$.hero.lifeMax = 1 + hull * 0.2;
	$.hero.life = $.hero.lifeMax;
	$.hero.vmax = 6 + thrust * 0.4;

	$.hero.weapon.fireRate = Math.max( 2.2, 5 - rapid * 0.35 );
	$.hero.weapon.fireRateTick = 0;
	$.hero.weapon.count = 1 + spread;
	$.hero.weapon.bullet.damage = 1 + caliber * 0.5;
	$.hero.weapon.bullet.speed = 10 + velocity * 0.8;

	/* base stats used by updatePowerupTimers to restore after timed powerups */
	$.hero.weapon.baseFireRate = $.hero.weapon.fireRate;
	$.hero.weapon.baseBulletSpeed = $.hero.weapon.bullet.speed;
	$.hero.weapon.baseCount = $.hero.weapon.count;
	$.hero.weapon.baseDamage = $.hero.weapon.bullet.damage;

	$.upgradeMagnet = magnet * 24;
	$.upgradeScore = 1 + scrooge * 0.1;
	$.upgradeMedic = $.upgradeLevel( 'medic' ) * 0.05;

	$.levelStart = Math.min( headstart, 4 );
};
