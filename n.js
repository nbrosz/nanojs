//canvas id, width, height, game class, texture atlas image, texture atlas, framerate, game scale, anti-alias?
var Njs=function(id,cw,ch,aisrc,ta,fr,gs,aa){ //_ implies important hidden members
		var N=this,
		gc,//current game class (prototype)
		_Gol,//game object list
		_Sl=[],//game states list
		cv=document.getElementById(id),//canvas
		cx=cv.getContext("2d"),//context
		dc=document,
		_ai=new Image(),//atlas image
		_lk=1,//user is locked to control game
		spfx="mageSmoothingEnabled",//prefix for smoothing property
		//private functions
		ael=function(tg,eh,fu){tg.addEventListener(eh,fu);},//add event listener shorthand
		lf=(fr>0&&requestAnimationFrame)||function(c){setTimeout(c,1e3/Math.abs(fr));},//use requestAnimationFrame with fallback
		oc=function(e){return e.target==cv;},//check if callback target is the canvas
		meh=function(e){//shared mouse event handler
			if(oc(e)){
				var b=e.buttons,m=N.mo;
				//update mouse button states
				m.l=b&1;//left
				m.m=b&4;//middle
				m.r=b&2;//right
			}
		},
		_Rdy=function(){
			if(!gc)return;
			//restore engine to defaults
			N.CW=cw;//canvas width
			N.CH=ch;//canvas height
			N.SCW=cv.width=cw*gs;//scaled canvas width
			N.SCH=cv.height=ch*gs;//scaled canvas height
			N.GS=gs;//game scale
			N.Ta=ta;//texture atlas
			cx["msI"+spfx]=cx["mozI"+spfx]=cx["i"+spfx]=!!aa;//set anti-aliasing
			N.cc=0xfff;//canvas (background) color
			_Gol=[];//game object list
			N._ct=new Date();//current time
			N.R=1;//game is running
			//begin game
			gm=new gc(N);//instantiate game
			gm.Ld();//call game load
			_Gl();//begin game loop
		},
		_Gl=function(){//game loop function
			var nd=new Date(),//get new time
			dt=(nd-N._ct)/1e3;//calculate deltatime (s)
			gm.Ud(dt);//call game update
			_Ud(dt);//call game object update functions
			_Drw(dt);//call game object draw functions
			_Ui();//update key states
			N._ct=nd;//old time becomes new time
			if(N.R)lf(_Gl);//loop as long as game is still running
		},
		//draw texture: x, y, atlas index, texture index, options
		//options: sc - scale, al - alpha, ng - rotation angle, ox - offset x, oy - offset y, fx - flip x, fy - flip y, ow - overall width, oh - overall height
		_Dtex=function(x,y,ai,ti,o){
			cx.save();//preserve default scale/translation values
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
			var a=ta[ai],//current atlas row
			xi=ti%a[2],//x-index for the texture's current frame
			yi=~~(ti/a[2]),//y-index (floored) for the texture's current frame
			sp=a[5]||0,//texture padding (0 if undefined)
			xo=xi*(a[3]+sp),//x-offset for the texture's current frame (including padding)
			yo=yi*(a[4]+sp),//y-offset for the texture's current frame (including padding)
			tw=a[3]*o.sc,//texture width
			th=a[4]*o.sc,//texture height
			ow=o.ow||tw,//overall width
			oh=o.oh||th,//overall height

			//rotation
			d2r=Math.PI/180,//degrees to radians
			ra=o.ng*d2r,//texture rotation angle to radians
			aco=Math.cos(-ra),//cos of angle to compensate for canvas x rotation
			asi=Math.sin(-ra),//sin of angle to compensate for canvas y rotation
			tx=x*aco-y*asi-ow*o.ox,//formula to compensate for canvas x rotation
			ty=y*aco+x*asi-oh*o.oy;//formula to compensate for canvas y rotation
			cx.rotate(ra);

			//flipping
			//translate and scale during flipping so texture ends up in the same spot
			tx=o.fx?N.SCW-tx-tw:tx;
			ty=o.fy?N.SCH-ty-th:ty;
			cx.translate(o.fx?N.SCW*gs:0,o.fy?N.SCH*gs:0);
			cx.scale(o.fx?-gs:gs,o.fy?-gs:gs);

			cx.globalAlpha=o.al;//set alpha for texture
			cx.drawImage(N._ai,a[0]+xo,a[1]+yo,a[3],a[4],tx,ty,tw,th);//draw texture
			cx.restore();//restore saved scale/translation values
		},
		_Ud=function(dt){
			for(var goi in _Gol){
				var go = _Gol[goi];
				if (go.Ud)
					go.Ud(dt);// call update function on current game object: pass in deltatime
			}
		},
		_Drw=function(dt){//call draw functions: deltatime
			if(!N._ai||!ta)return;
			cx.fillStyle=N.cc;
			cx.fillRect(0,0,N.SCW,N.SCH); // clear
			for(var goi in _Gol){
				var go = _Gol[goi];
				if (go.Drw)
					go.Drw(dt,_Dtex);// call draw function on current game object: pass in deltatime/drawing function
			}
		},
		_Ui=function(){//update input states (reduce from pressed to held and from released to not pressed)
			var i,o=N.ko;
			for(i in o){
				if(o[i])o[i]=1; //set key state to held
				else delete o[i]; //set key state to not pressed
			}
		},
		//Private Classes
		//Gameobject (common base class): x, y, options
		//options: f=current frame, ox=origin offset x, oy=origin offset y, fx=x-flip, fy=y-flip
		_Go=function(x,y,o){
			var I=this;
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
				return o;//return options object for reuse
			};
			I.Sz=function(ti){//get gameobject size
				if(!N._ai)return [0,0];//safety
				var ta=N.Ta[ti];//texture atlas for the current gameobject
				//sc=N.GS*I.sc;
				return [ta[3],ta[4]];//return width,height of current sprite, scaled
			};
			_Gol.push(I);
		};

		_ai.src=aisrc;//set atlas image src
		_ai.onload=function(){//once atlas image is loaded, assign it to engine
			N._ai=ta&&_ai;//if there is no atlas data, don't complete image load
			_Rdy();//begin the game once the atlas is loaded
		};

		N.As=function(s){return _Sl.push(s)-1;} //add game state and return state's index
		N.Rn=function(k,c){gc=_Sl[k];if(N._ai)_Rdy();};//instantiate game state class and signal readiness if engine is already loaded

		//input
		N.ko={};//object holding key states (2 - pressed, 1 - held, 0 - released, undefined - not held)
		N.mo={x:0,y:0};//object holding mouse state
		ael(dc,"keydown",function(e){
			if(!_lk)return;//only control if canvas is selected
			var k=e.keyCode;
			if(k==32||k>36&&k<41)e.preventDefault();//prevents space/arrow key behavior
			N.ko[k]=N.ko[k]?1:2;//set key state to "down" if just pressed or "held" if not
		});
		ael(dc,"keyup",function(e){
			N.ko[e.keyCode]=0;//set key state to "up"
		});
		ael(dc,"click",function(e){
			_lk=oc(e);//lock when clicked
		});
		//update mouse button states for up and down
		ael(cv,"mousedown",meh);
		ael(cv,"mouseup",meh);
		ael(cv,"mousemove",function(e){
			if(oc(e)){//get mouse x and y
				N.mo.x=e.offsetX;
				N.mo.y=e.offsetY;
			}
		});
		ael(cv,"contextmenu",function(e){
			if(oc(e))e.preventDefault();//prevent right-click context menu on canvas
		});
		N.Ak=function(s){for(var ki in N.ko){if(N.ko[ki]==s)return ki;}return 0;}// return any key with the desired state

		//Public Classes
		//sprite: x, y, spritesheet, current animation (texture atlas index), options
		//options: f=current frame, ox=origin offset x, oy=origin offset y, fx=x-flip, fy=y-flip
		N.Spr=function(x,y,s,ti,o){
			var I=this,oi,os,_ft;
			_Go.call(I,x,y,o);//inherit from GameObject
			oi=I.Init;//preserve reference to old init function
			os=I.Sz;//preserve reference to old size function
			I.Init=function(x,y,s,ti,o) {
				o=oi(x,y,o);//call parent initializer
				I.ti=ti;
				I.S=s||[[0,0,[0]]];//animation spritesheet (atlas index, framerate, frames)
				_ft=0;
				I.Pa(ti,o.f);//set up animation
				return o;//invite overloading
			};
			I.Drw=function(dt, df){//draw: deltatime, draw function
				var ss=I.S[I.ti];//spritesheet for current animation
				df(I.x,I.y,ss[0],ss[2][I.f],
					{sc:I.sc,al:I.al,ng:I.ng,ox:I.ox,oy:I.oy,fx:I.fx,fy:I.fy});
			};
			I.Ud=function(dt){//update: deltatime
				//progress sprite animations
				var fl,nf,
				ss=I.S[I.ti];//current spritesheet
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
			I.Pa=function(ti,f,r){//Play anim: set current anim/frame, r=force reset frame timer
				I.f=isNaN(f)?I.f||0:f;// f||I.f||0;
				if(ti!=I.ti||r){_ft=0;I.f=f||0;}//reset timer if animation has changed or the reset is forced
				I.ti=ti;
			};
			I.Ta=function(){_ft=_ft<0?0:-1;};//Toggle Animation: switches between playing and stopped
			I.Sz=function(){//get sprite size
				return os(I.S[I.ti][0]);
			};
			I.Init(x,y,s,ti,o);//initialize
		};
		//text: x, y, texture atlas index, text, options
		//options: mw - max line width (in characters), c - cipher string, al - alpha, sc - scale
		N.Txt=function(x,y,ti,t,o){
			var I=this,oi,os,cphr;
			_Go.call(I,x,y,o);//inherit from GameObject
			oi=I.Init;//preserve reference to old init function
			os=I.Sz;//preserve reference to old size function
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
			I.Drw=function(dt, df){//draw: deltatime, draw function
				var i,x,y,
				a=N.Ta[I.ti],//get texture atlas row
				//shorthand
				t=I.t,
				w=I.mw,
				odm=I.Sz();//get overall dimensions
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
					x*=a[3]*I.sc;
					y*=a[4]*I.sc;
					df(I.x+x,I.y+y,I.ti,t[i],{al:I.al,sc:I.sc,ox:I.ox,oy:I.oy,ow:odm[0],oh:odm[1]});//draw characters
				}
			};
			I.Sz=function(){//get sprite size
				var tsz=os(I.ti),//get size of tiles
				w=tsz[0],h=tsz[1],//shorthand into width and height
				ln=I.t.length;//text length shorthand
				//return tile size multiplied by the width/height in tiles of the text element
				return [(I.mw?w*Math.min(ln,I.mw):w*ln)*I.sc,
					(I.mw?h*Math.ceil(ln/I.mw):h)*I.sc];
			};
			I.Init(x,y,ti,t,o);//initialize
		};
	};