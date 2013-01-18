function dmsg(msg)
{
  console.log("inject->" + String(arguments.callee.caller.name) + "-> " + msg);
}

function fireEvent(obj,evt)
{
  dmsg("called; " + String(obj.id || obj.name));
	var fireOnThis = obj;
	if( document.createEvent )
	{
	  var evObj = document.createEvent('MouseEvents');
	  evObj.initEvent( evt, true, false );
	  fireOnThis.dispatchEvent(evObj);
	}
	else if( document.createEventObject )
	{
	  fireOnThis.fireEvent('on'+evt);
	}
}
