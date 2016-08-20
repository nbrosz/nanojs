//canvas id, width, height, game class, sprite atlas image, sprite atlas, framerate, game scale, anti-alias?
var Njs=function(id,cw,ch,aisrc,spa,fr,gs,aa){ //_ implies important hidden members
		var N=this,
		gc,//current game class (prototype)
		_spl,//game sprite list
		_ste=[],//game states list
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
			//N.SPA=spa;//sprite atlas
			N.GS=gs;//game scale
			cx["msI"+spfx]=cx["mozI"+spfx]=cx["i"+spfx]=!!aa;//set anti-aliasing
			N.cc=0xfff;//canvas (background) color
			_spl=[];//sprite list
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
			_Dsp(dt);//draw sprites
			_Ui();//update key states
			N._ct=nd;//old time becomes new time
			if(N.R)lf(_Gl);//loop as long as game is still running
		},
		_Dsp=function(dt){//draw sprite list: deltatime
			if(!N._ai||!spa)return;
			cx.fillStyle=N.cc;
			cx.fillRect(0,0,N.SCW,N.SCH); // clear
			cx.save();//preserve default scale/translation values
			for(var si in _spl){
				var s=_spl[si],//current sprite
				ss=s.S[s.a],//spritesheet for current sprite animation
				a=spa[ss[0]],//atlas for the current spritesheet
				i=ss[2][s.f],//index for the sprite's current frame
				xi=i%a[2],//x-index for the sprite's current frame
				yi=~~(i/a[2]),//y-index (floored) for the sprite's current frame
				sp=a[5]||0,//sprite padding (0 if undefined)
				xo=xi*(a[3]+sp),//x-offset for the sprite's current frame (including padding)
				yo=yi*(a[4]+sp),//y-offset for the sprite's current frame (including padding)
				sw=a[3]*s.sc,//sprite width
				sh=a[4]*s.sc,//sprite height
				tsx=~~s.x,//temp sprite x position (floored)
				tsy=~~s.y,//temp sprite y position (floored)
				//rotation
				d2r=Math.PI/180,//degrees to radians
				ra=s.ng*d2r,//sprite rotation angle to radians
				aco=Math.cos(-ra),//cos of angle to compensate for canvas x rotation
				asi=Math.sin(-ra),//sin of angle to compensate for canvas y rotation
				sx=tsx*aco-tsy*asi-sw*s.ox,//formula to compensate for canvas x rotation
				sy=tsy*aco+tsx*asi-sh*s.oy;//formula to compensate for canvas y rotation
				cx.rotate(ra);
				//flipping
				//translate and scale during flipping so sprites end up in the same spot
				sx=s.fx?N.SCW-sx-sw:sx;
				sy=s.fy?N.SCH-sy-sh:sy;
				cx.translate(s.fx?N.SCW*gs:0,s.fy?N.SCH*gs:0);
				cx.scale(s.fx?-gs:gs,s.fy?-gs:gs);

				cx.globalAlpha=s.al;//set alpha for sprite
				cx.drawImage(N._ai,a[0]+xo,a[1]+yo,a[3],a[4],sx,sy,sw,sh);//draw sprite
				cx.restore();//restore default scale/translation values
				if(s._ft>=0&&ss[1]){//as long as the sprite isn't paused and has a valid length
					s._ft+=dt;//add deltatime to frame timer
					var fl=1/ss[1];//the expected total frame length (how many ms should pass before next frame)
					if(s._ft>fl){//if frame timer has advanced enough to move to the next frame...
						var nf=(s.f+1)%ss[2].length;//get index of the next frame for the current animation
						if(ss[2][nf]<0) {//if the next frame is a pause frame
							s._ft=-1;//pause the animation on the current frame
						}else{
							s.f=nf;//otherwise loop the animation
							s._ft=s._ft%fl;//get frame timer remainder (rather setting to 0) for more accurate timing
						}
					}
				}
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
			N._ai=spa&&_ai;//if there is no atlas data, don't complete image load
			_Rdy();//begin the game once the atlas is loaded
		};

		N.As=function(s){return _ste.push(s)-1;} //add game state and return state's index
		N.Rn=function(k,c){gc=_ste[k];if(N._ai)_Rdy();};//instantiate game state class and signal readiness if engine is already loaded

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

		//Classes
		//sprite: x, y, spritesheet, current animation
		//options: f=current frame, ox=origin offset x, oy=origin offset y, fx=x-flip, fy=y-flip
		N.Sp=function(x,y,s,a,o){//a,f,co,sc,fx,fy
			var I=this;
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
			I.Pa=function(a,f,r){//Play anim: set current anim/frame, r=force reset frame timer
				a=a||0;
				I.f=f||I.f||0;
				if(a!=I.a||r){I._ft=0;I.f=f||0;}//reset timer if animation has changed or the reset is forced
				I.a=a;
			};
			I.Ta=function(){I._ft=I._ft<0?0:-1;};//Toggle Animation: switches between playing and stopped
			I.Sz=function(){//get sprite size
				if(!N._ai)return [0,0];//safety
				var sa=spa[I.S[I.a][0]];//sprite atlas for the current animation
				return [sa[3]*N.GS,sa[4]*N.GS];//return width,height of current sprite, scaled
			};
			I.Pa(a,o.f);
			_spl.push(I);
		}
		N.Go=function(x,y,s,a,o){//gameobject
			var I=this;
			o=o||{};
			N.Sp.call(I,x,y,s,a,o);//inherit from sprite
		}
	};

// Sprite Atlas example:
// [
// 	 [0,0,4,16,16,1],//start x/y, row width(in # of sprites), sprite width/height, sprite padding (optional)
//	 [...]
// ]

// Spritesheet example:
// [
//   [0,6,[0,1,2,3]],//atlas index, ticks per frame, frames indexes in animation
//	 [1,6,[0,1,3,2,-1]]//animations ending in -1 will not loop
// ]

// Sample Keycodes:
// W - 87
// A - 65
// S - 83
// D - 68
// Shift - 16
// Space - 32