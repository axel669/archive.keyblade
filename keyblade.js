(function(window){
	"use strict";
	/*
		key codes for special keys (keys with a special function)
	*/
	var special={
		8:'backspace',
		9:'tab',
		13:'enter',
		16:'shift',
		17:'ctrl',
		18:'alt',
		20:'capslock',
		27:'esc',
		32:'space',
		33:'pageup',
		34:'pagedown',
		35:'end',
		36:'home',
		37:'left',
		38:'up',
		39:'right',
		40:'down',
		45:'ins',
		46:'del',
		91:'meta',
		93:'meta',
		144:'numlock',
		145:'scrlock',
		224:'meta'
	};
	/*
		key codes for keys that arent alpha numeric or alpha numeric + shift
	*/
	var symbols={
		96:'numpad0',
		97:'numpad1',
		98:'numpad2',
		99:'numpad3',
		100:'numpad4',
		101:'numpad5',
		102:'numpad6',
		103:'numpad7',
		104:'numpad8',
		105:'numpad9',
		106:'numpad*',
		107:'numpad+',
		109:'numpad-',
		110:'numpad.',
		111:'numpad/',
		186:';',
		187:'=',
		188:',',
		189:'-',
		190:'.',
		191:'/',
		192:'`',
		219:'[',
		220:'\\',
		221:']',
		222:'\''
	};
	/*
		used to replace these chars with key+shift in key combos
	*/
	var shifty={
		"_":'-',
		"+":'=',
		"{":'[',
		"}":']',
		":":';',
		'"':"'",
		"|":'\\',
		"<":',',
		">":'.',
		"?":'/',
		"~":'`',
		"!":'1',
		"@":'2',
		"#":'3',
		"$":'4',
		"%":'5',
		"^":'6',
		"&":'7',
		"*":'8',
		"(":'9',
		")":'0'
	};
	/*
		setting a few more vars for internal use
	*/
	var ignore={16:null,17:null,18:null,91:null,93:null,224:null};
	var symbol_keys=Object.keys(shifty);
	for(var x=65;x<91;++x)
		shifty[String.fromCharCode(x)]=String.fromCharCode(x+32);
	for(var x=0;x<12;++x)
		special[x+112]='f'+(x+1);
	var shift_regex=new RegExp("(^| )(\\"+symbol_keys.join("|\\")+")|(\\b[A-Z])\\b",'g');
	var os_key=/Mac|iPod|iPhone|iPad/.test(navigator.platform)?'meta':'ctrl';
	var bound={};
	var binds=[];
	var settings={
		resetTime:600
	};
	
	/*
		used to see if keystrokes match any of the current combos
	*/
	function is_equal(a,b)
	{
		"use strict";
		if(a.length!==b.length) return false;
		for(var x=0;x<a.length;++x)
			if(a[x]!==b[x])
				return false;
		return true;
	}
	
	/*
		simple class to hold the keystrokes of a combo
		also handles firing the events for combos that are entered
	*/
	function KeyCombo(input,keys,callback)
	{
		this.keys=keys;
		this.last_time=0;
		this.index=0;
		this.callback=callback;
		this.input=input;
	}
	KeyCombo.prototype.check=function(key,event){
		"use strict";
		if(event.timeStamp-this.last_time>settings.resetTime)
			this.index=0;
		this.last_time=event.timeStamp;
		if(is_equal(this.keys[this.index],key))
			++this.index;
		else
			this.index=0;
		if(this.index===this.keys.length)
		{
			var res=this.callback(event,this.input);
			this.index=0;
			if(res===false)
			{
				event.preventDefault();
				return false;
			}
		}
		return event;
	};
	
	/*
		gets an array of keystrokes from a string of them
	*/
	function get_combo(keys)
	{
		"use strict";
		var translated=keys.replace(shift_regex,function(s,s2,s3,s4){return (s2||"")+"shift+"+shifty[s3||s4];}).replace(/\bos\b/g,os_key);
		keys=translated.split(' ');
		for(var x=0;x<keys.length;++x)
		{
			keys[x]=keys[x].split("+");
			keys[x].sort();
		}
		return [translated,keys];
	}
	/*
		gets the key + modifier keys pushed for a single event (doesnt have to be
			a real KeyboardEvent)
	*/
	function get_keys(event)
	{
		"use strict";
		var code=event.keyCode;
		var key=[];
		if(special.hasOwnProperty(code))
			key.push(special[code]);
		if(symbols.hasOwnProperty(code))
			key.push(symbols[code]);
		if(key.length===0)
			key.push(String.fromCharCode(code).toLowerCase());
		
		if(event.ctrlKey && key[0]!=='ctrl') key.push("ctrl");
		if(event.shiftKey && key[0]!=='shift') key.push("shift");
		if(event.altKey && key[0]!=='alt') key.push("alt");
		if(event.metaKey && key[0]!=='meta') key.push("meta");
		
		key.sort();
		return key;
	}
	
	/*
		handler for keydown is attached to the window so that all events are caught regardless of what element has focus
	*/
	window.addEventListener('keydown',function(event){
		"use strict";
		var tag=(event.target.tagName||"").toLowerCase();
		
		//	if inside an editable element that does not have data-allow-bindings set, ignore the event
		if((tag==="textarea" || tag==="input" || tag==="select" || event.target.isContentEditable) && event.target.getAttributeNS(null,"data-allow-bindings")===null)
			return event;
		
		var code=event.keyCode;
		var res=event;
		if(!ignore.hasOwnProperty(code))
		{
			var k=get_keys(event);
			for(var x=0;x<binds.length;++x)
				res=res && binds[x].check(k,event);
		}
		if(res===false)
		{
			event.preventDefault();
			return false;
		}
		return event;
	});
	
	var to_s=Object.prototype.toString;
	/*
		binds a callback to a list of keystrokes
	*/
	function bind(keys,f)
	{
		"use strict";
		if(to_s.call(keys)!=="[object Array]")
			keys=[keys];
		for(var x=0;x<keys.length;++x)
		{
			var info=get_combo(keys[x]);
			if(bound.hasOwnProperty(info[0]))
			{
				console.log("Binding already in use:",info[0]);
				continue;
			}
			var binding=new KeyCombo(info[0],info[1],f);
			bound[info[0]]=binding;
			binds.push(binding);
		}
	}
	function bindWord(words,f)
	{
		"use strict";
		if(to_s.call(words)!=="[object Array]")
			words=[words];
		for(var x=0;x<words.length;++x)
			words[x]=words[x].split('').join(' ');
		bind.call(null,words,f);
	}
	/*
		unbinds a callback from a list of keystrokes
	*/
	function unbind(keys)
	{
		"use strict";
		if(to_s.call(keys)!=="[object Array]")
			keys=[keys];
		for(var x=0;x<keys.length;++x)
		{
			var info=get_combo(keys[x]);
			if(bound.hasOwnProperty(info[0]))
			{
				var binding=bound[info[0]];
				delete bound[info[0]];
				binds.splice(binds.indexOf(binding),1);
			}
		}
	}
	
	function isBound(keys)
	{
		"use strict";
		if(to_s.call(keys)!=="[object Array]")
			keys=[keys];
		if(keys.length===1)
			return bound.hasOwnProperty(get_combo(keys[0])[0]);
		var r=[];
		for(var x=0, e=keys.length;x<e;++x)
			r.push(bound.hasOwnProperty(get_combo(keys[x])[0]));
		return r;
	}
	function isBoundWord(words)
	{
		if(to_s.call(words)!=="[object Array]")
			words=[words];
		if(words.length===1)
			return isBound(words[0].split("").join(' '));
		var r=[];
		for(var x=0;x<words.length;++x)
			r.push(isBound(words[x].split("").join(' ')));
		return r;
	}
	
	window.Keyblade={
		bind:bind,
		unbind:unbind,
		bindWord:bindWord,
		isBound:isBound,
		isBoundWord:isBoundWord,
		rebind:function(keys,f){
			"use strict";
			if(to_s.call(keys)!=="[object Array]")
				keys=[keys];
			for(var x=0;x<keys.length;++x)
			{
				unbind([keys[x]]);
				bind([keys[x]],f);
			}
		},
		konamiCode:"up up down down left right left right a b shift+enter",
		settings:settings
	};
})(window);
