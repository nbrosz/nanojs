//canvas id, width, height, game class, texture atlas image, texture atlas, framerate, game scale, anti-alias?
var Njs=function(id,canvasWidth,canvasHeight,textureUrls,textureAtlases,framerate,gameScale,antiAliased){ //_ implies important hidden members
		var N=this,
		__=undefined,//shorthand
		gameScene,//current game scene (prototype)
		_gameObjectList,//game object list
		_gameObjectPool,//game object pool
		_nextClassId = 0,
		_GetClassPool,//get class id
		_sceneList=[],//game states list
		canvas=document.getElementById(id),//canvas
		canvasContext=canvas.getContext("2d"),//context
		doc=document,
		_atlasImages=[],//atlas image array
		_controlLocked=1,//user is locked to control game
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
		_Ready=function(){
			if(!gameScene) return;
			//restore engine to defaults
			N.CanvasWidth=canvasWidth;//canvas width
			N.CanvasHeight=canvasHeight;//canvas height
			N.ScaledCanvasWidth=canvas.width=canvasWidth*gameScale;//scaled canvas width
			N.ScaledCanvasHeight=canvas.height=canvasHeight*gameScale;//scaled canvas height
			N.GameScale=gameScale;//game scale
			N.TextureAtlases=textureAtlases;//texture atlas
			canvasContext["msI"+smoothingPostfix]=canvasContext["mozI"+smoothingPostfix]=canvasContext["i"+smoothingPostfix]=!!antiAliased;//set anti-aliasing
			N.canvasColor=0xfff;//canvas (background) color
			_gameObjectList=[];//game object list
			_gameObjectPool={};//game object pool
			N._currentTime=new Date();//current time
			N.Running=1;//game is running
			//begin game
			gameScene=new gameScene(N);//instantiate game scene
			if(gameScene.Load)gameScene.Load();//call game load
			_GameLoop();//begin game loop
		},
		_GameLoop=function(){//game loop function
			var latestTime=new Date(),//get new time
			dt=(latestTime-N._currentTime)/1e3;//calculate deltatime (s)
			if(gameScene.Update)gameScene.Update(dt);//call game update
			_Update(dt);//call game object update functions
			_Draw(dt);//call game object draw functions
			_UpdateInput();//update key states
			N._currentTime=latestTime;//old time becomes new time
			if(N.Running)
				runNextFrame(_GameLoop);//loop as long as game is still running
		},
		//draw texture: x, y, atlas index, texture index, options
		//options: sc - scale, al - alpha, ng - rotation angle, ox - offset x, oy - offset y, fx - flip x, fy - flip y, ow - overall width, oh - overall height
		_DrawTexture=function(x,y,ai,ti,o){
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
			tx=o.fx?N.ScaledCanvasWidth-tx-tw:tx;
			ty=o.fy?N.ScaledCanvasHeight-ty-th:ty;
			canvasContext.translate(o.fx?N.ScaledCanvasWidth*gameScale:0,o.fy?N.ScaledCanvasHeight*gameScale:0);
			canvasContext.scale(o.fx?-gameScale:gameScale,o.fy?-gameScale:gameScale);

			canvasContext.globalAlpha=o.al;//set alpha for texture
			canvasContext.drawImage(_atlasImages[a[0]],a[1]+xo,a[2]+yo,a[4],a[5],tx,ty,tw,th);//draw texture
			canvasContext.restore();//restore saved scale/translation values
		},
		_Update=function(dt){
			for(var goi in _gameObjectList){
				var go = _gameObjectList[goi];
				if (go.Update&&go.Active())//if gameobject has update method and is active, call update
					go.Update(dt);// call update function on current game object: pass in deltatime
			}
		},
		_Draw=function(dt){//call draw functions: deltatime
			canvasContext.fillStyle=N.canvasColor;
			canvasContext.fillRect(0,0,N.ScaledCanvasWidth,N.ScaledCanvasHeight); // clear
			for(var goi in _gameObjectList){
				var go = _gameObjectList[goi];
				if (go.Draw&&go.Active())//if gameobject has draw method and is active, call draw
					go.Draw(dt,_DrawTexture);// call draw function on current game object: pass in deltatime/drawing function
			}
		},
		_UpdateInput=function(){//update input states (reduce from pressed to held and from released to not pressed)
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
			I.Init=function(x,y,o) {
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
				I.Active(o.a!=__?o.a:1);//gameobject is active?
				return o;//return options object for reuse
			};
			I.Size=function(textureId){//get gameobject size
				var currentAtlas=N.TextureAtlases[textureId];//texture atlas for the current gameobject
				//sc=N.GS*I.sc;
				return [currentAtlas[4],currentAtlas[5]];//return width,height of current sprite, scaled
			};
			I.Active=function(a){//guard gameobject's active status
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
					_Ready();//begin the game once the atlas is loaded
				}
			};
		}

		//game scenes
		N.AddScene=function(scene){ //add game scenes and return scene's index
			return _sceneList.push(scene)-1;
		} 
		N.RunScene=function(sceneId){ //instantiate game scene and signal readiness if engine is already loaded
			gameScene=_sceneList[sceneId];
			if(_loadedImages)
				_Ready();
		};

		//object pool
		_GetClassPool=function(clss){//get class index (and make sure it's valid)
			var classId = clss.prototype.classId || (clss.prototype.classId = _nextClassId++), // get or add id to class prototype
			classPools = _gameObjectPool || (_gameObjectPool = {});//create object to match classes to an ID if none exists
			return classPools[classId] || (classPools[classId] = []); // create array of class objects if none exists
		};
		N.ObjectGet=function(classPrototype,constructorParameters){//Object Get: c - class to get, pa - parameter array
			//var classId=,//get class index
			var arr=_GetClassPool(classPrototype),//get array of objects for the class id (automatically created with _GetClassId())
			//if(!a)a=p[i]=[];//if no array of that class type exists, create and return one
			returnObject=arr.pop()||new classPrototype();//get next object or new object if none exists
			returnObject.Init.apply(returnObject,constructorParameters);//call init function passing in parameter array
			returnObject._classId=classPrototype.prototype.classId;//assign the class's id to the object so it can be returned without hassle
			return returnObject;//finally return the object
		};
		N.ObjectPut=function(obj){//Object Put: o - object to put
			obj.Active(0);//deactivate object
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
		N.AnyKey=function(s){for(var ki in N.keyStates){if(N.keyStates[ki]==s)return ki;}return 0;}// return any key with the desired state

		//Public Classes
		//sprite: x, y, spritesheet, current animation (texture atlas index), options
		//options: f=current frame, ox=origin offset x, oy=origin offset y, fx=x-flip, fy=y-flip
		N.Sprite=function Sprite(x,y,s,ti,o){
			var I=this,oi,os,_ft;
			_Gameobject.call(I,x,y,o);//inherit from GameObject
			oi=I.Init;//preserve reference to old init function
			os=I.Size;//preserve reference to old size function
			I.Init=function(x,y,s,ti,o) {
				o=oi(x,y,o);//call parent initializer
				I.ti=ti;
				I.Spritesheet=s||[[0,0,[0]]];//animation spritesheet (atlas index, framerate, frames)
				_ft=0;
				I.PlayAnimation(ti,o.f);//set up animation
				return o;//invite overloading
			};
			I.Draw=function(dt, df){//draw: deltatime, draw function
				var ss=I.Spritesheet[I.ti];//spritesheet for current animation
				df(I.x,I.y,ss[0],ss[2][I.f],
					{sc:I.sc,al:I.al,ng:I.ng,ox:I.ox,oy:I.oy,fx:I.fx,fy:I.fy});
			};
			I.Update=function(dt){//update: deltatime
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
			I.PlayAnimation=function(ti,f,r){//Play anim: set current anim/frame, r=force reset frame timer
				I.f=isNaN(f)?I.f||0:f;// f||I.f||0;
				if(ti!=I.ti||r){_ft=0;I.f=f||0;}//reset timer if animation has changed or the reset is forced
				I.ti=ti;
			};
			I.ToggleAnimation=function(){_ft=_ft<0?0:-1;};//Toggle Animation: switches between playing and stopped
			I.Size=function(){//get sprite size
				return os(I.Spritesheet[I.ti][0]);
			};
			I.Init(x,y,s,ti,o);//initialize
		};
		//text: x, y, texture atlas index, text, options
		//options: mw - max line width (in characters), c - cipher string, al - alpha, sc - scale
		N.Text=function Text(x,y,ti,t,o){
			var I=this,oi,os,cphr;
			_Gameobject.call(I,x,y,o);//inherit from GameObject
			oi=I.Init;//preserve reference to old init function
			os=I.Size;//preserve reference to old size function
			I.Init=function(x,y,ti,t,o) {
				o=oi(x,y,o);//call parent initializer
				I.ti=ti;//texture atlas index (for character set)
				I.t=t;//"text" string (can be character string or array of indexes)
				I.mw=o.mw||0;//max line width (in characters)

				if(o.c){
					cphr={};//initialize cipher object
					for(var i=0;i<o.c.length;i++){
						cphr[o.c.charAt(i)]=i;//create mapping from character to index
					}
				}
				return o;//invie overloading
			};
			I.Draw=function(dt, df){//draw: deltatime, draw function
				var i,x,y,
				atlasRow=N.TextureAtlases[I.ti],//get texture atlas row
				//shorthand
				t=I.t,
				w=I.mw,
				odm=I.Size();//get overall dimensions
				if(!Array.isArray(t)){//assume that if t isn't an array, it must be a valid string
					t=[];//convert the string to an array using the cipher
					for(i=0;i<I.t.length;i++){
						t.push(cphr[I.t.charAt(i)]);//get number for character from cipher and push to array
					}
				}

				for(i=0;i<t.length;i++){
					x=i;
					y=0;
					if(w){//if a max width is defined
						x=x%w;//limit to maximum width (in characters)
						y=~~(i/w);//increase to as many lines as necessary
					}
					//multiply indexes by offset amount
					x*=atlasRow[4]*I.sc;
					y*=atlasRow[5]*I.sc;
					df(I.x+x,I.y+y,I.ti,t[i],{al:I.al,sc:I.sc,ox:I.ox,oy:I.oy,ow:odm[0],oh:odm[1]});//draw characters
				}
			};
			I.Size=function(){//get sprite size
				var tileSize=os(I.ti),//get size of tiles
				w=tileSize[0],h=tileSize[1],//shorthand into width and height
				ln=I.t.length;//text length shorthand
				//return tile size multiplied by the width/height in tiles of the text element
				return [(I.mw?w*Math.min(ln,I.mw):w*ln)*I.sc,
					(I.mw?h*Math.ceil(ln/I.mw):h)*I.sc];
			};
			I.Init(x,y,ti,t,o);//initialize
		};
	};