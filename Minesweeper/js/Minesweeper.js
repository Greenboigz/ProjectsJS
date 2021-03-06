/* 
Description:
This project was the first really project I worked on in JavaScript. I didn't have a strong understanding
of the language going into the project and I learned a lot about using JavaScript and how powerful the 
language can be. I made this project without using a lot of the fantastic class syntaxes in ES6 because I 
made the project before I learned about ES6.

TODO: (1) Custom Levels
	  (2) Add multiplayer
	    (a) Multiple players join one board.
		(b) Each player has his/her own color.
		(c) The goal is to flag as many mine as possible.
		(d) If you uncover a mine, you automatically lose.
		(e) Incorrectly flagged mines will result in -1 point.
		(f) Correctly flagged mines will result in +1 point.
		(g) Once you flag a tile, no one else can change it's state.
	  (3) Add settings
	    (a) 
*/
var EASY = 0, MEDIUM = 1, HARD = 2, EXPERT = 3;

/* Tile */
var TILE = 16,
	DIM = 26,
	BAR = 1,
	RATIO = 0.05,
	MS_PER_S = 1000;
	
var BORDER_THICKNESS = 12;

var NUMBER_WIDTH = 13,
	NUMBER_HEIGHT = 23;

/* Scoreboard values */
var TILES_PER_SCORE_BOARD = 2;
var SCORE_BOARD_HEIGHT = TILES_PER_SCORE_BOARD*TILE;
var NUM_OFFSET = 4;

/* Face Values */
var FACE_DIM = 26,
	FACE_OFFSET = Math.floor((SCORE_BOARD_HEIGHT - FACE_DIM)/2);
	
/* Tile Values */
var EMPTY = 0, 
	BOMB = -1;
	
/* Tile Visibilities */
var COVERED = 0,
	FLAGGED = 1,
	UNKNOWN = 2,
	VISIBLE = 3;
	
/* Win States */
var WIN = 1,
	LOSS = -1;
	
/* Surrounding Tile values to add */
var SUR_TILES = [[-1,-1],[0,-1],[1,-1],
				 [-1,0],		[1,0],
				 [-1,1], [0,1],	[1,1]];

/* Tile Images */
var TILE_IMAGES = ["empty_tile", "1_tile", "2_tile", "3_tile",
				   "4_tile", "5_tile", "6_tile", "7_tile", 
				   "8_tile",  "mine_tile", "flag_tile", 
				   "cover_tile", "tripped_mine_tile",
				   "incorrect_flag_tile", "unknown_tile"];
				   
/* Border Images */
var BORDER_IMAGES = ["hor_border", "ver_border", "upper_left_corner",
					 "upper_right_corner", "bottom_right_corner",
					 "bottom_left_corner", "left_T_corner", 
					 "right_T_corner"];
					 
/* Face Images */
var FACE_IMAGES = ["cool_face", "pressed_cool_face", 
				   "dead_face", "pressed_dead_face", "scared_face", 
				   "happy_face", "pressed_happy_face"];
				
/* Stores all the image data */				
var IMAGES = [];
					 
/**
 * Game objects
 */
var canvas,	  /* HTMLCanvas */
	ctx,	  /* CanvasRenderingContext2d */
	frames,   /* number, used for animation */
	time,
	face_pressed,
	board_pressed,
	
/**
 * Timer datastructor, used for keeping track of the game's 
 * time for highscores.
 * 
 * @type {Object}
 */
