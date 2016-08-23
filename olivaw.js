/*
Copyright (c) 2012, 2013 Daniel Green / Cosmic Shovel, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

phantom.injectJs("jquery.min.js");
jQuery.noConflict();
phantom.injectJs("Class-0.0.2.min.js");
phantom.injectJs("olivaw_include.js");

dmsg("Olivaw v0.2 By Daniel Green / Cosmic Shovel, Inc.");
dmsg("Disclaimer: We intend nothing malicious through the use or release of this tool.  Associates have a legitimate need of a way to automate processing of affiliate reports.  Amazon has nothing to do with this tool, please don't ask them about, or to support, it.");

var system = require('system');
var cache_dir = "./", report_type = null, date_option = null, file_format = null, username = null, password = null;

if (system.args.length < 7 || phantom.args.indexOf("-h") != -1)
{
  dmsg("Case-sensitive script arguments: username password locale report_type date_option file_format");
  dmsg("Locale: CA, CN, DE, ES, MX, FR, IT, JP, UK, US");
  dmsg("report_type: orders, earnings, misc, linkType, trends, tags");
  dmsg("date_option: yesterday, lastSevenDays, monthToDate, lastMonth, QuarterToDate, q1, q2, q3, q4, YYYYMMDD-YYYYMMDD");
  dmsg("file_format: xml, csv");
  phantom.exit();
}

username    = system.args[1];
password    = system.args[2];
locale      = system.args[3];
report_type = system.args[4];
date_option = system.args[5];
file_format = system.args[6];
phantom.userAgent = "Mozilla/5.0 (Windows; WOW64) Gecko/Firefox";

// declared in olivaw_include.js
// don't change this ("scraper") variable name
scraper = new Scraper(cache_dir, locale, username, password, report_type, date_option, file_format);
scraper.callback_wait(function() { scraper.go(); });