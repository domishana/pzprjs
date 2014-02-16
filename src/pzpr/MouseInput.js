// MouseInput.js v3.4.0

//---------------------------------------------------------------------------
// ★MouseEventクラス マウス入力に関する情報の保持とイベント処理を扱う
//---------------------------------------------------------------------------
// パズル共通 マウス入力部
// MouseEventクラスを定義
pzpr.createPuzzleClass('MouseEvent',
{
	initialize : function(){
		this.cursor = this.owner.cursor;

		this.enableMouse = true;	// マウス入力は有効か

		this.mouseoffset = {px:0,py:0};
		var bz = pzpr.env.browser;
		if(bz.legacyIE)   { this.mouseoffset = {px:2,py:2};}
		else if(bz.WebKit){ this.mouseoffset = {px:1,py:1};}

		this.mouseCell;		// 入力されたセル等のID
		this.firstCell;		// mousedownされた時のセルのID(連黒分断禁用)

		this.inputPoint = new this.owner.RawAddress();	// 入力イベントが発生したborder座標 ※端数あり
		this.firstPoint = new this.owner.RawAddress();	// mousedownされた時のborder座標 ※端数あり
		this.prevPos    = new this.owner.Address();		// 前回のマウス入力イベントのborder座標

		this.btn = {};		// 押されているボタン
		this.inputData;		// 入力中のデータ番号(実装依存)

		this.bordermode;	// 境界線を入力中かどうか

		this.mousestart;	// mousedown/touchstartイベントかどうか
		this.mousemove;		// mousemove/touchmoveイベントかどうか
		this.mouseend;		// mouseup/touchendイベントかどうか

		this.mousereset();
	},

	RBBlackCell : false,	// 連黒分断禁のパズル

	//---------------------------------------------------------------------------
	// mv.mousereset() マウス入力に関する情報を初期化する
	//---------------------------------------------------------------------------
	mousereset : function(){
		var bd = this.owner.board, cell = this.mouseCell;
		
		this.mouseCell = bd.emptycell;
		this.firstCell = bd.emptycell;

		this.firstPoint.reset();
		this.prevPos.reset();

		this.btn = { Left:false, Middle:false, Right:false};
		this.inputData = null;

		this.bordermode = false;

		this.mousestart = false;
		this.mousemove  = false;
		this.mouseend   = false;
		
		if(bd.linfo.moveline && this.owner.getConfig('dispmove') && !!cell && !cell.isnull){ cell.draw();}
	},

	//---------------------------------------------------------------------------
	// mv.e_mousedown() Canvas上でマウスのボタンを押した際のイベント共通処理
	// mv.e_mouseup()   Canvas上でマウスのボタンを放した際のイベント共通処理
	// mv.e_mousemove() Canvas上でマウスを動かした際のイベント共通処理
	// mv.e_mouseout()  マウスカーソルがウィンドウから離れた際のイベント共通処理
	//---------------------------------------------------------------------------
	//イベントハンドラから呼び出される
	// この3つのマウスイベントはCanvasから呼び出される(mvをbindしている)
	e_mousedown : function(e){
		if(!this.enableMouse){ return true;}
		
		this.setMouseButton(e);			/* どのボタンが押されたか取得 (mousedown時のみ) */
		this.mouseevent(this.getBoardAddress(e), 0);
		
		pzpr.util.stopPropagation(e);
		pzpr.util.preventDefault(e);
		return false;
	},
	e_mouseup   : function(e){
		if(!this.enableMouse){ return true;}
		
		/* 座標は前のイベントのものを使用する */
		this.mouseevent(this.inputPoint, 2);
		this.mousereset();
		
		pzpr.util.stopPropagation(e);
		pzpr.util.preventDefault(e);
		return false;
	},
	e_mousemove : function(e){
		if(!this.enableMouse){ return true;}
		
		this.mouseevent(this.getBoardAddress(e), 1);
		
		pzpr.util.stopPropagation(e);
		pzpr.util.preventDefault(e);
		return false;
	},
	e_mouseout : function(e){ },

	//---------------------------------------------------------------------------
	// mv.setMouseButton()  イベントが起こったボタンを設定する
	// mv.getBoardAddress() イベントが起こったcanvas内の座標を取得する
	//---------------------------------------------------------------------------
	setMouseButton : function(e){
		this.btn = pzpr.util.getMouseButton(e);
		
		// SHIFTキー/Commandキーを押している時は左右ボタン反転
		var kc = this.owner.key;
		kc.checkmodifiers(e);
		if((kc.isSHIFT || kc.isMETA)^this.getConfig('lrcheck')){
			if(this.btn.Left !== this.btn.Right){
				this.btn.Left  = !this.btn.Left;
				this.btn.Right = !this.btn.Right;
			}
		}
	},
	getBoardAddress : function(e){
		var puzzle = this.owner, pc = puzzle.painter, pagePos = pzpr.util.getPagePos(e);
		var px = (pagePos.px - pc.pageX - this.mouseoffset.px);
		var py = (pagePos.py - pc.pageY - this.mouseoffset.py);
		var addr = new puzzle.RawAddress(px/pc.bw, py/pc.bh);
		var g = pc.context;
		if(!!g && (g.use.vml || g.use.sl)){ addr.move(+0.33,+0.33);}
		return addr;
	},

	//---------------------------------------------------------------------------
	// mv.mouseevent() マウスイベント処理
	// mv.isDispred()  inputRed()処理を呼び出すかどうか判定する
	//---------------------------------------------------------------------------
	mouseevent : function(addr, step){
		this.inputPoint.set(addr);
		
		this.mousestart = (step===0);
		this.mousemove  = (step===1);
		this.mouseend   = (step===2);
		
		if(!this.owner.execListener('mouse')){ return;}
		
		if(!this.btn.Left && !this.btn.Right){ return;}
		
		var puzzle = this.owner;
		if(this.mousestart){
			puzzle.opemgr.newOperation();
			puzzle.board.errclear();
			puzzle.redraw();
			if(this.isDispred()){ this.inputRed(); return;}
		}
		else{ puzzle.opemgr.newChain();}
		
		this.mouseinput();		/* 各パズルのルーチンへ */
	},
	isDispred : function(){
		var o = this.owner, cf = o.flags, flag = false;
		if     (cf.redline     && this.getConfig('redline')) { flag = true;}
		else if(cf.redblk      && this.getConfig('redblk'))  { flag = true;}
		else if(cf.redblkrb    && this.getConfig('redblkrb')){ flag = true;}
		else if(o.pid==='roma' && this.getConfig('redroad')) { flag = true;}
		return o.key.isZ ^ flag;
	},

	//---------------------------------------------------------------------------
	// mv.mouseinput() マウスイベント処理。各パズルのファイルでオーバーライドされる。
	// mv.inputRed()  赤く表示する際などのイベント処理。各パズルのファイルでオーバーライドされる。
	//---------------------------------------------------------------------------
	//オーバーライド用
	mouseinput : function(){ },
	inputRed : function(){ return false;},

	//---------------------------------------------------------------------------
	// mv.notInputted()   盤面への入力が行われたかどうか判定する
	//---------------------------------------------------------------------------
	notInputted : function(){ return !this.owner.opemgr.changeflag;},

	// 共通関数
	//---------------------------------------------------------------------------
	// mv.getcell()    入力された位置がどのセルに該当するかを返す
	// mv.getcell_excell()  入力された位置がどのセル/EXCELLに該当するかを返す
	// mv.getcross()   入力された位置がどの交差点に該当するかを返す
	// mv.getborder()  入力された位置がどの境界線・Lineに該当するかを返す(クリック用)
	// mv.getpos()    入力された位置が仮想セル上でどこの(X*2,Y*2)に該当するかを返す。
	//                外枠の左上が(0,0)で右下は(bd.qcols*2,bd.qrows*2)。rcは0～0.5のパラメータ。
	// mv.isBorderMode() 境界線入力モードかどうか判定する
	//---------------------------------------------------------------------------
	getcell : function(){
		return this.getpos(0).getc();
	},
	getcell_excell : function(){
		var pos = this.getpos(0), obj = pos.getex();
		return (!obj.isnull ? obj : pos.getc());
	},
	getcross : function(){
		return this.getpos(0.5).getx();
	},

	getpos : function(spc){
		var addr=this.inputPoint, m1=2*spc, m2=2*(1-spc);
		// 符号反転の影響なく計算したいので、+4して-4する
		var bx=addr.bx+4, by=addr.by+4, dx=bx%2, dy=by%2;
		bx = (bx&~1) + (+(dx>=m1)) + (+(dx>=m2)) - 4;
		by = (by&~1) + (+(dy>=m1)) + (+(dy>=m2)) - 4;
		return (new this.owner.Address(bx,by));
	},

	getborder : function(spc){
		var addr = this.inputPoint;
		var bx = (addr.bx&~1)+1, by = (addr.by&~1)+1;
		var dx = addr.bx+1-bx, dy = addr.by+1-by;

		// 真ん中のあたりはどこにも該当しないようにする
		var bd = this.owner.board;
		if(bd.lines.isLineCross){
			if(!bd.lines.borderAsLine){
				var m1=2*spc, m2=2*(1-spc);
				if((dx<m1||m2<dx) && (dy<m1||m2<dy)){ return bd.emptyborder;}
			}
			else{
				var m1=2*(0.5-spc), m2=2*(0.5+spc);
				if(m1<dx && dx<m2 && m1<dy && dy<m2){ return bd.emptyborder;}
			}
		}

		if(dx<2-dy){	//左上
			if(dx>dy){ return bd.getb(bx  ,by-1);}	//左上＆右上 -> 上
			else     { return bd.getb(bx-1,by  );}	//左上＆左下 -> 左
		}
		else{	//右下
			if(dx>dy){ return bd.getb(bx+1,by  );}	//右下＆右上 -> 右
			else     { return bd.getb(bx,  by+1);}	//右下＆左下 -> 下
		}
		return bd.emptyborder;
	},

	isBorderMode : function(){
		if(this.mousestart){
			this.bordermode = !this.getpos(0.25).oncell();
		}
		return this.bordermode;
	},

	//---------------------------------------------------------------------------
	// mv.setcursor()    TargetCursorの場所を移動する
	// mv.setcursorpos() TargetCursorの場所を移動する
	//---------------------------------------------------------------------------
	setcursor : function(obj){
		var obj0 = this.cursor.getOBJ();
		this.cursor.setOBJ(obj);
		obj0.draw();
		obj.draw();
	},
	setcursorpos : function(pos){
		var pos0 = this.cursor.getTCP();
		this.cursor.setTCP(pos);
		pos0.draw();
		pos.draw();
	},

	//---------------------------------------------------------------------------
	// mv.inputcell() Cellのqans(回答データ)に0/1/2のいずれかを入力する。
	// mv.decIC()     0/1/2どれを入力すべきかを決定する。
	//---------------------------------------------------------------------------
	inputcell : function(){
		var cell = this.getcell();
		if(cell.isnull || cell===this.mouseCell){ return;}
		if(this.inputData===null){ this.decIC(cell);}

		this.mouseCell = cell;

		if(cell.numberIsWhite && cell.getQnum()!==-1 && (this.inputData===1||(this.inputData===2 && this.owner.painter.bcolor==="white"))){ return;}
		if(this.RBBlackCell && this.inputData===1){
			if(this.firstCell.isnull){ this.firstCell = cell;}
			var cell0 = this.firstCell;
			if(((cell0.bx&2)^(cell0.by&2))!==((cell.bx&2)^(cell.by&2))){ return;}
		}

		(this.inputData==1?cell.setBlack:cell.setWhite).call(cell);
		cell.setQsub(this.inputData===2?1:0);

		cell.draw();
	},
	decIC : function(cell){
		if(this.getConfig('use')==1){
			if     (this.btn.Left) { this.inputData=(cell.isWhite()  ? 1 : 0); }
			else if(this.btn.Right){ this.inputData=((cell.getQsub()!==1)? 2 : 0); }
		}
		else if(this.getConfig('use')==2){
			if(cell.numberIsWhite && cell.getQnum()!==-1){
				this.inputData=((cell.getQsub()!==1)? 2 : 0);
			}
			else if(this.btn.Left){
				if     (cell.isBlack())    { this.inputData=2;}
				else if(cell.getQsub()===1){ this.inputData=0;}
				else{ this.inputData=1;}
			}
			else if(this.btn.Right){
				if     (cell.isBlack())    { this.inputData=0;}
				else if(cell.getQsub()===1){ this.inputData=1;}
				else{ this.inputData=2;}
			}
		}
	},
	//---------------------------------------------------------------------------
	// mv.inputqnum()      Cellのqnum(数字データ)に数字を入力する
	// mv.inputqnum_main() Cellのqnum(数字データ)に数字を入力する(メイン処理)
	//---------------------------------------------------------------------------
	inputqnum : function(){
		var cell = this.getcell();
		if(cell.isnull || cell===this.mouseCell){ return;}

		if(cell!==this.cursor.getTCC()){
			this.setcursor(cell);
		}
		else{
			this.inputqnum_main(cell);
		}
		this.mouseCell = cell;
	},
	inputqnum_main : function(cell){
		var cell0=cell, o=this.owner, bd=o.board;
		if(o.editmode && bd.rooms.hastop){
			cell0 = cell = bd.rooms.getTopOfRoomByCell(cell);
		}
		else if(bd.linfo.moveline && this.getConfig('dispmove')){
			if(cell.isDestination()){ cell = cell.base;}
			else if(cell.lcnt()>0){ return;}
		}

		var subtype=0; // qsubを0～いくつまで入力可能かの設定
		if     (o.editmode)         { subtype =-1;}
		else if(cell.numberWithMB)  { subtype = 2;}
		else if(cell.numberAsObject){ subtype = 1;}
		if(o.pid==="roma" && o.playmode){ subtype=0;}

		if(o.playmode && cell.qnum!==o.Cell.prototype.qnum){ return;}

		var max=cell.nummaxfunc(), min=cell.numminfunc();
		var num=cell.getNum(), qs=(o.editmode ? 0 : cell.getQsub());
		var val=-1, ishatena=(o.editmode && !cell.disInputHatena);

		// playmode: subtypeは0以上、 qsにqsub値が入る
		// editmode: subtypeは-1固定、qsは常に0が入る
		if(this.btn.Left){
			if     (num>=max){ val = ((subtype>=1) ? -2 : -1);}
			else if(qs === 1){ val = ((subtype>=2) ? -3 : -1);}
			else if(qs === 2){ val = -1;}
			else if(num===-1){ val = (ishatena ? -2 : min);}
			else if(num< min){ val = min;}
			else             { val = num+1;}
		}
		else if(this.btn.Right){
			if     (qs === 1){ val = max;}
			else if(qs === 2){ val = -2;}
			else if(num===-1){
				if     (subtype===1){ val = -2;}
				else if(subtype===2){ val = -3;}
				else                { val = max;}
			}
			else if(num> max){ val = max;}
			else if(num<=min){ val = (ishatena ? -2 : -1);}
			else if(num===-2){ val = -1;}
			else             { val = num-1;}
		}
		cell.setNum(val);

		if(bd.linfo.moveline && this.getConfig('dispmove') && cell.noNum()){
				bd.linfo.eraseLineByCell(cell);		/* 丸数字がなくなったら付属する線も消去する */
		}

		cell0.draw();
	},

	//---------------------------------------------------------------------------
	// mv.inputQues() Cellのquesデータをarrayのとおりに入力する
	//---------------------------------------------------------------------------
	inputQues : function(array){
		var cell = this.getcell();
		if(cell.isnull){ return;}

		if(cell!==this.cursor.getTCC()){
			this.setcursor(cell);
		}
		else{
			this.inputQues_main(array,cell);
		}
	},
	inputQues_main : function(array,cell){
		var qu = cell.getQues(), len = array.length;
		if(this.btn.Left){
			for(var i=0;i<=len-1;i++){
				if(qu===array[i]){
					cell.setQues(array[((i<len-1)?i+1:0)]);
					break;
				}
			}
		}
		else if(this.btn.Right){
			for(var i=len-1;i>=0;i--){
				if(qu===array[i]){
					cell.setQues(array[((i>0)?i-1:len-1)]);
					break;
				}
			}
		}
		cell.draw();
	},

	//---------------------------------------------------------------------------
	// mv.inputMB()   Cellのqsub(補助記号)の○, ×データを入力する
	//---------------------------------------------------------------------------
	inputMB : function(){
		var cell = this.getcell();
		if(cell.isnull){ return;}

		cell.setQsub((this.btn.Left?[1,2,0]:[2,0,1])[cell.getQsub()]);
		cell.draw();
	},

	//---------------------------------------------------------------------------
	// mv.inputdirec()      Cellのdirec(方向)のデータを入力する
	// mv.inputarrow_cell() Cellの矢印を入力する
	// mv.getdir()          入力がどの方向になるか取得する
	//---------------------------------------------------------------------------
	inputdirec : function(){
		var pos = this.getpos(0);
		if(this.prevPos.equals(pos)){ return;}

		var cell = this.prevPos.getc();
		if(!cell.isnull){
			if(cell.getQnum()!==-1){
				var dir = this.getdir(this.prevPos, pos);
				if(dir!==k.NDIR){
					cell.setQdir(cell.getQdir()!==dir?dir:0);
					cell.draw();
				}
			}
		}
		this.prevPos = pos;
	},
	inputarrow_cell : function(){
		var pos = this.getpos(0);
		if(this.prevPos.equals(pos) && this.inputData===1){ return;}

		var dir = k.NDIR, cell = this.prevPos.getc();
		if(!cell.isnull){
			var dir = this.getdir(this.prevPos, pos);
			if(dir!==k.NDIR){
				if(cell.numberAsObject){ cell.setNum(dir);}
				else{ cell.setQdir(dir);}
				cell.draw();
				this.mousereset();
				return;
			}
		}
		this.prevPos = pos;
	},

	getdir : function(base, current){
		var dx = (current.bx-base.bx), dy = (current.by-base.by);
		if     (dx=== 0 && dy===-2){ return k.UP;}
		else if(dx=== 0 && dy=== 2){ return k.DN;}
		else if(dx===-2 && dy=== 0){ return k.LT;}
		else if(dx=== 2 && dy=== 0){ return k.RT;}
		return k.NDIR;
	},

	//---------------------------------------------------------------------------
	// mv.inputtile()  黒タイル、白タイルを入力する
	//---------------------------------------------------------------------------
	inputtile : function(){
		var cell = this.getcell();
		if(cell.isnull || cell.is51cell() || cell===this.mouseCell){ return;}
		if(this.inputData===null){ this.decIC(cell);}

		this.mouseCell = cell;
		var clist = this.owner.board.rooms.getClistByCell(cell);
		for(var i=0;i<clist.length;i++){
			var cell2 = clist[i];
			if(this.inputData===1 || cell2.getQsub()!==3){
				(this.inputData===1?cell2.setBlack:cell2.setWhite).call(cell2);
				cell2.setQsub(this.inputData==2?1:0);
			}
		}
		clist.draw();
	},

	//---------------------------------------------------------------------------
	// mv.input51()   [＼]を作ったり消したりする
	//---------------------------------------------------------------------------
	input51 : function(){
		var obj = this.getcell_excell();
		if(obj.isnull){ return;}

		if(obj.isexcell || (obj.iscell && obj!==this.cursor.getTCC())){
			this.setcursor(obj);
		}
		else if(obj.iscell){
			this.input51_main(obj);
		}
	},
	input51_main : function(cell){
		if(this.btn.Left){
			if(!cell.is51cell()){ cell.set51cell();}
			else{ this.cursor.chtarget('shift');}
		}
		else if(this.btn.Right){ cell.remove51cell();}

		cell.drawaround();
	},

	//---------------------------------------------------------------------------
	// mv.inputcross()     Crossのques(問題データ)に0～4を入力する。
	// mv.inputcrossMark() Crossの黒点を入力する。
	//---------------------------------------------------------------------------
	inputcross : function(){
		var cross = this.getcross();
		if(cross.isnull || cross===this.mouseCell){ return;}

		if(cross!==this.cursor.getTXC()){
			this.setcursor(cross);
		}
		else{
			this.inputcross_main(cross);
		}
		this.mouseCell = cross;
	},
	inputcross_main : function(cross){
		if(this.btn.Left){
			cross.setQnum(cross.getQnum()!==4 ? cross.getQnum()+1 : -2);
		}
		else if(this.btn.Right){
			cross.setQnum(cross.getQnum()!==-2 ? cross.getQnum()-1 : 4);
		}
		cross.draw();
	},
	inputcrossMark : function(){
		var pos = this.getpos(0.24);
		if(!pos.oncross()){ return;}
		var bd = this.owner.board, bm = (bd.hascross===2?0:2);
		if(pos.bx<bd.minbx+bm || pos.bx>bd.maxbx-bm || pos.by<bd.minby+bm || pos.by>bd.maxby-bm){ return;}

		var cross = pos.getx();
		if(cross.isnull){ return;}

		this.owner.opemgr.disCombine = true;
		cross.setQnum(cross.getQnum()===1?-1:1);
		this.owner.opemgr.disCombine = false;

		cross.draw();
	},
	//---------------------------------------------------------------------------
	// mv.inputborder()     盤面境界線のデータを入力する
	// mv.inputQsubLine()   盤面の境界線用補助記号を入力する
	//---------------------------------------------------------------------------
	inputborder : function(){
		var pos = this.getpos(0.35);
		if(this.prevPos.equals(pos)){ return;}

		var border = this.getborderobj(this.prevPos, pos);
		if(!border.isnull){
			if(this.inputData===null){ this.inputData=(border.isBorder()?0:1);}
			if     (this.inputData===1){ border.setBorder();}
			else if(this.inputData===0){ border.removeBorder();}
			border.draw();
		}
		this.prevPos = pos;
	},
	inputQsubLine : function(){
		var pos = this.getpos(0);
		if(this.prevPos.equals(pos)){ return;}

		var border = this.getnb(this.prevPos, pos);
		if(!border.isnull){
			if(this.inputData===null){ this.inputData=(border.getQsub()===0?1:0);}
			if     (this.inputData===1){ border.setQsub(1);}
			else if(this.inputData===0){ border.setQsub(0);}
			border.draw();
		}
		this.prevPos = pos;
	},

	//---------------------------------------------------------------------------
	// mv.inputLine()     盤面の線を入力する
	// mv.inputMoveLine() 移動系パズル向けに盤面の線を入力する
	//---------------------------------------------------------------------------
	inputLine : function(){
		if(this.owner.board.lines.isCenterLine){
			var pos = this.getpos(0);
			if(this.prevPos.equals(pos)){ return;}
			var border = this.getnb(this.prevPos, pos);
		}
		else{
			var pos = this.getpos(0.35);
			if(this.prevPos.equals(pos)){ return;}
			var border = this.getborderobj(this.prevPos, pos);
		}
		
		if(!border.isnull){
			if(this.inputData===null){ this.inputData=(border.isLine()?0:1);}
			if     (this.inputData===1){ border.setLine();}
			else if(this.inputData===0){ border.removeLine();}
			border.draw();
		}
		this.prevPos = pos;
	},
	inputMoveLine : function(){
		/* "ものを動かしたように描画する"でなければinputLineと同じ */
		if(!this.owner.board.linfo.moveline || !this.getConfig('dispmove')){
			this.inputLine();
			return;
		}
		
		var cell = this.getcell();
		if(cell.isnull){ return;}

		var cell0 = this.mouseCell, pos = cell.getaddr();
		/* 初回はこの中に入ってきます。 */
		if(this.mousestart && cell.isDestination()){
			this.mouseCell = cell;
			this.prevPos = pos;
			cell.draw();
		}
		/* 移動中の場合 */
		else if(this.mousemove && !cell0.isnull && !cell.isDestination()){
			var border = this.getnb(this.prevPos, pos);
			if(!border.isnull && ((!border.isLine() && cell.lcnt()===0) || (border.isLine() && cell0.lcnt()===1))){
				this.mouseCell = cell;
				this.prevPos = pos;
				if(!border.isLine()){ border.setLine();}else{ border.removeLine();}
				border.draw();
			}
		}
	},

	//---------------------------------------------------------------------------
	// mv.getnb()         上下左右に隣接する境界線のIDを取得する
	// mv.getborderobj()  入力対象となる境界線オブジェクトを取得する
	//---------------------------------------------------------------------------
	getnb : function(base, current){
		if     (current.bx-base.bx=== 0 && current.by-base.by===-2){ return base.rel(0,-1).getb();}
		else if(current.bx-base.bx=== 0 && current.by-base.by=== 2){ return base.rel(0, 1).getb();}
		else if(current.bx-base.bx===-2 && current.by-base.by=== 0){ return base.rel(-1,0).getb();}
		else if(current.bx-base.bx=== 2 && current.by-base.by=== 0){ return base.rel( 1,0).getb();}
		return this.owner.board.emptyborder;
	},
	getborderobj : function(base, current){
		if(((current.bx&1)===0 && base.bx===current.bx && Math.abs(base.by-current.by)===1) ||
		   ((current.by&1)===0 && base.by===current.by && Math.abs(base.bx-current.bx)===1) )
			{ return (base.onborder() ? base : current).getb();}
		return (new this.owner.BoardPiece());
	},

	//---------------------------------------------------------------------------
	// mv.inputpeke()   盤面の線が通らないことを示す×を入力する
	//---------------------------------------------------------------------------
	inputpeke : function(){
		var pos = this.getpos(0.22);
		if(this.prevPos.equals(pos)){ return;}

		var border = pos.getb();
		if(!border.isnull){
			if(this.inputData===null){ this.inputData=(border.getQsub()===0?2:3);}
			if(this.inputData===2 && border.isLine() && this.owner.board.linfo.moveline && this.getConfig('dispmove')){}
			else if(this.inputData===2){ border.setPeke();}
			else if(this.inputData===3){ border.removeLine();}
			border.draw();
		}
		this.prevPos = pos;
	},

	//---------------------------------------------------------------------------
	// mv.dispRed()  ひとつながりの黒マスを赤く表示する
	// mv.dispRed8() ななめつながりの黒マスを赤く表示する
	// mv.dispRedLine()   ひとつながりの線を赤く表示する
	//---------------------------------------------------------------------------
	dispRed : function(){
		var cell = this.getcell();
		this.mousereset();
		if(cell.isnull || !cell.isBlack()){ return;}
		if(!this.RBBlackCell){ this.owner.board.bcell.getClistByCell(cell).setinfo(1);}
		else{ this.dispRed8(cell);}
		this.owner.board.haserror = true;
		this.owner.redraw();
	},
	dispRed8 : function(cell0){
		var stack=[cell0];
		while(stack.length>0){
			var cell = stack.pop();
			if(cell.qinfo!==0){ continue;}

			cell.setinfo(1);
			var bx=cell.bx, by=cell.by, clist=this.owner.board.cellinside(bx-2,by-2,bx+2,by+2);
			for(var i=0;i<clist.length;i++){
				var cell2 = clist[i];
				if(cell2.qinfo===0 && cell2.isBlack()){ stack.push(cell2);}
			}
		}
	},

	dispRedLine : function(){
		var bd = this.owner.board, border = this.getborder(0.15);
		this.mousereset();
		if(border.isnull){ return;}

		if(!border.isLine()){
			var obj = (!bd.lines.borderAsLine ? this.getcell() : this.getcross());
			if(obj.isnull || (obj.iscrossing() && (obj.lcnt()===3 || obj.lcnt()===4))){ return;}
			if     (obj.lb().isLine()){ border = obj.lb();}
			else if(obj.rb().isLine()){ border = obj.rb();}
			else if(obj.ub().isLine()){ border = obj.ub();}
			else if(obj.db().isLine()){ border = obj.db();}
			else{ return;}
		}
		if(border.isnull){ return;}

		var blist = bd.lines.getBlistByBorder(border);
		bd.border.setinfo(-1);
		blist.setinfo(1);
		bd.haserror = true;
		this.owner.redraw();
	}
});