timer = {
	_start_time: null, /* Starting time */
	_end_time: null, /* Ending time */
	_timer: null, /* Timer is on */
	
	/**
	 * Initiate the timer.
	 */
	init: function() {
		this._start_time = 0;
		this._end_time = 0;
		this._timer = false;
	},
	
	/**
	 * Resets the timer.
	 */
	reset: function() {
		this._start_time = 0;
		this._end_time = 0;
		this._timer = false;
	},
	
	/**
	 * Starts the timer.
	 */
	start: function() {
		if (!this._timer) {
			this._timer = true;
			this._start_time = Date.now();
		}
	},
	
	/**
	 * Stops the timer.
	 */
	stop: function() {
		if (this._timer) {
			this._timer = false;
			this._end_time = Date.now();
		}
	},
	
	/**
	 * Gets the time read on the timer.
	 */
	get_time: function() {
		if (this._timer) {
			return (Date.now() - this._start_time) / MS_PER_S;
		} else {
			return (this._end_time - this._start_time) / MS_PER_S;
		}
	}
}
	
/**
 * Grid datastructor, useful in games where the game world is
 * confined in absolute sized chunks of data or information.
 * 
 * @type {Object}
 */
grid = {
    ratio: null,
    height: null, /* number, the number of columns */
	width: null, /* number, the number of rows */
	flag_count: null, /* number, the number of flags */
	_mines_set: null,
	_visible_count: null, /* number, the number of visible tiles */
	_MAX_VISIBLE_COUNT: null, /* number, the maximum number of visible tiles */
	_value_grid: null,  /* Array<Array<number>>, data representation */
	_visible_grid: null, /* Array<Array<number>>, data representation */
	_win_state: null,
	_tripped_mine_tile: null,
  
	/**
	 * Initiate and fill a grid with the 
	 * @param  {float}    ratio     The percentage of mine tiles
	 * @param  {number}   width     number of columns
	 * @param  {number}   height    number of rows
	 */
	init: function(ratio, width, height) {
		this.width = width;
		this.height = height;
		this.ratio = ratio;
		this.flag_count = Math.floor((width*height)*ratio);
		this._visible_count = 0;
		this._MAX_VISIBLE_COUNT = width*height - this.flag_count;
		this._value_grid = [];
		this._visible_grid = [];
		this._win_state = 0;
		this._tripped_mine_tile = [-1,-1];
		this._mines_set = false;
				
		// Builds empty boards
		for (var x=0; x < width; x++) {
			this._value_grid.push([]);
			this._visible_grid.push([]);
			for (var y=0; y < height; y++) {
				this._value_grid[x].push(EMPTY);
				this._visible_grid[x].push(COVERED);
			}
		}
	},
	
	/**
	 * Builds the board around the initial point (init_x, init_y).
	 */
	build_board: function(init_x, init_y) {
		timer.start();
	
		// Sets all the bombs
        for (var i=0; i < this.flag_count; i++) {
            var x = Math.floor(Math.random()*this.width), 
				y = Math.floor(Math.random()*this.height);
            while (this.get(x,y) == BOMB || this.is_n_away(1,init_x, init_y, x, y)) {
                x = Math.floor(Math.random()*this.width); 
                y = Math.floor(Math.random()*this.height);
            }
            this.set(BOMB, x, y);
        }
        
        // Sets all the bomb counts
        for (var x=0; x < this.width; x++) {
			for (var y=0; y < this.height; y++) {
				this.set_bomb_count(x,y);
			}
		}
		
		this._mines_set = true;
		console.log("The board has been built");
	},
	
	/**
	 * Checks if the two points are within n distance of eachother.
	 */
	is_n_away: function(n, x1, y1, x2, y2) {
		return (Math.abs(x2 - x1) <= n && Math.abs(y2 - y1) <= n);
	},
	
	/**
	 * Resets the board
	 */
	reset: function() {
		this.init(this.ratio, this.width, this.height);
		this._mines_set = false;
	},
    
	/**
	 * Sets the number of bombs surrounding a single tile
	 *
	 * @param {number} x    the x-coordinate
	 * @param {number} y    the y-coordinate
	 */
	set_bomb_count: function(x, y) {
		if (this.get(x,y) != BOMB) {
			var val = this.get_bomb_count(x,y);
			this.set(val,x,y);
		}
	},
	
	/**
	 * Gets the number of bombs surrounding a single tile
	 *
	 * @param {number} x    the x-coordinate
	 * @param {number} y    the y-coordinate
	 */
	get_bomb_count: function(x, y) {
		var count = 0;
		for (var i = 0; i<SUR_TILES.length; i++) {
			count += (this.get(x+SUR_TILES[i][0],y+SUR_TILES[i][1]) == BOMB);
		}
		return count;
	},
	
	/**
	 * Gets the number of flags surrounding a single tile
	 *
	 * @param {number} x    the x-coordinate
	 * @param {number} y    the y-coordinate
	 */
	get_flag_count: function(x, y) {
		var count = 0;
		for (var i = 0; i<SUR_TILES.length; i++) {
			count += (this.get_visibility(x+SUR_TILES[i][0],y+SUR_TILES[i][1]) == FLAGGED);
		}
		return count;
	},
  
	/**
	 * Set the value of the grid cell at (x, y)
	 * 
	 * @param {any}    val what to set
	 * @param {number} x   the x-coordinate
	 * @param {number} y   the y-coordinate
	 */
	set: function(val, x, y) {
		if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
		    this._value_grid[x][y] = val;
        }
	},
  
	/**
	 * Get the value of the cell at (x, y)
	 * 
	 * @param  {number} x the x-coordinate
	 * @param  {number} y the y-coordinate
	 * @return {any}   the value at the cell
	 */
	get: function(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
		    return this._value_grid[x][y];
        } else {
            return EMPTY;
        }
	},
	
	/**
	 * Set the visibility of the grid cell at (x, y)
	 * 
	 * @param {any}    val what to set
	 * @param {number} x   the x-coordinate
	 * @param {number} y   the y-coordinate
	 */
	set_visibility: function(val, x, y) {
		if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
		    this._visible_grid[x][y] = val;
        }
	},
  
	/**
	 * Get the visibility of the cell at (x, y)
	 * 
	 * @param  {number} x the x-coordinate
	 * @param  {number} y the y-coordinate
	 * @return {any}   the visibility at the cell
	 */
	get_visibility: function(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
		    return this._visible_grid[x][y];
        } else {
            return null;
        }
	},
	
	/**
	 * Flags the tile at the given coordinate (x,y)
	 * @param  {number} x the x-coordinate
	 * @param  {number} y the y-coordinate
	 */
	flag: function(x,y) {
		if (this._mines_set) {
			if (this.get_visibility(x,y) == COVERED) {
				this.set_visibility(FLAGGED,x,y);
				this.flag_count--;
			} else if (this.get_visibility(x,y) == FLAGGED) {
				this.set_visibility(UNKNOWN,x,y);
				this.flag_count++;
			} else if (this.get_visibility(x,y) == UNKNOWN) {
				this.set_visibility(COVERED,x,y);
			}
		}
	},
	
	/**
	 * Reveals the value hidden in a covered tile
	 * @param  {number} x the x-coordinate
	 * @param  {number} y the y-coordinate
	 */
	sweep: function(x, y) {
		if (!this._mines_set) {
			this.build_board(x, y);
		}
		if (this.get_visibility(x,y) == COVERED || 
			this.get_visibility(x,y) == UNKNOWN) {
			this.set_visibility(VISIBLE,x,y);
			this._visible_count++;
			if (this.get(x, y) == BOMB) {
				this.lose(x, y);
			} else if (this.get(x, y) == EMPTY) {
				for (var i = 0; i<SUR_TILES.length; i++) {
					this.sweep(x+SUR_TILES[i][0],y+SUR_TILES[i][1]);
				}
			}
		} else if (this.get_visibility(x, y) == VISIBLE && 
				   this.get(x, y) != EMPTY &&
				   this.get(x, y) == this.get_flag_count(x, y)) {
			for (var i = 0; i<SUR_TILES.length; i++) {
				var xx = x+SUR_TILES[i][0], yy = y+SUR_TILES[i][1];
				if (this.get_visibility(xx,yy) == COVERED || 
					this.get_visibility(xx,yy) == UNKNOWN) {
					this.sweep(xx, yy);
				}
			}
		}
		if (this._visible_count == this._MAX_VISIBLE_COUNT) {
			this.win()
		}
	},
	
	/**
	 * Reveals the whole board because a loss has occured
	 */
	lose: function(x, y) {
		if (this._win_state != LOSS) {
			timer.stop();
			this._tripped_mine_tile = [x,y];
			
			for (var i = 0; i < this.width; i++) {
				for (var j = 0; j < this.height; j++) {
					if (this.get(i,j) == BOMB && (this.get_visibility(i,j) == COVERED || 
						this.get_visibility(i,j) == UNKNOWN)) {
						this.set_visibility(VISIBLE,i,j);
					}
				}
			}
			this._win_state = LOSS;
		}
	},
	
	/**
	 * Checks is the game is a loss
	 * @return {boolean} Is the board a loss
	 */
	is_loss: function() {
		return this._win_state == LOSS;
	},
	
	/**
	 * Flags all mines because a win has occured
	 */
	win: function() {
		if (this._win_state != WIN) {
			timer.stop();
			for (var i = 0; i < this.width; i++) {
				for (var j = 0; j < this.height; j++) {
					if (this.get(i,j) == BOMB && this.get_visibility(i,j) != FLAGGED) {
						this.set_visibility(FLAGGED,i,j);
						this.flag_count--;
					}
				}
			}
			this._win_state = WIN;
		}
	},
	
	/**
	 * Checks is the game is a win
	 * @return {boolean} Is the board a win
	 */
	is_win: function() {
		return this._win_state == WIN;
	},
	
	/**
	 * Get the image file of the cell at (x, y)
	 *
	 * @param  {number} x the x-coordinate
	 * @param  {number} y the y-coordinate
	 * @return {image}   the image file at the cell
	 */ 
	get_image: function(x, y) {
		var img;
		if (!this._mines_set) {
			img = IMAGES[11];
		} else {
			switch (this.get_visibility(x,y)) {
				case COVERED:
					img = IMAGES[11];
					break;
				case FLAGGED:
					if (this.is_loss() && this.get(x,y) != BOMB) {
						img = IMAGES[13];
					} else {
						img = IMAGES[10];
					}
					break;
				case UNKNOWN:
					img = IMAGES[14];
					break;
				default:
					switch (this.get(x,y)) {
						case BOMB:
							if (x == this._tripped_mine_tile[0] &&
								y == this._tripped_mine_tile[1]) {
								img = IMAGES[12];
							} else {
								img = IMAGES[9];
							}
							break;
						default:
							img = IMAGES[this.get(x,y)]
							break;
					}
					break;
			}
		}
		return img;
	},
	
	/**
	 * Gets the string representation of the grid
	 */
	print: function() {
		var str = "";
		for (var y=0; y<this.width; y++) {
			for (var x=0; x<this.height; x++) {
				str += this.get(x,y);
				if (x != this.width-1) {
					str += ",";
				} else {
					console.log(str);
					str = "";
				}
			}
		}
	}
}

