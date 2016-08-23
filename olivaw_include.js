/*
Copyright (c) 2012, 2013, 2016 Daniel Green / Cosmic Shovel, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/************************************************ DEBUG SHIZOLA ***************************************************/

function formatDate(date, fmt)
{
  function pad(value) {
    return (value.toString().length < 2) ? '0' + value : value;
  }
  return fmt.replace(/%([a-zA-Z])/g, function (_, fmtCode) {
    switch (fmtCode) {
    case 'Y':
      return date.getUTCFullYear();
    case 'M':
      return pad(date.getUTCMonth() + 1);
    case 'd':
      return pad(date.getUTCDate());
    case 'H':
      return pad(date.getUTCHours());
    case 'm':
      return pad(date.getUTCMinutes());
    case 's':
      return pad(date.getUTCSeconds());
    default:
      throw new Error('Unsupported format code: ' + fmtCode);
    }
  });
}

var g_cur_url = "<url not set>";
var g_last_url = null;

function set_url(url)
{
  if (g_cur_url != "<url not set>")
    g_last_url = g_cur_url;

  g_cur_url = url;
}

function get_url()
{
  return(g_cur_url);
}

function dmsg(msg)
{
  msg = "Scraper" +/* String(arguments.callee.caller) +*/ "-> " + msg;
  console.log(formatDate(new Date(), "%Y-%M-%d %H:%m:%s") + ": " + get_url() + " - " + msg);
}

