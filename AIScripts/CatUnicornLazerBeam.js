/*****************************************************************************************
 * The goal of this AI is to quickly expand and group individuals for quick attack.
 * Last Update: 01/17/2015
 * Contributed by: Daniel Kotowski & Michael McLean
 ****************************************************************************************/
var msg = [];
var ID;
var Units;
var Bases;
var orders;

var minBound = -20
var maxBound = 520





onmessage = function ( ev ) {
	for( var cmd in ev.data ) {
		switch( cmd ) {
			case "setID":
				//used so I can identify which units the game has classified as 'mine'
				ID = ev.data[cmd];
				while (msg.length > 0) {
		    		msg.pop();
				}
				break;
			default:
				//pre-process entities
				processUnits(ev.data["Data"].units);
				processBases(ev.data["Data"].bases);

				//strategy response
				dataResponse();
		}
	}	
};

/*****************************************************************************************
 * Utility Functions
 ****************************************************************************************/

 //checks if an enemy unit is in attacking range.  If there are multiple, select the 
 //weakest
enemyInRange = function( me, them ) {
	targetLife = 999;
	target = -1;
	for( var i = 0;  i < them.length; i++ ) {
		if( them[i].health <= 0 || them[i].id < 0 ) {
			continue;
		}
		var x = me.locx - them[i].locx;
		var y = me.locy - them[i].locy;
		if( x*x + y*y < me.atkRadius*me.atkRadius && them[i].health < targetLife ) {
			targetLife = them[i].health;
			target = them[i].id;
		}
	}
	return target;
};



//identify the direction i should move in to get to a target destination
getDir = function( x1, y1, x2, y2 ) {
	var w = x1 - x2;
	var h = y1 - y2;

	if( Math.abs( w ) > Math.abs( h ) ){
		if( w < 0 ) {
			return "right";
		} else {
			return "left";
		}
	} else {
		if( h < 0 ) {
			return "down";
		} else {
			return "up";
		}
	}
	return "";
};

getOppisiteDir = function(dir){

	if (dir === 'right') {
		dir = 'left';
	} else if (dir === 'left') {
		dir = 'right';
	} else if(dir === 'up'){
		dir = 'down';
	}else if(dir === 'down'){
		dir = 'up';
	}

	return dir;
}


isUnitInBase = function ( base, unit ) {
	var x = base.locx - unit.locx;
	var y = base.locy - unit.locy;
	if ( x*x + y*y < base.R*base.R ) {
		return true;
	}	
	return false;
}

//check if enemies are inside a base
isEnemyInBase = function( base, foes ) {
	for( var i = 0; i < foes.length; i++ ) {
		if( foes[i].health <= 0 ) {
			continue;
		}

		if( isUnitInBase( base, foes[i] ) ) {
			return true;
		}
	}
	return false;
};

ownedBase = function( bases ) {
	for( var i = 0; i < bases.length; i++ ) {
		if( bases[i].allegiance == ID ) {
			return bases[i];
		}
	}
	return -1;
}

getMyBases = function(bases){
	var myBases = [];
	for( var i=0;i<bases.length; i++){
		if(bases[i].allegiance == ID){
			myBases.push(bases[i]);
		}
	}

	return myBases;
}

farmingUnitsInBase = function(units, base){

	var count = 0;

	for(var i=0;i<farmingUnits.length; i++){
		if(isUnitInBase(base, farmingUnits[i])){
			count++;
		}
	}

	return count;
}

unitInMyBases = function(unit) {

	for(var i=0;i<Bases.mine.length;i++) {
		base = Bases.mine[i];
		if(isUnitInBase(base,unit)) {
			return base;
		}
	}

	return false;

}

isOutsideGameMap = function(unit){

	if(unit.locx > maxBound || unit.locx < minBound || unit.locy > maxBound || unit.locy < minBound ){
		return true
	}
	return false;
}


processUnits = function(units){
	p_units = {
		mine:[],
		enemies:[]

	}

	for(var i=0;i<units.length;i++){
		unit = units[i];
		if(unit.allegiance == ID){
			p_units.mine.push(unit);
		}
		else if(unit.health > 0 && unit.id > 0){
			if(!isOutsideGameMap(unit)){
				p_units.enemies.push(unit);
			}
		}
	}

	Units = p_units;
	p_units.enemies.sort(enemySort);

}