/**
 * Starts the game
 */
function loadCanvas(id, level) {
	// create and initiate the canvas element
	canvas = document.createElement("canvas");
	div = document.getElementById(id);
	
	ctx = canvas.getContext("2d");
	// add the canvas element to the body of the document
	document.body.appendChild(canvas);
	// sets an base font for bigger score display
	ctx.font = "15px Helvetica";
	
	canvas.oncontextmenu = function (e) {
		e.preventDefault();
	};
	
	// intatiate game objects and starts the game loop
	init(level);
	draw();
	if (div.childNodes[0]) {
		div.removeChild(div.childNodes[0]);
	}
	div.appendChild(canvas);
	
	loop();
}

/**
 * Resets and inits game objects
 */
function init(level) {
	var ratio = 0.15, width = 9, height = 9;
	switch (level) {
		case EASY:
			width = 9;
			height = 9;
			break;
		case MEDIUM:
			width = 16;
			height = 16;
			break;
		case HARD:
			width = 25;
			height = 25;
			break;
		case EXPERT:
			width = 40;
			height = 25;
			break;
	}
	grid.init(ratio, width, height);
	canvas.width = width*TILE + 2*BORDER_THICKNESS;
	canvas.height = height*TILE + 3*BORDER_THICKNESS + SCORE_BOARD_HEIGHT;
	
	timer.init();
	load_images();
	face_pressed = false;
	
	document.body.addEventListener("mousedown", canvasTouch);
	document.body.addEventListener("mouseup", canvasRelease);
}

