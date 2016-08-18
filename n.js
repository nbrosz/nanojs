//canvas id, width, height, game class, sprite atlas image, sprite atlas, framerate, anti-alias?, game scale
var Njs=function(id,cw,ch,gc,aisrc,spa,fr,aa,gs){
		var N=this,gl,lf,meh,oc,
		gm=new gc(N),//instantiate game
		cv=document.getElementById(id),//canvas
		cx=cv.getContext("2d"),//context
		ael=function(tg,eh,fu){tg.addEventListener(eh,fu);},//shorthand
		dc=document,
		pf=1e3/fr,//ms per frame
		_ai=new Image(),//atlas image
		lk=1;//user is locked to control game
		_ai.src=aisrc;//set atlas image src
		_ai.onload=function(){//once atlas image is loaded, assign it to engine
			N._ai=spa&&_ai;//if there is no atlas data, don't complete image load
		};
		N.CW=cv.width=cw*gs;//canvas width
		N.CH=cv.height=ch*gs;//canvas height
		N.SPA=spa;//sprite atlas
		N.GS=gs;//game scale
		N.cc=0xfff;//canvas (background) color
		N._ct=new Date();//current time
		cx.imageSmoothingEnabled=!!aa;//set anti-aliasing

		// sprite drawing
		N.spl=[];//sprite list
		N._Dsp=function(dt){//draw sprite list: deltatime
			if(!N._ai||!spa)return;
			cx.fillStyle=N.cc;
			cx.fillRect(0,0,N.CW,N.CH); // clear
			cx.save();//preserve default scale/translation values
			for(var si in N.spl){
				var s=N.spl[si],//current sprite
				ss=s.S[s.a],//spritesheet for current sprite animation
				a=spa[ss[0]],//atlas for the current spritesheet
				i=ss[2][s.f],//index for the sprite's current frame
				xo=(i%a[2])*a[3],//x-offset for the sprite's current frame
				yo=(~~(i/a[2]))*a[4],//y-offset (floored) for the sprite's current frame
				sw=a[3],//sprite width
				sh=a[4],//sprite height
				hsw=sw/2,//half sprite width
				hsh=sh/2,//half sprite height
				tsx=~~(s.x+(s.co?0:hsw)),//temp sprite x position (floored)
				tsy=~~(s.y+(s.co?0:hsh)),//temp sprite y position (floored)
				//rotation
				d2r=Math.PI/180,//degrees to radians
				ra=s.ng*d2r,//sprite rotation angle to radians
				aco=Math.cos(-ra),//cos of angle to compensate for canvas x rotation
				asi=Math.sin(-ra),//sin of angle to compensate for canvas y rotation
				sx=tsx*aco-tsy*asi-hsw,//formula to compensate for canvas x rotation
				sy=tsy*aco+tsx*asi-hsh;//formula to compensate for canvas y rotation
				cx.rotate(ra);
				//flipping
				//translate and scale during flipping so sprites end up in the same spot
				sx=s.fx?N.CW-sx-sw:sx;
				sy=s.fy?N.CH-sy-sh:sy;
				cx.translate(s.fx?N.CW*gs:0,s.fy?N.CH*gs:0);
				cx.scale(s.fx?-gs:gs,s.fy?-gs:gs);
				cx.drawImage(N._ai,a[0]+xo,a[1]+yo,a[3],a[4],sx,sy,sw,sh);//draw sprite
				cx.restore();//restore default scale/translation values
				if(s._ft>=0){//as long as the sprite isn't paused
					s._ft+=dt;//add deltatime to frame timer
					var fl=pf*ss[1];//the expected total frame length (how many ms should pass before next frame)
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
		};

		//input
		N.ko={};//object holding key states (2 - pressed, 1 - held, 0 - released, nothing - not held)
		N.mo={x:0,y:0};//object holding moues state
		ael(dc,"keydown",function(e){//only use keypress event -- rely on key state object for details
			if(!lk)return;//only control if canvas is selected
			e.preventDefault();//prevents any unwanted key behavior, such as scrolling with arrow keys
			N.ko[e.keyCode]=2;//set key state to "down"
		});
		ael(dc,"keyup",function(e){//only use keypress event -- rely on key state object for details
			N.ko[e.keyCode]=0;//set key steate to "up"
		});
		oc=function(e){return e.target==cv;}//check if target is on the canvas
		ael(dc,"click",function(e){
			lk=oc(e);//lock when clicked
		});
		meh=function(e){//shared mouse event updater
			if(oc(e)){
				var b=e.buttons,m=N.mo;
				m.l=b&1;//left
				m.m=b&4;//middle
				m.r=b&2;//right
			}
		}
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
		N._Ui=function(){//update input states (reduce from pressed to held and from released to not pressed)
			var i,o=N.ko;
			for(i in o){
				if(o[i])o[i]=1; //set key state to held
				else delete o[i]; //set key state to not pressed
			}
		};

		N.R=1;//game is running
		lf=requestAnimationFrame||function(c){setTimeout(c,pf);};//use requestAnimationFrame with fallback
		gl=function(){//game loop function
			var nd=new Date(),//get new time
			dt=nd-N._ct;//calculate deltatime (ms)
			gm.Ud(dt);//call game update
			N._Dsp(dt);//draw sprites
			N._Ui();//update key states
			N._ct=nd;//old time becomes new time
			if(N.R)lf(gl);//loop as long as game is still running
		};

		//Classes
		//sprite: x, y, width, height, spritesheet, current animation, current frame, center origin?, x-flip, y-flip
		N.Sp=function(x,y,s,a,f,co,fx,fy){
			var I=this;
			I.x=x;//x position
			I.y=y;//y position
			I.co=co||0;//center origin -- origin will be top-left if false
			I.fx=!!fx;//flip x?
			I.fy=!!fy;//flip y?
			I.ng=0;//rotation angle
			I.S=s||[[0,6,[0,-1]]];//animation spritesheet (atlas index, framerate, frames)
			I.Pa=function(a,f,r){//Play anim: set current anim/frame, r=force reset frame timer
				a=a||0;
				I.f=f||I.f||0;
				if(a!=I.a||r){I._ft=0;I.f=f||0;}
				I.a=a;
			};
			I.Ta=function(){I._ft=I._ft<0?0:-1;};//Toggle Animation: switches between playing and stopped
			I.Sz=function(){//get sprite size
				if(!N._ai)return [0,0];//safety
				var sa=N.SPA[I.S[I.a][0]];//sprite atlas for the current animation
				return [sa[3]*N.GS,sa[4]*N.GS];//return width,height of current sprite, scaled
			};
			I.Pa(a,f);
			N.spl.push(I);
		}
		N.Go=function(x,y,s,a,f,co,fx,fy){//gameobject
			var I=this;
			N.Sp.call(I, x,y,s,a,f,co,fx,fy);//inherit from sprite
		}

		// finally, begin the game
		gm.Ld();//call game load
		lf(gl);//begin game loop
	};

// Sprite Atlas example:
// [
// 	 [0,0,4,16,16],//start x/y, row width(in # of sprites), sprite width/height
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