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
		//options: sc - scale, al - alpha, ng - rotation angle, ox - offset x, oy - offset y, fx - flip x, fy - flip y
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

			//rotation
			d2r=Math.PI/180,//degrees to radians
			ra=o.ng*d2r,//texture rotation angle to radians
			aco=Math.cos(-ra),//cos of angle to compensate for canvas x rotation
			asi=Math.sin(-ra),//sin of angle to compensate for canvas y rotation
			tx=x*aco-y*asi-tw*o.ox,//formula to compensate for canvas x rotation
			ty=y*aco+x*asi-th*o.oy;//formula to compensate for canvas y rotation
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
		N.mo={x:0,y:0};//object holding moues state
		ael(dc,"keydown",function(e){//only use keypress event -- rely on key state object for details
			if(!_lk)return;//only control if canvas is selected
			var k=e.keyCode;
			if(k==32||k>36&&k<41)e.preventDefault();//prevents space/arrow key behavior
			N.ko[k]=2;//set key state to "down"
		});
		ael(dc,"keyup",function(e){//only use keypress event -- rely on key state object for details
			N.ko[e.keyCode]=0;//set key steate to "up"
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
		//text: x, y, texture atlas index, text, options
		//options: mw - max width (in characters, before line break), c - cipher string, al - alpha, sc - scale
		N.Txt=function(x,y,a,t,o){
			var I=this,cphr;
			I.Init=function(x,y,a,t,o) {
				o=o||{};
				I.x=x;//x position
				I.y=y;//y position
				I.a=a;
				I.t=t;
				I.mw=o.mw||0;
				I.al=o.al||1;
				I.sc=o.sc||1;

				if(o.c){
					cphr={};//initialize cipher object
					for(var i=0;i<o.c.length;i++){
						cphr[o.c.charAt(i)]=i;//create mapping from character to index
					}
				}
			};
			I.Drw=function(dt, df){//draw: deltatime, draw function
				var i,x,y,
				sc=N.GS*I.sc,//total scale
				a=ta[I.a],//get texture atlas row
				//shorthand
				t=I.t,
				w=I.mw;
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
					x*=a[3];//*sc;
					y*=a[4];//*sc;
					df(I.x+x,I.y+y,I.a,t[i],{al:I.al,sc:I.sc});//draw characters
				}
			};
			I.Init(x,y,a,t,o);//initialize
			_Gol.push(I);
		}
		//sprite: x, y, spritesheet, current animation, options
		//options: f=current frame, ox=origin offset x, oy=origin offset y, fx=x-flip, fy=y-flip
		N.Spr=function(x,y,s,a,o){//a,f,co,sc,fx,fy
			var I=this;
			I.Init=function(x,y,s,a,o) {
				o=o||{};
				I.x=x;//x position
				I.y=y;//y position
				I.ox=o.ox||0;
				I.oy=o.oy||0;
				I.fx=!!o.fx;//flip x?
				I.fy=!!o.fy;//flip y?
				I.ng=o.ng||0;//rotation angle
				I.sc=o.sc||1;//individual sprite scale
				I.al=isNaN(o.al)?1:o.al;//sprite alpha
				I.S=s||[[0,0,[0]]];//animation spritesheet (atlas index, framerate, frames)
			};
			I.Drw=function(dt, df){//draw: deltatime, draw function
				var ss=I.S[I.a];//spritesheet for current animation
				df(I.x,I.y,ss[0],ss[2][I.f],
					{sc:I.sc,al:I.al,ng:I.ng,ox:I.ox,oy:I.oy,fx:I.fx,fy:I.fy});
			};
			I.Ud=function(dt){//update: deltatime
				//progress sprite animations
				var fl,nf,
				ss=I.S[I.a];//current spritesheet
				if(I._ft>=0&&ss[1]){//as long as the animation isn't paused and has a valid length
					I._ft+=dt;//add deltatime to frame timer
					fl=1/ss[1];//the expected total frame length (how many ms should pass before next frame)
					if(I._ft>fl){//if frame timer has advanced enough to move to the next frame...
						nf=(I.f+1)%ss[2].length;//get index of the next frame for the current animation
						if(ss[2][nf]<0) {//if the next frame is a pause frame
							I._ft=-1;//pause the animation on the current frame
						}else{
							I.f=nf;//otherwise loop the animation
							I._ft=I._ft%fl;//get frame timer remainder (rather setting to 0) for more accurate timing
						}
					}
				}
			};
			I.Pa=function(a,f,r){//Play anim: set current anim/frame, r=force reset frame timer
				a=a||0;
				I.f=f||I.f||0;
				if(a!=I.a||r){I._ft=0;I.f=f||0;}//reset timer if animation has changed or the reset is forced
				I.a=a;
			};
			I.Ta=function(){I._ft=I._ft<0?0:-1;};//Toggle Animation: switches between playing and stopped
			I.Sz=function(){//get sprite size
				if(!N._ai)return [0,0];//safety
				var sa=ta[I.S[I.a][0]];//sprite atlas for the current animation
				return [sa[3]*N.GS,sa[4]*N.GS];//return width,height of current sprite, scaled
			};
			I.Init(x,y,s,a,o);//initialize
			I.Pa(a,o.f);//set up animation
			_Gol.push(I);
		}
	};