/**
 * The game loop function, used for game updates and rendering
 */
function loop() {
	draw();
	// When ready to redraw the canvas call the loop function
	// first. Runs about 60 frames a second
	window.requestAnimationFrame(loop, canvas);
}
	
/**
 * Loads all the images
 */
function load_images() {
	IMAGES = [];
	
	// Tile Images
	for (var i=0; i<TILE_IMAGES.length; i++) {
		IMAGES.push(document.getElementById(TILE_IMAGES[i]));
	}
	
	/* Border Images */
	for (var i=0; i<BORDER_IMAGES.length; i++) {
		IMAGES.push(document.getElementById(BORDER_IMAGES[i]));
	}
	
	/* Number Images */
	for (var i=0; i<10; i++) {
		IMAGES.push(document.getElementById(i));
	}
	
	/* Face Images */
	for (var i=0; i<FACE_IMAGES.length; i++) {
		IMAGES.push(document.getElementById(FACE_IMAGES[i]));
	}
}

/**
 * Handles Click events on the minesweeper canvas
 */
function canvasTouch(event) {
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    
	if (event.button == 0 || event.button == 1) {
		if (isOnFace(x,y)) {				
			face_pressed = true;
		} else if (isOnBoard(x,y)) {
			board_pressed = true;
		}
	}
	
	draw();
}