processBases = function(bases){

	p_bases =  {
		open:[],
		mine:[],
		enemies:[],
		unitsInBaseFarming:{}
	};

	for(var i=0;i<bases.length;i++){

		base = bases[i];
		if(base.allegiance == ID){
			p_bases.mine.push(base);
			p_bases.unitsInBaseFarming[base.id] = 0;
		}else if(base.allegiance == -1){
			p_bases.open.push(base);
		}else{
			p_bases.enemies.push(base);
		}
	}
	Bases =  p_bases;
	Bases.open.sort(baseSort);
	Bases.enemies.sort(baseSort);

}

/* Consistent Distance Fucntion */
distance = function(x1,y1,x2,y2){

	deltaX = (x1-x2);
	deltaY = (y1-y2);

	return(Math.sqrt((deltaX*deltaX) + (deltaY*deltaY)));
}


enemyRating = function(e){
	ret = 0;

	for(var i=0;i<Units.mine.length;i++){
		unit = Units.mine[i];
		ret += distance(e.locx, e.locy,unit.locx,unit.locy)*e.health;
	}

	return ret;
}

findClosestBase = function(unit){

	cBase = Bases.mine[0];
	dist = distance(unit.locx,unit.locy,cBase.locx,cBase.locy);

	for(var i=1;i<Bases.mine.length;i++){
		base = Bases.mine[i];
		n_dist = distance(unit.locx,unit.locy,cBase.locx,cBase.locy);
		if(n_dist < dist){
			cBase = base;
			dist = n_dist;
		}
	}

	return cBase;
}




enemySort = function(e1,e2){
	return enemyRating(e1) - enemyRating(e2);
}

//Distance from owned base maybe
baseDistanceFromUnits = function(b){
	var ret = 0;
	/*for(var i=0;i<Units.mine.length;i++){
		unit = Units.mine[i];
		ret += distance(unit.locx, unit.locy,b.locx, b.locy);
	}*/
	var base = Bases.mine[0];
	ret = distance(base.locx,base.locy, b.locx, b.locy);

	return ret;
}


baseSort = function(b1,b2){
	return baseDistanceFromUnits(b1) -  baseDistanceFromUnits(b2);
}



orderAttack = function(unit,enemy){
	return {"unitID": unit, "move": "", "dash":"", "attack":enemy, "farm": false};
}

orderFarm = function(unit){
	return 	{"unitID": unit, "move":"", "dash":"", "attack": "", "farm": true};
}

orderMove = function(unit,dir){

	return {"unitID": unit, "move":dir, "dash": dir, "attack": "", "farm": false};
}


//Expand Logic
Expand = function(unit){
		var openBase = Bases.open[0];
		dir = getDir(unit.locx,unit.locy,openBase.locx,openBase.locy);
		orders.push(orderMove(unit.id,dir));
}



//Attack Logic



//Farm Logic


dataResponse = function () {


	//Clear orders
	orders = [];
	unitsFarming = 0;




	//Go through units and give them an order
	for (var i = 0; i < Units.mine.length; i++) {
		var unit = Units.mine[i];

		mark = enemyInRange(unit,Units.enemies);
		//Always defend yourself don't be stupid
		if(mark > 0){
			orders.push(orderAttack(unit.id,mark));
		}else{

			factor = 2*Bases.mine.length;
			/*TODO: Fix jitter problem, cuased by units wanting to go to diffrent base even though only unit in base
			* need to have more complex farmer determination code. Something like check if each base has at least one
			* unit farming.
			* */
			//If Base requires famer send
			if(unitsFarming < factor) {
				var inBase = unitInMyBases(unit);
				if(inBase != false && (Bases.unitsInBaseFarming[inBase.id] < 4 || Units.mine.length <= factor)){
					orders.push(orderFarm(unit.id));
					unitsFarming++;
					Bases.unitsInBaseFarming[inBase.id]++;
				}else{
					if(Bases.open.length != 0) {
						Expand(unit);
					}
					else
					{
						closestBase = findClosestBase(unit);
						dir = getDir(unit.locx, unit.locy, closestBase.locx, closestBase.locy);
						orders.push(orderMove(unit.id, dir));
					}
				}

			}
			//Expand
			else {

				//TODO: Have a better attack stratgey then chase aimlessly, enemy sort sucks
				if(Bases.open.length == 0){
					var enemy = Units.enemies[0];
					dir = getDir(unit.locx,unit.locy,enemy.locx,enemy.locy);
					orders.push(orderMove(unit.id,dir));
				}
				else{
					Expand(unit);
				}


			}
		}
	};
	//post message back to AI Manager	
	postMessage( { "Orders" : orders } );
}