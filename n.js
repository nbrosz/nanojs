var Njs=function(id,gc,aisrc,spa,fr,aa,gs){//canvas id, game, sprite atlas image, sprite atlas, framerate, anti-alias?, game scale
		var N=this,gl,lf,
		gm=new gc(N),//instantiate game
		cv=document.getElementById(id),//canvas
		cx=cv.getContext("2d"),//context
		pf=1e3/fr,//ms per frame
		_ai=new Image();//atlas image
		_ai.src=aisrc;//set atlas image src
		_ai.onload=function(){//once atlas image is loaded, assign it to engine
			N._ai=spa&&_ai;//if there is no atlas data, don't complete image load
		};
		N.CW=cv.width;//canvas width
		N.CH=cv.height;//canvas height
		N.SPA=spa;//sprite atlas
		cx.imageSmoothingEnabled=!!aa;//set anti-aliasing
		N.GS=gs;//game scale
		N.cc=0xfff;//canvas color
		N._ct=new Date();//current time
		N.spl=[];//sprite list
		N._Dsp=function(dt){//draw sprite list: deltatime
			if(!N._ai||!spa)return;
			cx.fillStyle=N.cc;
			cx.fillRect(0,0,N.CW,N.CH); // clear
			for(var si in N.spl){
				var s=N.spl[si],//current sprite
				ss=s.S[s.a],//spritesheet for current sprite animation
				a=spa[ss[0]],//atlas for the current spritesheet
				i=ss[2][s.f],//index for the sprite's current frame
				xo=(i%a[2])*a[3],//x-offset for the sprite's current frame
				yo=(~~(i/a[2]))*a[4],//y-offset (floored) for the sprite's current frame
				sx=~~(s.x*gs),//sprite x position
				sy=~~(s.y*gs),//sprite y position
				sw=a[3]*gs,//sprite width
				sh=a[4]*gs,//sprite height
				csx=s.fx?-1:1,//canvas scale x
				csy=s.fy?-1:1,//canvas scale y
				tx=s.fx?N.CW:0,//canvas translate x
				ty=s.fy?N.CH:0;//canvas translate y
				sx=s.fx?N.CW-sx-sw:sx;
				sy=s.fy?N.CH-sy-sh:sy;
				cx.save();
				cx.translate(tx,ty);
				cx.scale(csx,csy);
				cx.drawImage(N._ai,a[0]+xo,a[1]+yo,a[3],a[4],sx,sy,sw,sh);//draw sprite
				cx.restore();
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
		N.R=1;//game is running
		lf=requestAnimationFrame||function(c){setTimeout(c,pf);};//use requestAnimationFrame with fallback
		gl=function(){//game loop function
			var nd=new Date(),//get new time
			dt=nd-N._ct;//calculate deltatime (ms)
			gm.Ud(dt);//call game update
			N._Dsp(dt);//draw sprites
			N._ct=nd;//old time becomes new time
			if(N.R)lf(gl);//loop as long as game is still running
		};

		//Classes
		N.Sp=function(x,y,s,a,f,fx,fy){//sprite: x, y, width, height, spritesheet, current animation, current frame, x-flip, y-flip
			var I=this;
			I.x=x;//x position
			I.y=y;//y position
			I.fx=!!fx;//flip x?
			I.fy=!!fy;//flip y?
			I.S=s||[[0,6,[0,-1]]];//animation spritesheet (atlas index, framerate, frames)
			I.Sf=function(a,f,p){I.a=a;I.f=f||0;I._ft=p?-1:0;};//Set Frame: set current anim/frame and reset timer, p=start paused
			I.Ta=function(){I._ft=I._ft<0?0:-1;};//Toggle Animation: switches between playing and stopped
			I.Sz=function(){//get sprite size
				if(!N._ai)return [0,0];//safety
				var sa=N.SPA[I.S[I.a][0]];//sprite atlas for the current animation
				return [sa[3]*N.GS,sa[4]*N.GS];//return width,height of current sprite, scaled
			};
			I.Sf(0);//initialize to 0
			N.spl.push(I);
		}
		N.Go=function(x,y,s,a,f,fx,fy){//gameobject
			var I=this;
			N.Sp.call(I, x,y,s,a,f,fx,fy);//inherit from sprite
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