/**
 * Checks if (x,y) coordinates are on the face/reset button.
 */
function isOnFace(x, y) {
	var x_offset = (2*BORDER_THICKNESS+grid.width*TILE-FACE_DIM)/2;
	var y_offset = (BORDER_THICKNESS+FACE_OFFSET);
	return (x>=x_offset && x<x_offset+FACE_DIM && y>=y_offset && y<y_offset+FACE_DIM);
}

/**
 * Handles Click events on the minesweeper canvas
 */
function canvasRelease(event) {
    var rect = canvas.getBoundingClientRect();
	var x_offset = BORDER_THICKNESS;
	var y_offset = 2*BORDER_THICKNESS + SCORE_BOARD_HEIGHT;
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;

	if (event.button == 0 || event.button == 1) {
		if (isOnBoard(x,y) && !grid.is_loss() && !grid.is_win()) {				
			grid.sweep(Math.floor((x-x_offset)/TILE), Math.floor((y-y_offset)/TILE));
		} else if (face_pressed && isOnFace(x,y)) {
			grid.reset();
			timer.reset();
		}
	} else if (event.button == 2) {
		if (isOnBoard(x,y) && !grid.is_loss() && !grid.is_win()) {
			grid.flag(Math.floor((x-x_offset)/TILE), Math.floor((y-y_offset)/TILE));
		}
	}
	board_pressed = false;
	face_pressed = false;
	
	draw();
}

/**
 * Checks if (x,y) coordinates are on the board.
 */
function isOnBoard(x, y) {
	var x_offset = BORDER_THICKNESS;
	var y_offset = 2*BORDER_THICKNESS + SCORE_BOARD_HEIGHT;
	return (x>=x_offset && x<x_offset+grid.width*TILE && y>=y_offset && y<y_offset+grid.height*TILE);
}