Object.prototype.getName = function() {
  var funcNameRegex = /function (.{1,})\(/;
  var results = (funcNameRegex).exec((this).constructor.toString());
  return (results && results.length > 1) ? results[1] : "";
};

var user_agents = [
  "Mozilla/5.0 (Windows; WOW64) Gecko/Firefox"
];

/************************************************ SCRAPER CLASS ***************************************************/

var scraper = null;

var Scraper = Class.create({
  cache_dir:     null,
  has_next_page: false,
  last_failed:   false,
  call_count:    0,
  fail_count:    0,
  max_failures: 1,
  report_type: null,
  date_option: null,
  file_format: null,
  username: null,
  password: null,
  locale: null,
  associates_domain: null,
  pointer: null,

  cls_dmsg: function(msg)
  {
    msg += "; call_count=" + String(this.call_count) + "; fail_count=" + String(this.fail_count);
   // msg += "; " + this.decorated_state();
    dmsg(msg);
  },

  init: function(cache_dir, locale, username, password, report_type, date_option, file_format)
  {
    this.cache_dir = cache_dir;
    this.locale = locale;
    this.username = username;
    this.password = password;
    this.report_type = report_type;
    this.date_option = date_option;
    this.file_format = file_format;
    phantom.state = "home";

    this.set_associates_domain();
    this.cls_dmsg("init(" + String(cache_dir) + ")");
  },

  set_associates_domain: function()
  {
    switch (this.locale)
    {
    case "CA":
      this.associates_domain = "associates.amazon.ca";
    break;

    case "CN":
      this.associates_domain = "associates.amazon.cn";
    break;

    case "DE":
      this.associates_domain = "partnernet.amazon.de";
    break;

    case "ES":
      this.associates_domain = "afiliados.amazon.es";
    break;

    case "MX":
      this.associates_domain = "afiliados.amazon.com.mx";
    break;

    case "FR":
      this.associates_domain = "partenaires.amazon.fr";
    break;

    case "IT":
      this.associates_domain = "programma-affiliazione.amazon.it";
    break;

    case "JP":
      this.associates_domain = "affiliate.amazon.co.jp";
    break;

    case "UK":
      this.associates_domain = "affiliate-program.amazon.co.uk";
    break;

    case "US":
      this.associates_domain = "affiliate-program.amazon.com";
    break;
    }
  },

  // waits 2+rand(5) seconds before calling the passed function
  callback_wait: function(callback)
  {
    this.cls_dmsg("callback_wait()");
    var period = 10 + (Math.floor(Math.random()*6));
    window.setTimeout(callback, period * 1000);
  },

  // creates and/or returns the phantomjs webpage object which drives the script
  // we only create one (not sure if this is the best way to go...)
  get_page: function()
  {
    if (!this.page)
    {
      this.page = require("webpage").create();
      this.page.viewportSize = { width: 1600, height: 1200 };
      this.page.onResourceReceived = function(resource) { scraper.on_resource_received(resource) };
      this.page.onLoadStarted = function() { scraper.on_load_started() };
      this.page.onLoadFinished = function(status) { scraper.on_load_finished(status); };
      this.page.onConsoleMessage = function(msg) { scraper.cls_dmsg("* " + msg); }
      this.page.settings.userAgent = user_agents[Math.floor(Math.random()*user_agents.length)] + String(Math.random() + 1000);
      this.cls_dmsg("get_page() -> page object created");
    }
    else
      this.cls_dmsg("get_page() -> page object exists");

    return(this.page);
  },

  // called after a page is loaded, adds our code into the loaded page
  inject: function()
  {
    this.cls_dmsg("inject()");
    var page = this.get_page();
    page.injectJs("jquery.min.js");
    page.evaluate(function() { jQuery.noConflict(); });
    page.injectJs("Class-0.0.2.min.js");
    page.injectJs("olivaw_inject.js");
  },

  render_text: function(fn, text)
  {
    var fs = require("fs");
    fs.write(fn, text, "w");
  },

  console_render: function(text)
  {
    var fn = this.cache_dir;
    fn += "report-";
    fn += this.locale;
    fn += "-";
    fn += this.report_type;
    fn += "-";
    fn += this.date_option;
    fn += ".";
    fn += this.file_format;

    dmsg("Saving " + String(text.length) + " console-logged bytes to " + fn);
    this.render_text(fn, text);
  },

  // saves a copy of the current page in HTML and PNG formats to this.cache_dir
  render: function()
  {
    var src = null;
    var fn = this.cache_dir;
    fn += this.decorated_state();

    src = this.get_page().evaluate(function () {
      return document.getElementsByTagName('html')[0].innerHTML
    });

    this.cls_dmsg("render() -> src found; " + String(src.length) + " bytes");
    this.render_text(fn + ".html", src);
    this.get_page().render(fn + ".png");

    return(src.length > 100 && src.indexOf("<h2> We're sorry!") == -1);
  },

  // to phantom.state, this function adds page numbers and other useful data useful for debugging
  decorated_state: function()
  {
    var comp = new Array();
    comp.push(phantom.state);

    if (this.last_fail)
      comp.push("failed");

    var out = comp.join("-");
    delete comp;

    return(out);
  },

  // defines the actions needed to initiate each state
  // for example, in the "home" state, this function uses this.page to load the amazon homepage
  go: function()
  {
    if (this.call_count > 0)
    {
      this.cls_dmsg("go() -> call_count (" + String(this.call_count) + ") too high");
      return;
    }

    if (g_last_url)
    {
      this.get_page().customHeaders = {
        "Referer": g_last_url
      };
    }

    switch (phantom.state)
    {
    // home page
    case "home":
      set_url("https://" + this.associates_domain + "/");
      this.get_page().open(get_url());
    break;
    
    case "pre-login":
      set_url("https://" + this.associates_domain + "/login");
      this.get_page().open(get_url());
    break;

    case "login":
      this.get_page().evaluate(function(username, password, locale) {
        var user_elm_id = locale == "US" ? "ap_email" : "username";
        var pass_elm_id = locale == "US" ? "ap_password" : "password";
        var btn_elm_id = locale == "US" ? "signInSubmit" : "btnsignin";
        
        for (var i = 0; i < username.length; i++)
        {
          var e = document.createEvent('Event');
          e.initEvent("keydown", true, true);
          e.keyCode = username.charCodeAt(i);
          document.getElementById(user_elm_id).dispatchEvent(e);
          var e = document.createEvent('Event');
          e.initEvent("keypress", true, true);
          e.keyCode = username.charCodeAt(i);
          document.getElementById(user_elm_id).dispatchEvent(e);
          sleep(10);
        }
        
        for (var i = 0; i < password.length; i++)
        {
          var e = document.createEvent('Event');
          e.initEvent("keydown", true, true);
          e.keyCode = password.charCodeAt(i);
          document.getElementById(pass_elm_id).dispatchEvent(e);
          var e = document.createEvent('Event');
          e.initEvent("keypress", true, true);
          e.keyCode = password.charCodeAt(i);
          document.getElementById(pass_elm_id).dispatchEvent(e);
          sleep(10);
        }
        
        document.getElementById(user_elm_id).value = username;
        document.getElementById(pass_elm_id).value = password;
        
        var btn = document.getElementById(btn_elm_id);
        
        if (!btn)
        {
          for (var i = 0; i < document.getElementById("signin").childNodes.length; i++)
          {
            var node = document.getElementById("signin").childNodes[i];
            
            if (node.type == "image")
            {
              btn = node;
              break;
            }
          }
        }
        
        var e = document.createEvent('HTMLEvents');
        e.initEvent("mousedown", false, true);
        btn.dispatchEvent(e);
        
        var e = document.createEvent('HTMLEvents');
        e.initEvent("mouseup", false, true);
        btn.dispatchEvent(e);
        
        var e = document.createEvent('HTMLEvents');
        e.initEvent("click", false, true);
        btn.dispatchEvent(e);
        
      }, this.username, this.password, this.locale);
    break;

    case "report":
      this.get_page().onConsoleMessage = function(msg) { scraper.console_render(msg); phantom.exit(); };
      this.get_page().evaluate(function(associates_domain, report_type, date_option, file_format) {
        var xhr = new XMLHttpRequest();
        var url = "https://" + associates_domain + "/gp/associates/network/reports/report.html?ie=UTF8&tag=&program=all&reportType=";
        var fmt = file_format.toUpperCase();
        url += report_type;
        url += "Report&submit.download_";
        url += fmt;
        url += "=Download%20report%20(";
        url += fmt;
        url += ")";

        // if the date includes a dash, assume it is a range (periodType=exact)
        if (date_option.indexOf("-") != -1)
        {
          var regex = /([0-9]{4})([0-9]{2})([0-9]{2})\-([0-9]{4})([0-9]{2})([0-9]{2})/i;
          var m = date_option.match(regex);
          url += "&periodType=exact";
          url += "&startMonth=" + String(m[2] - 1);
          url += "&startDay=" + String(m[3]);
          url += "&startYear=" + String(m[1]);
          url += "&endMonth=" + String(m[5] - 1);
          url += "&endDay=" + String(m[6]);
          url += "&endYear=" + String(m[4]);
        }
        else
        {
          url += "&periodType=preSelected";
          url += "&preSelectedPeriod=";
          url += date_option;
        }

        xhr.open("GET", url);
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4)
          {
            if (xhr.status == 200)
              console.log(xhr.responseText);
            else
              console.log("Error!  HTTP Status: " + String(xhr.status) + "\n\n" + xhr.responseText + "\n");
          }
        };
        xhr.send(null);
      }, this.associates_domain, this.report_type, this.date_option, this.file_format);
    break;
    }

    this.cls_dmsg("go() -> loading url");
  },

  // report non OK status codes
  on_resource_received: function(resource)
  {
    if (resource.url != get_url())
      return;

    this.cls_dmsg('on_resource_received() -> Code: ' + resource.status + ' URL: ' + resource.url);
  },

  // called by phantomjs when a request starts
  on_load_started: function()
  {
    if (this.call_count++ == 0)
      this.cls_dmsg("on_load_started() -> load started");
    else
      this.cls_dmsg("on_load_started() -> Background load started");
  },

  on_load_failure: function()
  {
    //this.last_failed = true;
    //this.render();
    //this.last_failed = false;

    if (this.fail_count++ >= this.max_failures)
    {
      this.cls_dmsg("on_load_failure() -> Too many failures, exiting...");
      phantom.exit();

      return;
    }

    this.cls_dmsg("on_load_failure() -> retrying");
    this.callback_wait(function() { scraper.go(); });
  },

  // called by phantomjs when a request ends.
  // defines the actions taken after the completion of each state
  // inject()s jquery and other code into this.page
  // sets phantom.state to its new value, then calls go()
  // status = [success, failure]
  on_load_finished: function(status)
  {
    if (this.call_count-- > 1)
    {
      this.cls_dmsg("on_load_finished() -> false -> Background load succeeded");
      return(false);
    }

    if (status != "success" || !this.render())
    {
      this.on_load_failure();

      return(false);
    }

    this.fail_count = 0;
    var loc = this.get_page().evaluate(function() { return(window.location.href); });
    this.cls_dmsg("on_load_finished() -> " + loc + " - load succeeded");
    this.inject();

    switch (phantom.state)
    {
    // home page
    case "home":
      phantom.state = this.locale == "US" ? "pre-login" : "login";
    break;
    
    case "pre-login":
      phantom.state = "login";
    break;

    case "login":
      phantom.state = "report";
    break;

    case "report":
      phantom.exit();
    break;
    }

    this.cls_dmsg("on_load_finished() -> state changed");
    this.callback_wait(function() { scraper.go(); });
  }
});
