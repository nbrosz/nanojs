//canvas id, width, height, game class, texture atlas image, texture atlas, framerate, game scale, anti-alias?, locked?
var Njs=function(id,canvasWidth,canvasHeight,textureUrls,textureAtlases,framerate,gameScale,antiAliased,controlLocked){ //_ implies important hidden members
		var N=this,
		__=undefined,//shorthand
		gameScene,//current game scene (prototype)
		_gameObjectList,//game object list
		_gameObjectPool,//game object pool
		_nextClassId = 0,
		_getClassPool,//get class id
		_sceneList=[],//game states list
		canvas=document.getElementById(id),//canvas
		canvasContext=canvas.getContext("2d"),//context
		doc=document,
		_atlasImages=[],//atlas image array
		_controlLocked=controlLocked==__||controlLocked,//user is locked to control game
		_loadedImages=0,//number of loaded images
		smoothingPostfix="mageSmoothingEnabled",//postfix for smoothing property
		//private functions
		addEventListener=function(target,event,handler){ //add event listener shorthand
			target.addEventListener(event,handler);
		},
		runNextFrame=(framerate>0&&requestAnimationFrame)||function(c){setTimeout(c,1e3/Math.abs(framerate));},//use requestAnimationFrame with fallback
		callbackTargetCanvas=function(e){ //check if callback target is the canvas
			return e.target==canvas;
		},
		mouseEventHandler=function(e){//shared mouse event handler
			if(callbackTargetCanvas(e)){
				var b=e.buttons,m=N.mouseState;
				//update mouse button states
				m.l=b&1;//left
				m.m=b&4;//middle
				m.r=b&2;//right
			}
		},
		_ready=function(){
			if(!gameScene) return;
			//restore engine to defaults
			N.canvasWidth=canvasWidth;//canvas width
			N.canvasHeight=canvasHeight;//canvas height
			N.scaledCanvasWidth=canvas.width=canvasWidth*gameScale;//scaled canvas width
			N.scaledCanvasHeight=canvas.height=canvasHeight*gameScale;//scaled canvas height
			N.gameScale=gameScale;//game scale
			N.textureAtlases=textureAtlases;//texture atlas
			canvasContext["msI"+smoothingPostfix]=canvasContext["mozI"+smoothingPostfix]=canvasContext["i"+smoothingPostfix]=!!antiAliased;//set anti-aliasing
			N.canvasColor=0xfff;//canvas (background) color
			_gameObjectList=[];//game object list
			_gameObjectPool={};//game object pool
			N._currentTime=new Date();//current time
			N.running=1;//game is running
			//begin game
			gameScene=new gameScene(N);//instantiate game scene
			if(gameScene.load)gameScene.load();//call game load
			_gameLoop();//begin game loop
		},
		_gameLoop=function(){//game loop function
			var latestTime=new Date(),//get new time
			dt=(latestTime-N._currentTime)/1e3;//calculate deltatime (s)
			if(gameScene.update)gameScene.update(dt);//call game update
			_update(dt);//call game object update functions
			_draw(dt);//call game object draw functions
			_updateInput();//update key states
			N._currentTime=latestTime;//old time becomes new time
			if(N.running)
				runNextFrame(_gameLoop);//loop as long as game is still running
		},
		//draw texture: x, y, atlas index, texture index, options
		//options: sc - scale, al - alpha, ng - rotation angle, ox - offset x, oy - offset y, fx - flip x, fy - flip y, ow - overall width, oh - overall height
		_drawTexture=function(x,y,ai,ti,o){
			canvasContext.save();//preserve default scale/translation values
			// set up optional parameter defaults
			o=o||{};
			o.sc=o.sc||1;
			o.al=o.al||1;
			o.ng=o.ng||0;
			o.ox=o.ox||0;
			o.oy=o.oy||0;
			o.fx=o.fx||0;
			o.fy=o.fy||0;

			// use floored x/y position
			x=~~x;
			y=~~y;
			var a=textureAtlases[ai],//current atlas row
			xi=ti%a[3],//x-index for the texture's current frame
			yi=~~(ti/a[3]),//y-index (floored) for the texture's current frame
			sp=a[6]||0,//texture padding (0 if undefined)
			xo=xi*(a[4]+sp),//x-offset for the texture's current frame (including padding)
			yo=yi*(a[5]+sp),//y-offset for the texture's current frame (including padding)
			tw=a[4]*o.sc,//texture width
			th=a[5]*o.sc,//texture height
			ow=o.ow||tw,//overall width
			oh=o.oh||th,//overall height

			//rotation
			d2r=Math.PI/180,//degrees to radians
			ra=o.ng*d2r,//texture rotation angle to radians
			aco=Math.cos(-ra),//cos of angle to compensate for canvas x rotation
			asi=Math.sin(-ra),//sin of angle to compensate for canvas y rotation
			tx=x*aco-y*asi-ow*o.ox,//formula to compensate for canvas x rotation
			ty=y*aco+x*asi-oh*o.oy;//formula to compensate for canvas y rotation
			canvasContext.rotate(ra);

			//flipping
			//translate and scale during flipping so texture ends up in the same spot
			tx=o.fx?N.scaledCanvasWidth-tx-tw:tx;
			ty=o.fy?N.scaledCanvasHeight-ty-th:ty;
			canvasContext.translate(o.fx?N.scaledCanvasWidth*gameScale:0,o.fy?N.scaledCanvasHeight*gameScale:0);
			canvasContext.scale(o.fx?-gameScale:gameScale,o.fy?-gameScale:gameScale);

			canvasContext.globalAlpha=o.al;//set alpha for texture
			canvasContext.drawImage(_atlasImages[a[0]],a[1]+xo,a[2]+yo,a[4],a[5],tx,ty,tw,th);//draw texture
			canvasContext.restore();//restore saved scale/translation values
		},
		_update=function(dt){
			for(var goi in _gameObjectList){
				var go = _gameObjectList[goi];
				if (go.update&&go.active())//if gameobject has update method and is active, call update
					go.update(dt);// call update function on current game object: pass in deltatime
			}
		},
		_draw=function(dt){//call draw functions: deltatime
			canvasContext.fillStyle=N.canvasColor;
			canvasContext.fillRect(0,0,N.scaledCanvasWidth,N.scaledCanvasHeight); // clear
			for(var goi in _gameObjectList){
				var go = _gameObjectList[goi];
				if (go.draw&&go.active())//if gameobject has draw method and is active, call draw
					go.draw(dt,_drawTexture);// call draw function on current game object: pass in deltatime/drawing function
			}
		},
		_updateInput=function(){//update input states (reduce from pressed to held and from released to not pressed)
			var i,o=N.keyStates;
			for(i in o){
				if(o[i])
					o[i]=1; //set key state to held
				else 
					delete o[i]; //set key state to not pressed
			}
		},
		//Private Classes
		//Gameobject (common base class): x, y, options
		//options: f=current frame, ox=origin offset x, oy=origin offset y, fx=x-flip, fy=y-flip, a=start activated
		_Gameobject=function(x,y,o){
			var I=this,_a;
			I.init=function(x,y,o) {
				o=o||{};
				I.x=x;//x position
				I.y=y;//y position
				I.ox=o.ox||0;//offset x
				I.oy=o.oy||0;//offset y
				I.fx=!!o.fx;//flip x?
				I.fy=!!o.fy;//flip y?
				I.ng=o.ng||0;//rotation angle
				I.sc=o.sc||1;//scale
				I.al=isNaN(o.al)?1:o.al;//sprite alpha
				I.active(o.a!=__?o.a:1);//gameobject is active?
				return o;//return options object for reuse
			};
			I.size=function(textureId){//get gameobject size
				var currentAtlas=N.textureAtlases[textureId];//texture atlas for the current gameobject
				//sc=N.GS*I.sc;
				return [currentAtlas[4],currentAtlas[5]];//return width,height of current sprite, scaled
			};
			I.active=function(a){//guard gameobject's active status
				if(a!=__)_a=!!a;//assign if provided
				return _a;
			}
			_gameObjectList.push(I);
		};

		//load images
		for(var i in textureUrls) {
			var img=new Image();
			_atlasImages.push(img);
			img.src=textureUrls[i];//set atlas image src
			img.onload=function(){//once atlas image is loaded, assign it to engine
				//N._ai=ta&&_ai;//if there is no atlas data, don't complete image load
				_loadedImages++;
				if(_loadedImages==textureUrls.length){
					_ready();//begin the game once the atlas is loaded
				}
			};
		}

		//game scenes
		N.addScene=function(scene){ //add game scenes and return scene's index
			return _sceneList.push(scene)-1;
		} 
		N.runScene=function(sceneId){ //instantiate game scene and signal readiness if engine is already loaded
			gameScene=_sceneList[sceneId];
			if(_loadedImages)
				_ready();
		};

		//object pool
		_getClassPool=function(clss){//get class index (and make sure it's valid)
			var classId = clss.prototype.classId || (clss.prototype.classId = _nextClassId++), // get or add id to class prototype
			classPools = _gameObjectPool || (_gameObjectPool = {});//create object to match classes to an ID if none exists
			return classPools[classId] || (classPools[classId] = []); // create array of class objects if none exists
		};
		N.objectGet=function(classPrototype,constructorParameters){//Object Get: c - class to get, pa - parameter array
			//var classId=,//get class index
			var arr=_getClassPool(classPrototype),//get array of objects for the class id (automatically created with _GetClassId())
			//if(!a)a=p[i]=[];//if no array of that class type exists, create and return one
			returnObject=arr.pop()||new classPrototype();//get next object or new object if none exists
			returnObject.init.apply(returnObject,constructorParameters);//call init function passing in parameter array
			returnObject._classId=classPrototype.prototype.classId;//assign the class's id to the object so it can be returned without hassle
			return returnObject;//finally return the object
		};
		N.objectPut=function(obj){//Object Put: o - object to put
			obj.active(0);//deactivate object
			_gameObjectPool[obj._classId].push(obj);//put object back for reuse
		};

		//input
		N.keyStates={};//object holding key states (2 - pressed, 1 - held, 0 - released, undefined - not held)
		N.mouseState={x:0,y:0};//object holding mouse state
		addEventListener(doc,"keydown",function(e){
			if(!_controlLocked)return;//only control if canvas is selected
			var k=e.keyCode;
			if(k==32||k>36&&k<41)e.preventDefault();//prevents space/arrow key behavior
			N.keyStates[k]=N.keyStates[k]?1:2;//set key state to "down" if just pressed or "held" if not
		});
		addEventListener(doc,"keyup",function(e){
			N.keyStates[e.keyCode]=0;//set key state to "up"
		});
		addEventListener(doc,"click",function(e){
			_controlLocked=callbackTargetCanvas(e);//lock when clicked
		});
		//update mouse button states for up and down
		addEventListener(canvas,"mousedown",mouseEventHandler);
		addEventListener(canvas,"mouseup",mouseEventHandler);
		addEventListener(canvas,"mousemove",function(e){
			if(callbackTargetCanvas(e)){//get mouse x and y
				N.mouseState.x=e.offsetX;
				N.mouseState.y=e.offsetY;
			}
		});
		addEventListener(canvas,"contextmenu",function(e){
			if(callbackTargetCanvas(e))
				e.preventDefault();//prevent right-click context menu on canvas
		});
		N.getAnyKey=function(s){for(var ki in N.keyStates){if(N.keyStates[ki]==s)return ki;}return 0;}// return any key with the desired state

		//Public Classes
		//sprite: x, y, spritesheet, current animation (texture atlas index), options
		//options: f=current frame, ox=origin offset x, oy=origin offset y, fx=x-flip, fy=y-flip
		N.Sprite=function Sprite(x,y,s,ti,o){
			var I=this,oi,os,_ft;
			_Gameobject.call(I,x,y,o);//inherit from GameObject
			oi=I.init;//preserve reference to old init function
			os=I.size;//preserve reference to old size function
			I.init=function(x,y,s,ti,o) {
				o=oi(x,y,o);//call parent initializer
				I.ti=ti;
				I.Spritesheet=s||[[0,0,[0]]];//animation spritesheet (atlas index, framerate, frames)
				_ft=0;
				I.playAnimation(ti,o.f);//set up animation
				return o;//invite overloading
			};
			I.draw=function(dt, df){//draw: deltatime, draw function
				var ss=I.Spritesheet[I.ti];//spritesheet for current animation
				df(I.x,I.y,ss[0],ss[2][I.f],
					{sc:I.sc,al:I.al,ng:I.ng,ox:I.ox,oy:I.oy,fx:I.fx,fy:I.fy});
			};
			I.update=function(dt){//update: deltatime
				//progress sprite animations
				var fl,nf,
				ss=I.Spritesheet[I.ti];//current spritesheet
				if(_ft>=0&&ss[1]){//as long as the animation isn't paused and has a valid length
					_ft+=dt;//add deltatime to frame timer
					fl=1/ss[1];//the expected total frame length (how many ms should pass before next frame)
					if(_ft>fl){//if frame timer has advanced enough to move to the next frame...
						nf=(I.f+1)%ss[2].length;//get index of the next frame for the current animation
						if(ss[2][nf]<0) {//if the next frame is a pause frame
							_ft=-1;//pause the animation on the current frame
						}else{
							I.f=nf;//otherwise loop the animation
							_ft=_ft%fl;//get frame timer remainder (rather setting to 0) for more accurate timing
						}
					}
				}
			};
			I.playAnimation=function(ti,f,r){//Play anim: set current anim/frame, r=force reset frame timer
				I.f=isNaN(f)?I.f||0:f;// f||I.f||0;
				if(ti!=I.ti||r){_ft=0;I.f=f||0;}//reset timer if animation has changed or the reset is forced
				I.ti=ti;
			};
			I.toggleAnimation=function(){_ft=_ft<0?0:-1;};//Toggle Animation: switches between playing and stopped
			I.size=function(){//get sprite size
				return os(I.Spritesheet[I.ti][0]);
			};
			I.init(x,y,s,ti,o);//initialize
		};
		//tile map: x, y, tile atlas, tile data, options
		//options: mw - max line width (in characters), c - cipher string, al - alpha, sc - scale
		N.Map=function (x,y,tileAtlas,data,o){
			var I=this,oi,os,cphr,tileData,tileLookup,
			getDataIndex=function(x, y, coarse){
				var size = I.size(), tileSz = I.tileSize(), flr = Math.floor;
				if(!coarse){ // convert fine coordinates to coarse
					if(x<I.x||x>I.x+size[0]||y<I.y||y>I.y+size[1])
						return __; // out of bounds

					x = flr((x - I.x) / tileSz[0]);
					y = flr((y - I.y) / tileSz[1]);
				}
				return y * I.mw + x; // return index to 1d data array
			};
			_Gameobject.call(I,x,y,o);//inherit from GameObject
			oi=I.init;//preserve reference to old init function
			os=I.size;//preserve reference to old size function
			I.init=function(x,y,tileAtlas,data,o) {
				o=oi(x,y,o);//call parent initializer
				var i, j;
				tileLookup=[];
				// fill tileLookup with mappings to correct texture atlas index and tile data for each tile
				if (tileAtlas != __) {
					for(i = 0; i < tileAtlas.length; i++) {
						for(j = 0; j < tileAtlas[i][1]; j++) {
							tileLookup.push([tileAtlas[i][0], tileAtlas[i][2]]);
						}
					}
				}
				I.mw=o.mw||0;//max line width (in characters)

				if(o.c){
					cphr={"\n":-1};//initialize cipher object with line break
					for(var i=0;i<o.c.length;i++){
						cphr[o.c.charAt(i)]=i;//create mapping from character to index
					}
				}

				I.set(data);
				return o;//invie overloading
			};
			I.draw=function(dt, df){//draw: deltatime, draw function
				if (tileLookup&&tileData) {
					var i,x=0,y=0,dataTile,
					atlasRow=N.textureAtlases[tileLookup[0][0]],//get first tile atlas texture row
					//shorthand
					t=tileData,
					w=I.mw,
					odm=I.size();//get overall dimensions

					for(i=0;i<t.length;i++){
						dataTile=t[i];
						if(dataTile<0||(w&&x>=w)){//if new line or max width is reached, do a line break
							x=0;
							y++;
							if (dataTile<0) continue; // don't draw tile for new line break
						}
						//draw character
						df(I.x+x*atlasRow[4]*I.sc,I.y+y*atlasRow[5]*I.sc, //multiply indexes by offset amount
							tileLookup[dataTile][0],dataTile,
							{al:I.al,sc:I.sc,ox:I.ox,oy:I.oy,ow:odm[0],oh:odm[1]});
						x++; // increment after draw
					}
				}
			};
			I.size=function(){//get sprite size
				if (!tileData) return 0;
				var tileSz=I.tileSize(),//get size of tiles (from first tile/texture atlas entry)
				w=tileSz[0],h=tileSz[1],//shorthand into width and height
				ln=tileData.length;//text length shorthand
				//return tile size multiplied by the width/height in tiles of the text element
				return [(I.mw?w*Math.min(ln,I.mw):w*ln)*I.sc,
					(I.mw?h*Math.ceil(ln/I.mw):h)*I.sc];
			};
			I.tileSize=function(){
				return os(tileLookup[0][0]);
			};
			I.set=function(data){
				if (!data) return;

				if(!Array.isArray(data)){//assume that if data isn't an array, it must be a valid string
					tileData=[];//convert the string to an array using the cipher
					for(i=0;i<data.length;i++){
						tileData.push(cphr[data.charAt(i)]);//get number for character from cipher and push to array
					}
				} else {
					tileData = data.slice();
				}
			}
			I.peek=function(x, y, coarse){
				// return tile at x/y coordinates
				return tileData[getDataIndex(x, y, coarse)];
			}
			I.poke=function(x, y, value, coarse) {
				// set tile at x/y coordinates
				tileData[getDataIndex(x, y, coarse)] = isNaN(value) ? cphr[value.charAt(0)] : value;
			}
			I.init(x,y,tileAtlas,data,o);//initialize
		};
	};