/**
 * Render entire game.
 */
function draw() {
	drawBorder();
	drawScoreBoard();
	drawBoard();
}

/**
 * Render the border to the game.
 */
function drawBorder() {
	// Horizontal Borders
	for (var x = 0; x < grid.width; x++) {
		var img = IMAGES[TILE_IMAGES.length];
		ctx.drawImage(img, BORDER_THICKNESS + x*TILE, 0, TILE, 
			BORDER_THICKNESS);
		ctx.drawImage(img, BORDER_THICKNESS + x*TILE, 
			BORDER_THICKNESS + SCORE_BOARD_HEIGHT, TILE, 
			BORDER_THICKNESS);
		ctx.drawImage(img, BORDER_THICKNESS + x*TILE, 
			2*BORDER_THICKNESS + SCORE_BOARD_HEIGHT + grid.height*TILE, 
			TILE, BORDER_THICKNESS);
	}
	
	// Upper Vertical Borders
	for (var y = 0; y < TILES_PER_SCORE_BOARD; y++) {
		var img = IMAGES[TILE_IMAGES.length+1];
		ctx.drawImage(img, 0, BORDER_THICKNESS + y*TILE,
			BORDER_THICKNESS, TILE);
		ctx.drawImage(img, BORDER_THICKNESS + grid.width*TILE, 
			BORDER_THICKNESS + y*TILE,
			BORDER_THICKNESS, TILE);
	}
	
	// Lower Vertical Borders
	for (var y = 0; y < grid.height; y++) {
		var img = IMAGES[TILE_IMAGES.length+1];
		ctx.drawImage(img, 0, 2*BORDER_THICKNESS + SCORE_BOARD_HEIGHT + y*TILE,
			BORDER_THICKNESS, TILE);
		ctx.drawImage(img, BORDER_THICKNESS + grid.width*TILE, 
			2*BORDER_THICKNESS + SCORE_BOARD_HEIGHT + y*TILE,
			BORDER_THICKNESS, TILE);
	}
	
	// Corner Borders
	var img_id = TILE_IMAGES.length+2;
	ctx.drawImage(IMAGES[img_id++], 0, 0, BORDER_THICKNESS, BORDER_THICKNESS);
	ctx.drawImage(IMAGES[img_id++], BORDER_THICKNESS + grid.width*TILE, 
		0, BORDER_THICKNESS, BORDER_THICKNESS);
	ctx.drawImage(IMAGES[img_id++], BORDER_THICKNESS + grid.width*TILE, 
		2*BORDER_THICKNESS + SCORE_BOARD_HEIGHT + grid.height*TILE, 
		BORDER_THICKNESS, BORDER_THICKNESS);
	ctx.drawImage(IMAGES[img_id++], 0, 
		2*BORDER_THICKNESS + SCORE_BOARD_HEIGHT + grid.height*TILE, 
		BORDER_THICKNESS, BORDER_THICKNESS);
	ctx.drawImage(IMAGES[img_id++], 0, BORDER_THICKNESS + SCORE_BOARD_HEIGHT, 
		BORDER_THICKNESS, BORDER_THICKNESS);
	ctx.drawImage(IMAGES[img_id++], BORDER_THICKNESS + grid.width*TILE, 
		BORDER_THICKNESS + SCORE_BOARD_HEIGHT, BORDER_THICKNESS, BORDER_THICKNESS);
}

/**
 * Render the Scoreboard.
 */
