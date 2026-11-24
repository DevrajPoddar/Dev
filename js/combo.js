/*==============================================================================
Radius Raid // Overdrive — kill combo / score multiplier
==============================================================================*/
$.combo = {
	count: 0,
	tick: 0,
	tickMax: 90,       // frames (1.5s at 60fps) to keep the chain alive
	countMax: 80,
	popTick: 0
};

$.comboReset = function() {
	$.combo.count = 0;
	$.combo.tick = 0;
	$.combo.popTick = 0;
};

$.comboMultiplier = function() {
	if( $.combo.count <= 1 ) {
		return 1;
	}
	return 1 + Math.min( $.combo.count, $.combo.countMax ) * 0.05; // up to x5
};

$.comboAdd = function() {
	$.combo.count++;
	$.combo.tick = $.combo.tickMax;
	$.combo.popTick = 12;
	$.combo.broken = 0;
	if( $.combo.count > $.storage['bestcombo'] ) {
		$.storage['bestcombo'] = $.combo.count;
		$.updateStorage();
	}
};

$.comboBreak = function() {
	if( $.combo.count >= 5 ) {
		$.combo.popTick = 30;
		$.combo.broken = 1;
		$.audio.play( 'comboBreak' );
	}
	$.combo.count = 0;
	$.combo.tick = 0;
};

$.comboUpdate = function() {
	if( $.combo.count > 0 ) {
		if( $.combo.tick > 0 ) {
			$.combo.tick -= $.dt;
		} else {
			$.combo.count = 0;
		}
	}
	if( $.combo.popTick > 0 ) {
		$.combo.popTick -= $.dt;
	}
};
