// Answer.js v3.2.4p4

//---------------------------------------------------------------------------
// ★AnsCheckクラス 答えチェック関連の関数を扱う
//---------------------------------------------------------------------------

// 回答チェッククラス
// AnsCheckクラス
AnsCheck = function(){
	this.performAsLine = false;
	this.errDisp = false;
	this.setError = true;
	this.inCheck = false;
	this.inAutoCheck = false;
	this.alstr = { jp:'' ,en:''};
};
AnsCheck.prototype = {

	//---------------------------------------------------------------------------
	// ans.check()     答えのチェックを行う(checkAns()を呼び出す)
	// ans.checkAns()  答えのチェックを行う(オーバーライド用)
	// ans.check1st()  オートチェック時に初めに判定を行う(オーバーライド用)
	// ans.setAlert()  check()から戻ってきたときに返す、エラー内容を表示するalert文を設定する
	//---------------------------------------------------------------------------
	check : function(){
		this.inCheck = true;
		this.alstr = { jp:'' ,en:''};
		kc.keyreset();
		mv.mousereset();

		if(!this.checkAns()){
			alert((menu.isLangJP()||!this.alstr.en)?this.alstr.jp:this.alstr.en);
			this.errDisp = true;
			pc.paintAll();
			this.inCheck = false;
			return false;
		}

		alert(menu.isLangJP()?"正解です！":"Complete!");
		this.inCheck = false;
		return true;
	},
	checkAns : function(){},	//オーバーライド用
	//check1st : function(){},	//オーバーライド用
	setAlert : function(strJP, strEN){ this.alstr.jp = strJP; this.alstr.en = strEN;},

	//---------------------------------------------------------------------------
	// ans.autocheck()    答えの自動チェックを行う(alertがでなかったり、エラー表示を行わない)
	// ans.autocheck1st() autocheck前に、軽い正答判定を行う
	//
	// ans.disableSetError()  盤面のオブジェクトにエラーフラグを設定できないようにする
	// ans.enableSetError()   盤面のオブジェクトにエラーフラグを設定できるようにする
	// ans.isenableSetError() 盤面のオブジェクトにエラーフラグを設定できるかどうかを返す
	//---------------------------------------------------------------------------
	autocheck : function(){
		if(!k.autocheck || k.editmode || this.inCheck){ return;}

		var ret = false;

		this.inCheck = this.inAutoCheck = true;
		this.disableSetError();

		if(this.autocheck1st() && this.checkAns() && this.inCheck){
			mv.mousereset();
			alert(menu.isLangJP()?"正解です！":"Complete!");
			ret = true;
			pp.setVal('autocheck',false);
		}
		this.enableSetError();
		this.inCheck = this.inAutoCheck = false;

		return ret;
	},
	// リンク系は重いので最初に端点を判定する
	autocheck1st : function(){
		if(this.check1st){ return this.check1st();}
		else if( (k.isCenterLine && !ans.checkLcntCell(1)) || (k.isborderAsLine && !ans.checkLcntCross(1,0)) ){ return false;}
		return true;
	},

	disableSetError  : function(){ this.setError = false;},
	enableSetError   : function(){ this.setError = true; },
	isenableSetError : function(){ return this.setError; },

	//---------------------------------------------------------------------------
	// ans.checkdir4Cell()     上下左右4方向で条件func==trueになるマスの数をカウントする
	// ans.setErrLareaByCell() ひとつながりになった線が存在するマスにエラーを設定する
	// ans.setErrLareaById()   ひとつながりになった線が存在するマスにエラーを設定する
	//---------------------------------------------------------------------------
	checkdir4Cell : function(cc, func){
		if(cc<0 || cc>=bd.cellmax){ return 0;}
		var cnt = 0;
		if(bd.up(cc)!=-1 && func(bd.up(cc))){ cnt++;}
		if(bd.dn(cc)!=-1 && func(bd.dn(cc))){ cnt++;}
		if(bd.lt(cc)!=-1 && func(bd.lt(cc))){ cnt++;}
		if(bd.rt(cc)!=-1 && func(bd.rt(cc))){ cnt++;}
		return cnt;
	},

	setErrLareaByCell : function(cinfo, c, val){ this.setErrLareaById(cinfo, cinfo.id[c], val); },
	setErrLareaById : function(cinfo, areaid, val){
		var blist = [];
		for(var id=0;id<bd.bdmax;id++){
			if(!bd.isLine(id)){ continue;}
			var cc1 = bd.cc1(id), cc2 = bd.cc2(id);
			if(cc1!=-1 && cc2!=-1 && cinfo.id[cc1]==areaid && cinfo.id[cc1]==cinfo.id[cc2]){ blist.push(id);}
		}
		bd.sErB(blist,val);

		var clist = [];
		for(var c=0;c<bd.cellmax;c++){ if(cinfo.id[c]==areaid && bd.QnC(c)!=-1){ clist.push(c);} }
		bd.sErC(clist,4);
	},

	//---------------------------------------------------------------------------
	// ans.checkAllCell()   条件func==trueになるマスがあったらエラーを設定する
	// ans.checkOneArea()   白マス/黒マス/線がひとつながりかどうかを判定する
	// ans.check2x2Block()  2x2のセルが全て条件func==trueの時、エラーを設定する
	// ans.checkSideCell()  隣り合った2つのセルが条件func==trueの時、エラーを設定する
	//---------------------------------------------------------------------------
	checkAllCell : function(func){
		var result = true;
		for(var c=0;c<bd.cellmax;c++){
			if(func(c)){
				if(this.inAutoCheck){ return false;}
				bd.sErC([c],1); result = false;
			}
		}
		return result;
	},
	checkOneArea : function(cinfo){
		if(cinfo.max>1){
			if(this.performAsLine){ bd.sErBAll(2); this.setErrLareaByCell(cinfo,1,1); }
			if(!this.performAsLine || k.puzzleid=="firefly"){ bd.sErC(cinfo.room[1].idlist,1);}
			return false;
		}
		return true;
	},
	check2x2Block : function(func){
		var result = true;
		for(var c=0;c<bd.cellmax;c++){
			if(bd.cell[c].cx<k.qcols-1 && bd.cell[c].cy<k.qrows-1){
				if( func(c) && func(c+1) && func(c+k.qcols) && func(c+k.qcols+1) ){
					if(this.inAutoCheck){ return false;}
					bd.sErC([c,c+1,c+k.qcols,c+k.qcols+1],1);
					result = false;
				}
			}
		}
		return result;
	},
	checkSideCell : function(func){
		var result = true;
		for(var c=0;c<bd.cellmax;c++){
			if(bd.cell[c].cx<k.qcols-1 && func(c,c+1)){
				if(this.inAutoCheck){ return false;}
				bd.sErC([c,c+1],1); result = false;
			}
			if(bd.cell[c].cy<k.qrows-1 && func(c,c+k.qcols)){
				if(this.inAutoCheck){ return false;}
				bd.sErC([c,c+k.qcols],1); result = false;
			}
		}
		return result;
	},

	//---------------------------------------------------------------------------
	// ans.checkAreaRect()  すべてのfuncを満たすマスで構成されるエリアが四角形であるかどうか判定する
	// ans.checkAllArea()   すべてのfuncを満たすマスで構成されるエリアがサイズ条件func2を満たすかどうか判定する
	// ans.getSizeOfClist() 指定されたCellのリストの上下左右の端と、その中で条件funcを満たすセルの大きさを返す
	//---------------------------------------------------------------------------
	checkAreaRect : function(cinfo, func){ return this.checkAllArea(cinfo, func, function(w,h,a){ return (w*h==a)}); },
	checkAllArea : function(cinfo, func, func2){
		var result = true;
		for(var id=1;id<=cinfo.max;id++){
			var d = this.getSizeOfClist(cinfo.room[id].idlist,func);
			if(!func2(d.x2-d.x1+1, d.y2-d.y1+1, d.cnt)){
				if(this.inAutoCheck){ return false;}
				bd.sErC(cinfo.room[id].idlist,1);
				result = false;
			}
		}
		return result;
	},
	getSizeOfClist : function(clist, func){
		var d = { x1:k.qcols, x2:-1, y1:k.qrows, y2:-1, cnt:0 };
		for(var i=0;i<clist.length;i++){
			if(d.x1>bd.cell[clist[i]].cx){ d.x1=bd.cell[clist[i]].cx;}
			if(d.x2<bd.cell[clist[i]].cx){ d.x2=bd.cell[clist[i]].cx;}
			if(d.y1>bd.cell[clist[i]].cy){ d.y1=bd.cell[clist[i]].cy;}
			if(d.y2<bd.cell[clist[i]].cy){ d.y2=bd.cell[clist[i]].cy;}
			if(func(clist[i])){ d.cnt++;}
		}
		return d;
	},

	//---------------------------------------------------------------------------
	// ans.checkQnumCross()  crossが条件func==falseの時、エラーを設定する
	//---------------------------------------------------------------------------
	checkQnumCross : function(func){	//func(cr,bcnt){} -> エラーならfalseを返す関数にする
		for(var c=0;c<bd.crossmax;c++){
			if(bd.QnX(c)<0){ continue;}
			if(!func(bd.QnX(c), bd.bcntCross(bd.cross[c].cx, bd.cross[c].cy))){
				bd.sErX([c],1);
				return false;
			}
		}
		return true;
	},

	//---------------------------------------------------------------------------
	// ans.checkOneLoop()  交差あり線が一つかどうか判定する
	// ans.checkLcntCell() セルから出ている線の本数について判定する
	// ans.isLineStraight()   セルの上で線が直進しているか判定する
	// ans.setCellLineError() セルと周りの線にエラーフラグを設定する
	//---------------------------------------------------------------------------
	checkOneLoop : function(){
		var xinfo = line.getLineInfo();
		if(xinfo.max>1){
			bd.sErBAll(2);
			bd.sErB(xinfo.room[1].idlist,1);
			return false;
		}
		return true;
	},

	checkLcntCell : function(val){
		var result = true;
		if(line.ltotal[val]==0){ return true;}
		for(var c=0;c<bd.cellmax;c++){
			if(line.lcnt[c]==val){
				if(this.inAutoCheck){ return false;}
				if(!this.performAsLine){ bd.sErC([c],1);}
				else{ if(result){ bd.sErBAll(2);} this.setCellLineError(c,true);}
				result = false;
			}
		}
		return result;
	},

	isLineStraight : function(cc){
		if     (bd.isLine(bd.ub(cc)) && bd.isLine(bd.db(cc))){ return true;}
		else if(bd.isLine(bd.lb(cc)) && bd.isLine(bd.rb(cc))){ return true;}

		return false;
	},

	setCellLineError : function(cc, flag){
		if(flag){ bd.sErC([cc],1);}
		bd.sErB([bd.ub(cc),bd.db(cc),bd.lb(cc),bd.rb(cc)], 1);
	},

	//---------------------------------------------------------------------------
	// ans.checkdir4Border()  セルの周り四方向に惹かれている境界線の本数を判定する
	// ans.checkdir4Border1() セルの周り四方向に惹かれている境界線の本数を返す
	// ans.checkenableLineParts() '一部があかされている'線の部分に、線が引かれているか判定する
	//---------------------------------------------------------------------------
	checkdir4Border : function(){
		var result = true;
		for(var c=0;c<bd.cellmax;c++){
			if(bd.QnC(c)>=0 && this.checkdir4Border1(c)!=bd.QnC(c)){
				if(this.inAutoCheck){ return false;}
				bd.sErC([c],1);
				result = false;
			}
		}
		return result;
	},
	checkdir4Border1 : function(cc){
		if(cc<0 || cc>=bd.cellmax){ return 0;}
		var cnt = 0;
		var cx = bd.cell[cc].cx; var cy = bd.cell[cc].cy;
		if( (k.isoutsideborder==0 && cy==0        ) || bd.isBorder(bd.bnum(cx*2+1,cy*2  )) ){ cnt++;}
		if( (k.isoutsideborder==0 && cy==k.qrows-1) || bd.isBorder(bd.bnum(cx*2+1,cy*2+2)) ){ cnt++;}
		if( (k.isoutsideborder==0 && cx==0        ) || bd.isBorder(bd.bnum(cx*2  ,cy*2+1)) ){ cnt++;}
		if( (k.isoutsideborder==0 && cx==k.qcols-1) || bd.isBorder(bd.bnum(cx*2+2,cy*2+1)) ){ cnt++;}
		return cnt;
	},

	checkenableLineParts : function(val){
		var result = true;
		var func = function(i){
			return ((bd.ub(i)!=-1 && bd.isLine(bd.ub(i)) && bd.isnoLPup(i)) ||
					(bd.db(i)!=-1 && bd.isLine(bd.db(i)) && bd.isnoLPdown(i)) ||
					(bd.lb(i)!=-1 && bd.isLine(bd.lb(i)) && bd.isnoLPleft(i)) ||
					(bd.rb(i)!=-1 && bd.isLine(bd.rb(i)) && bd.isnoLPright(i)) ); };
		for(var i=0;i<bd.cellmax;i++){
			if(func(i)){
				if(this.inAutoCheck){ return false;}
				bd.sErC([i],1); result = false;
			}
		}
		return result;
	},

	//---------------------------------------------------------------------------
	// ans.checkOneNumber()      部屋の中のfunc==trueを満たすCellの数がeval()==trueかどうかを調べる
	//                           部屋のfunc==trueになるセルの数の判定、部屋にある数字と黒マスの数の比較、
	//                           白マスの面積と入っている数字の比較などに用いられる
	// ans.checkBlackCellCount() 領域内の数字と黒マスの数が等しいか判定する
	// ans.checkDisconnectLine() 数字などに繋がっていない線の判定を行う
	// ans.checkNumberAndSize()  エリアにある数字と面積が等しいか判定する
	// ans.checkQnumsInArea()    部屋に数字がいくつ含まれているかの判定を行う
	// ans.checkBlackCellInArea()部屋にある黒マスの数の判定を行う
	// ans,checkNoObjectInRoom() エリアに指定されたオブジェクトがないと判定する
	//
	// ans.getQnumCellInArea()   部屋の中で一番左上にある数字を返す
	// ans.getCntOfRoom()        部屋の面積を返す
	// ans.getCellsOfRoom()      部屋の中でfunc==trueとなるセルの数を返す
	//---------------------------------------------------------------------------
	checkOneNumber : function(cinfo, evalfunc, func){
		var result = true;
		for(var id=1;id<=cinfo.max;id++){
			var top = bd.QnC(k.isOneNumber ? area.getTopOfRoomByCell(cinfo.room[id].idlist[0]) : this.getQnumCellInArea(cinfo,id));
			if( evalfunc(top, this.getCellsOfRoom(cinfo, id, func)) ){
				if(this.inAutoCheck){ return false;}
				if(this.performAsLine){ if(result){ bd.sErBAll(2);} this.setErrLareaById(cinfo,id,1);}
				else{ bd.sErC(cinfo.room[id].idlist,(k.puzzleid!="tateyoko"?1:4));}
				result = false;
			}
		}
		return result;
	},
	checkBlackCellCount  : function(cinfo)          { return this.checkOneNumber(cinfo, function(top,cnt){ return (top>=0 && top!=cnt);}, bd.isBlack);},
	checkDisconnectLine  : function(cinfo)          { return this.checkOneNumber(cinfo, function(top,cnt){ return (top==-1 && cnt==0); }, bd.isNum  );},
	checkNumberAndSize   : function(cinfo)          { return this.checkOneNumber(cinfo, function(top,cnt){ return (top> 0 && top!=cnt);}, f_true    );},
	checkQnumsInArea     : function(cinfo, func)    { return this.checkOneNumber(cinfo, function(top,cnt){ return func(cnt);},            bd.isNum  );},
	checkBlackCellInArea : function(cinfo, func)    { return this.checkOneNumber(cinfo, function(top,cnt){ return func(cnt);},            bd.isBlack);},
	checkNoObjectInRoom  : function(cinfo, getvalue){ return this.checkOneNumber(cinfo, function(top,cnt){ return (cnt==0); },            function(c){ return getvalue(c)!=-1;} );},

	getQnumCellInArea : function(cinfo, areaid){
		var idlist = cinfo.room[areaid].idlist;
		for(var i=0,len=idlist.length;i<len;i++){
			if(bd.QnC(idlist[i])!=-1){ return idlist[i];}
		}
		return -1;
	},
	getCntOfRoom : function(cinfo, areaid){
		return cinfo.room[areaid].idlist.length;
	},
	getCellsOfRoom : function(cinfo, areaid, func){
		var cnt=0, idlist = cinfo.room[areaid].idlist;
		for(var i=0,len=idlist.length;i<len;i++){ if(func(idlist[i])){ cnt++;}}
		return cnt;
	},

	//---------------------------------------------------------------------------
	// ans.checkSideAreaSize()     境界線をはさんで接する部屋のgetvalで得られるサイズが異なることを判定する
	// ans.checkSideAreaCell()     境界線をはさんでタテヨコに接するセルの判定を行う
	// ans.checkSeqBlocksInRoom()  部屋の中限定で、黒マスがひとつながりかどうか判定する
	// ans.checkSameObjectInRoom() 部屋の中にgetvalueで複数種類の値が得られることを判定する
	// ans.checkObjectRoom()       getvalueで同じ値が得られるセルが、複数の部屋の分散しているか判定する
	//---------------------------------------------------------------------------
	checkSideAreaSize : function(rinfo, getval){
		var adjs = [];
		for(var r=1;r<=rinfo.max-1;r++){
			adjs[r] = [];
			for(var s=r+1;s<=rinfo.max;s++){ adjs[r][s]=0;}
		}

		for(var id=0;id<bd.bdmax;id++){
			if(!bd.isBorder(id)){ continue;}
			var cc1=bd.cc1(id), cc2=bd.cc2(id);
			if(cc1==-1 || cc2==-1){ continue;}
			var r1=rinfo.id[cc1], r2=rinfo.id[cc2];
			try{
				if(r1<r2){ adjs[r1][r2]++;}
				if(r1>r2){ adjs[r2][r1]++;}
			}catch(e){ alert([r1,r2]); throw 0;}
		}

		for(var r=1;r<=rinfo.max-1;r++){
			for(var s=r+1;s<=rinfo.max;s++){
				if(adjs[r][s]==0){ continue;}
				var a1=getval(rinfo,r), a2=getval(rinfo,s);
				if(a1>0 && a2>0 && a1==a2){
					bd.sErC(rinfo.room[r].idlist,1);
					bd.sErC(rinfo.room[s].idlist,1);
					return false;
				}
			}
		}

		return true;
	},

	checkSideAreaCell : function(rinfo, func, flag){
		for(var id=0;id<bd.bdmax;id++){
			if(!bd.isBorder(id)){ continue;}
			var cc1 = bd.cc1(id), cc2 = bd.cc2(id);
			if(cc1!=-1 && cc2!=-1 && func(cc1, cc2)){
				if(!flag){ bd.sErC([cc1,cc2],1);}
				else{ bd.sErC(area.room[area.room.id[cc1]].clist,1); bd.sErC(area.room[area.room.id[cc2]].clist,1); }
				return false;
			}
		}
		return true;
	},

	checkSeqBlocksInRoom : function(){
		var result = true;
		for(var id=1;id<=area.room.max;id++){
			var data = {max:0,id:[]};
			for(var c=0;c<bd.cellmax;c++){ data.id[c] = ((area.room.id[c]==id && bd.isBlack(c))?0:-1);}
			for(var c=0;c<k.qcols*k.qrows;c++){
				if(data.id[c]!=0){ continue;}
				data.max++;
				data[data.max] = {clist:[]};
				area.sc0(c, data);
			}
			if(data.max>1){
				if(this.inAutoCheck){ return false;}
				bd.sErC(area.room[id].clist,1);
				result = false;
			}
		}
		return result;
	},

	checkSameObjectInRoom : function(rinfo, getvalue){
		var result = true;
		var d = [];
		for(var i=1;i<=rinfo.max;i++){ d[i]=-1;}
		for(var c=0;c<bd.cellmax;c++){
			if(rinfo.id[c]==-1 || getvalue(c)==-1){ continue;}
			if(d[rinfo.id[c]]==-1 && getvalue(c)!=-1){ d[rinfo.id[c]] = getvalue(c);}
			else if(d[rinfo.id[c]]!=getvalue(c)){
				if(this.inAutoCheck){ return false;}

				if(this.performAsLine){ bd.sErBAll(2); this.setErrLareaByCell(rinfo,c,1);}
				else{ bd.sErC(rinfo.room[rinfo.id[c]].idlist,1);}
				if(k.puzzleid=="kaero"){
					for(var cc=0;cc<bd.cellmax;cc++){
						if(rinfo.id[c]==rinfo.id[cc] && this.getBeforeCell(cc)!=-1 && rinfo.id[c]!=rinfo.id[this.getBeforeCell(cc)]){
							bd.sErC([this.getBeforeCell(cc)],4);
						}
					}
				}
				result = false;
			}
		}
		return result;
	},
	checkObjectRoom : function(rinfo, getvalue){
		var d = [];
		var dmax = 0;
		for(var c=0;c<bd.cellmax;c++){ if(dmax<getvalue(c)){ dmax=getvalue(c);} }
		for(var i=0;i<=dmax;i++){ d[i]=-1;}
		for(var c=0;c<bd.cellmax;c++){
			if(getvalue(c)==-1){ continue;}
			if(d[getvalue(c)]==-1){ d[getvalue(c)] = rinfo.id[c];}
			else if(d[getvalue(c)]!=rinfo.id[c]){
				var clist = [];
				for(var cc=0;cc<bd.cellmax;cc++){
					if(k.puzzleid=="kaero"){ if(getvalue(c)==bd.QnC(cc)){ clist.push(cc);}}
					else{ if(rinfo.id[c]==rinfo.id[cc] || d[getvalue(c)]==rinfo.id[cc]){ clist.push(cc);} }
				}
				bd.sErC(clist,1);
				return false;
			}
		}
		return true;
	},

	//---------------------------------------------------------------------------
	// ans.checkRowsCols()            タテ列・ヨコ列の数字の判定を行う
	// ans.checkRowsColsPartly()      黒マスや[＼]等で分かれるタテ列・ヨコ列の数字の判定を行う
	// ans.isDifferentNumberInClist() clistの中に同じ数字が存在するか判定する
	//---------------------------------------------------------------------------
	checkRowsCols : function(evalfunc, numfunc){
		var result = true;
		for(var cy=0;cy<k.qrows;cy++){
			var clist = bd.getClistByPosition(0,cy,k.qcols-1,cy);
			if(!evalfunc.apply(this,[clist, numfunc])){
				if(this.inAutoCheck){ return false;}
				result = false;
			}
		}
		for(var cx=1;cx<k.qcols;cx++){
			var clist = bd.getClistByPosition(cx,0,cx,k.qrows-1);
			if(!evalfunc.apply(this,[clist, numfunc])){
				if(this.inAutoCheck){ return false;}
				result = false;
			}
		}
		return result;
	},
	checkRowsColsPartly : function(evalfunc, areainfo, termfunc, multierr){
		var result = true;
		for(var cy=0;cy<k.qrows;cy++){
			var cx=0;
			while(cx<k.qcols){
				for(var tx=cx;tx<k.qcols;tx++){ if(termfunc.apply(this,[bd.cnum(tx,cy)])){ break;}}
				var clist = bd.getClistByPosition(cx,cy,tx-1,cy);
				var total = (k.isextendcell!=1 ? 0 : (cx==0 ? bd.QnE(bd.exnum(-1,cy)) : bd.QnC(bd.cnum(cx-1,cy))));

				if(!evalfunc.apply(this,[total, clist, areainfo])){
					if(!multierr || this.inAutoCheck){ return false;}
					result = false;
				}
				cx = tx+1;
			}
		}
		for(var cx=0;cx<k.qcols;cx++){
			var cy=0;
			while(cy<k.qrows){
				for(var ty=cy;ty<k.qrows;ty++){ if(termfunc.apply(this,[bd.cnum(cx,ty)])){ break;}}
				var clist = bd.getClistByPosition(cx,cy,cx,ty-1);
				var total = (k.isextendcell!=1 ? 0 : (cy==0 ? bd.DiE(bd.exnum(cx,-1)) : bd.DiC(bd.cnum(cx,cy-1))));

				if(!evalfunc.apply(this,[total, clist, areainfo])){
					if(!multierr || this.inAutoCheck){ return false;}
					result = false;
				}
				cy = ty+1;
			}
		}
		return result;
	},

	isDifferentNumberInClist : function(clist, numfunc){
		var result = true, d = [], num = [], bottom = (!!k.dispzero?1:0);
		for(var n=bottom,max=bd.nummaxfunc(clist[0]);n<=max;n++){ d[n]=0;}
		for(var i=0;i<clist.length;i++){ num[clist[i]] = numfunc.apply(bd,[clist[i]]);}

		for(var i=0;i<clist.length;i++){ if(num[clist[i]]>=bottom){ d[num[clist[i]]]++;} }
		for(var i=0;i<clist.length;i++){
			if(num[clist[i]]>=bottom && d[num[clist[i]]]>=2){ bd.sErC([clist[i]],1); result = false;}
		}
		return result;
	},

	//---------------------------------------------------------------------------
	// ans.checkLcntCross()      ある交点との周り四方向の境界線の数を判定する(bp==1:黒点が打たれている場合)
	// ans.setCrossBorderError() ある交点とその周り四方向にエラーフラグを設定する
	//---------------------------------------------------------------------------
	checkLcntCross : function(val, bp){
		var result = true;
		for(var i=0;i<(k.qcols+1)*(k.qrows+1);i++){
			var cx = i%(k.qcols+1), cy = mf(i/(k.qcols+1));
			if(k.isoutsidecross==0 && k.isborderAsLine==0 && (cx==0||cy==0||cx==k.qcols||cy==k.qrows)){ continue;}
			var lcnts = (!k.isborderAsLine?area.lcnt[i]:line.lcnt[i]);
			if(lcnts==val && (bp==0 || (bp==1&&bd.QnX(bd.xnum(cx, cy))==1) || (bp==2&&bd.QnX(bd.xnum(cx, cy))!=1) )){
				if(this.inAutoCheck){ return false;}
				if(result){ bd.sErBAll(2);}
				this.setCrossBorderError(cx,cy);
				result = false;
			}
		}
		return result;
	},
	setCrossBorderError : function(cx,cy){
		if(k.iscross){ bd.sErX([bd.xnum(cx, cy)], 1);}
		bd.sErB([bd.bnum(cx*2,cy*2-1),bd.bnum(cx*2,cy*2+1),bd.bnum(cx*2-1,cy*2),bd.bnum(cx*2+1,cy*2)], 1);
	}
};