function drawScoreBoard() {
	// Count
	var img_id = TILE_IMAGES.length + BORDER_IMAGES.length;
	
	var hundreds = Math.floor((grid.flag_count%1000)/100);
	var tens = Math.floor((grid.flag_count%100)/10);
	var units = Math.floor((grid.flag_count%10)/1);
	
	ctx.drawImage(IMAGES[img_id+hundreds], BORDER_THICKNESS + NUM_OFFSET, 
		BORDER_THICKNESS + NUM_OFFSET, NUMBER_WIDTH, NUMBER_HEIGHT);
	ctx.drawImage(IMAGES[img_id+tens], BORDER_THICKNESS + NUMBER_WIDTH + NUM_OFFSET, 
		BORDER_THICKNESS + NUM_OFFSET, NUMBER_WIDTH, NUMBER_HEIGHT);
	ctx.drawImage(IMAGES[img_id+units], BORDER_THICKNESS + 2*NUMBER_WIDTH + NUM_OFFSET, 
		BORDER_THICKNESS + NUM_OFFSET, NUMBER_WIDTH, NUMBER_HEIGHT);
	
	// Time
	time = timer.get_time();
	var hundreds = Math.floor((time%1000)/100);
	var tens = Math.floor((time%100)/10);
	var units = Math.floor((time%10)/1);
	
	ctx.drawImage(IMAGES[img_id+hundreds], grid.width*TILE + BORDER_THICKNESS - 3*NUMBER_WIDTH - NUM_OFFSET, 
		BORDER_THICKNESS + NUM_OFFSET, NUMBER_WIDTH, NUMBER_HEIGHT);
	ctx.drawImage(IMAGES[img_id+tens], grid.width*TILE + BORDER_THICKNESS - 2*NUMBER_WIDTH - NUM_OFFSET, 
		BORDER_THICKNESS + NUM_OFFSET, NUMBER_WIDTH, NUMBER_HEIGHT);
	ctx.drawImage(IMAGES[img_id+units], grid.width*TILE + BORDER_THICKNESS - NUMBER_WIDTH - NUM_OFFSET, 
		BORDER_THICKNESS + NUM_OFFSET, NUMBER_WIDTH, NUMBER_HEIGHT);
		
	// Face / Reset Button
	img_id += 10;
	var x_offset = (2*BORDER_THICKNESS+grid.width*TILE-FACE_DIM)/2;
	var y_offset = (BORDER_THICKNESS+FACE_OFFSET);
	ctx.drawImage(getFaceImage(), x_offset, y_offset, FACE_DIM, FACE_DIM);
}

/**
 * Gets the image of the face.
 */
function getFaceImage() {
	var img_id = TILE_IMAGES.length + BORDER_IMAGES.length + 10;
	if (grid.is_win()) {
		if (!face_pressed) {
			return IMAGES[img_id];
		} else {
			return IMAGES[img_id+1];
		}
	} else if (grid.is_loss()) {
		if (!face_pressed) {
			return IMAGES[img_id+2];
		} else {
			return IMAGES[img_id+3];
		}
	} else if (board_pressed) {
		return IMAGES[img_id+4];
	} else {
		if (!face_pressed) {
			return IMAGES[img_id+5];
		} else {
			return IMAGES[img_id+6];
		}
	}
}

/**
 * Render the grid to the canvas.
 */
function drawBoard() {
	for (var x=0; x < grid.width; x++) {
		for (var y=0; y < grid.height; y++) {
			var img = grid.get_image(x,y);
			ctx.drawImage(img, BORDER_THICKNESS + x*TILE, 
				SCORE_BOARD_HEIGHT + 2*BORDER_THICKNESS + y*TILE, 
				TILE, TILE);
		}
	}
}

/* When the user clicks on the button, 
toggle between hiding and showing the dropdown content */
function myFunction() {
    document.getElementById("myDropdown").classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
window.onclick = function(event) {
	if (!event.target.matches('.dropbtn')) {

	var dropdowns = document.getElementsByClassName("dropdown-content");
	var i;
	for (i = 0; i < dropdowns.length; i++) {
		var openDropdown = dropdowns[i];
			if (openDropdown.classList.contains('show')) {
				openDropdown.classList.remove('show');
			}
		}
	}
}
