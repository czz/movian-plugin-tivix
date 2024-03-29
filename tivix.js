/**
 * Tivix plugin for Movian Media Center
 *
 *  Copyright (C) 2020 czz78
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var page = require('showtime/page');
var service = require('showtime/service');
var settings = require('showtime/settings');
var http = require('showtime/http');
var io = require('native/io');
var string = require('native/string');
var plugin = JSON.parse(Plugin.manifest);
var logo = Plugin.path + plugin.icon;

RichText = function(x) {
    this.str = x.toString();
};

RichText.prototype.toRichString = function(x) {
    return this.str;
};

var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.108 Safari/537.36';

io.httpInspectorCreate('http.*tivix.co.*', function(ctrl) {
    ctrl.setHeader('User-Agent', UA);
    return 0;
});

io.httpInspectorCreate('http.*ttranslit.com.*', function(ctrl) {
    ctrl.setHeader('User-Agent', UA);
    ctrl.setHeader('Referer','http://tv.tivix.co/');
    return 0;
});

var blue = '6699CC', orange = 'FFA500', red = 'EE0000', green = '008B45';
function coloredStr(str, color) {
    return '<font color="' + color + '">' + str + '</font>';
}

function setPageHeader(page, title) {
    if (page.metadata) {
        page.metadata.title = title;
        page.metadata.logo = logo;
    }
    page.model.contents = 'grid';
    page.type = "directory";
    page.contents = "items";
}

service.create(plugin.title, plugin.id + ":start", 'video', true, logo);

settings.globalSettings(plugin.id, plugin.title, logo, plugin.synopsis);

settings.createString('baseURL', "Base URL without '/' at the end", 'http://tivix.co', function(v) {
    service.baseURL = v;
});


settings.createBool('debug', 'Enable debug logging',  false, function(v) {
    service.debug = v;
});


function trim(s) {
    if (s) return s.replace(/(\r\n|\n|\r)/gm, "").replace(/(^\s*)|(\s*$)/gi, "").replace(/[ ]{2,}/gi, " ").replace(/\t/g,'');
    return '';
}


function clearUrl(url_code) {

    var const_begin_musor = "//";
    var size_musor_symbols = 48;
    var musor_keys = [];
    url_code = url_code.replace("#2","");
    var begin_find = 0;

    while(true){

        if(url_code.indexOf(const_begin_musor) === -1) break;
        var pos_begin_musor = url_code.indexOf(const_begin_musor, begin_find);
        //console.log("pos_begin_musor=",pos_begin_musor);
        if(!pos_begin_musor > 0) {
            begin_find = 0;
            continue;
        }
        var key1 = url_code.substr(pos_begin_musor, size_musor_symbols+2);

       //console.log("key=",key1);
        if (key1.substr(2).indexOf(const_begin_musor.substr(1)) !== -1) {
            begin_find = begin_find+1;
            continue;
        }

        var check = false;
        for(var i=0; i < musor_keys.length; i++) {
          if(musor_keys[i] == key1) check = true;
        }

        if(!check) musor_keys.push(key1);
        url_code = url_code.replace(key1, "");
        begin_find = 0;
        continue;
    }

    return url_code

}


function decoder(x) {

    var a = x.substring(2,x.length);
    var file3_separator = '\/\/';
    // bk0, bk1...bk4
/*        var bk = [
        'a60098ff-5638-4112-8508-e412c2f3f27f',
        '5de6a8a5-a367-4476-b4de-e4d63c14d30d',
        '19202e40-a6d3-425d-bc0d-2fdf01ff3a8f',
        '90944160-2d81-4756-a925-7cb6a8cbb09a',
        '66c37da2-cef5-4863-bccb-675cdb6b73b0'];
    for (var k=bk.length; k>=0; k-- ){
        var e=encodeURIComponent(bk[k]);
        var b = file3_separator + Duktape.enc('base64', e);
        a = a.replace(b,'');
    }

    var a = clearUrl(x);
*/
    var a = clearUrl(x);
    try {
        var template = Duktape.dec('base64',a);
    }
    catch(err){
            var template = '';
    }

    return template;
}


new page.Route(plugin.id + ":play:(.*):(.*):(.*)", function(page, title, url, icon) {

    setPageHeader(page, decodeURIComponent(title));

    page.loading = true;

    doc = http.request(decodeURIComponent(url) , {
            headers: {
                'User-Agent': UA
            }
        }).toString();

    var no_subtitle_scan = true;

/*
<script>
    var firstIpProtect = '50.7.172.20';
    var secondIpProtect = '50.7.144.155';
    var portProtect = '8081';

    var player = new Playerjs({id:"myTabContent", file:"#2aHR0cDovL3t2Mn06e3YzfS9oMi9pbmRleC5tM3U4P3dtc0F1dGhTaWduPTE1ODMxODE0MTVTYjkxN2IyNDUwNjBjMmM2YWM0MjY0OGUyMGJkMWQ5//MzNmM2I4N2EtMWM3Yy00MDc2LWE2ODktNTVjNTZhNmQwOWQ3ZmFTNjloNDcxaDA//M2Q0Nzg4ZjUtZW//Y2UyMTczZjctZjAwNC00Njk5LWFmYmQtYzEwNzQ3MzYyZmQ0Y1MC00MzI5LWFmYjYtYzQwMGFlMDg5N2Zh2aDI//NDRkMWU0NjctZjI0Ni00NjY5LTkyZTEt//OTcwZTYzMmUtMmQ4MC00N2M5LTg1ZTMtMjkxMGM0MmNiOGRmOGVlNmI2YjNiMzE04"});        

   (function(w,d,o,g,r,a,m){
       d.write('<div id="'+(cid=(Math.random()*1e17).toString(36))+'"></div>');
       w[r]=w[r]||function(){(w[r+'l']=w[r+'l']||[]).push(arguments)};
       function e(b,w,r){if(w[r+'h']=b.pop()){
           a=d.createElement(o),p=d.getElementsByTagName(o)[0];a.async=1;a.setAttribute('data-cfasync','false');
           a.src='//cdn.'+w[r+'h']+'/libs/b.js';a.onerror=function(){e(g,w,r)};p.parentNode.insertBefore(a,p);
       }}if(!w.ABN){e(g,w,r)};w[r](cid,{id:1968998466})
     })(window,document,'script',['braun634.com'],'ABNS');
</script>
*/

//http://50.7.144.155:8081/h2/index.m3u8?wmsAuthSign=1583182087Sdf494e2f92759e55d0454fdc2c00171dS69h471h06h28
    // var s = /firstIpProtect[\s\S]+var firstIpProtect.*?'([^']+)';/gm;
    // var match = s.exec(trim(doc));
    // var fip='';
    // if(match){
    //    fip=match[1];
    // }

    // s = /secondIpProtect[\s\S]+var secondIpProtect.*?'([^']+)';/gm;
    // match = s.exec(trim(doc));
    // var sip='';
    // if(match){
    //    sip=match[1];
    // }

    // s = /portProtect[\s\S]+var portProtect.*?'([^']+)';/gm;
    // match = s.exec(trim(doc));
    // var port='';
    // if(match){
    //    port=match[1];
    // }
    regex = /<script>([\s\S]{0,500}firstIpProtect[\s\S]+?)var player/gm;
    var match = regex.exec(doc);
    console.error(trim(match[1]));
    if (match){
        eval(trim(match[1]));
    }
    


    s = /id:"myTabContent",.*?file.*?"([^"]+)"/gm;
    match = s.exec(trim(doc));
    var file='';
    if(match) {
        file=decoder(match[1]);
    }

    var link = file.toString().replace("{v1}",firstIpProtect).replace("{v2}",secondIpProtect).replace("{v3}",portProtect);

   //curl 'http://50.7.144.155:8081/h2/tracks-1,2/index.m3u8?wmsAuthSign=1583209652S9da760461c3d8815efcabcceff69ccbdS76h932h12h97' -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:68.0) Gecko/20100101 Firefox/68.0' -H 'Accept: */*' -H 'Accept-Language: it,en-US;q=0.7,en;q=0.3' --compressed -H 'Referer: http://tivix.co/436-history-2.html' -H 'Origin: http://tivix.co' -H 'Connection: keep-alive'

   doc = http.request(decodeURIComponent(link) , {
        headers: {
            'User-Agent': UA,
            'Referer': decodeURIComponent(url),
            'Origin': 'http://tivix.co',
        }
    }).toString();

    page.source = "videoparams:" + JSON.stringify({
        title: decodeURIComponent(title),
        canonicalUrl: plugin.id + ':play:' + title + ':' + url+':'+icon,
        sources: [{url: "hls:"+link, mimetype: 'hls'}],
        no_fs_scan: true,
        no_subtitle_scan: no_subtitle_scan,
        icon: decodeURIComponent(icon),
        //subtitles:[],
    });

    page.type = 'video';

    page.loading = false;

});



new page.Route(plugin.id + ":channels:(.*)", function(page, path) {

    setPageHeader(page, plugin.synopsis);

    var page_number = 1, try_to_load = true, total = 0;

    function loader() {

        if(!try_to_load){ return false; }

            page.loading = true;


        doc = trim(http.request(page_number=1 ? service.baseURL+decodeURIComponent(path) : service.baseURL+encodeURIComponent(path)+"/page/"+page_number , {
            headers: {
                'User-Agent': UA
            }
        }).toString());

        page.loading = false;



        /*
        <div class="all_tv" title="UFC HD">
        <a  href="http://tivix.co/435-ufc-hd.html" title="UFC HD"><img src="/uploads/posts/2019-12/1576338590_ufctv.png"></a>
        </div>
        */

        var s =  new RegExp('<div class="all_tv" title="([^"]+)"><a href="([^"]+)" title="([^"]+)"><img src="([^"]+)"></a></div>', 'gi');
        var match =  s.exec(doc);

        while (match) {
            page.appendItem(plugin.id + ':play:'+ encodeURIComponent(match[3]) + ':' + encodeURIComponent(match[2]) + ':' + encodeURIComponent(service.baseURL+ match[4]) , 'directory', {title:match[3], icon: service.baseURL+ match[4]} );
            setPageHeader(page, plugin.synopsis + " " + (total++).toString());
            match = s.exec(doc);
        }

        // get next page
        s = new RegExp('<a href="http://tivix.co/page/'+(page_number + 1)+'\/">' + (page_number + 1) + '</a>','g');
        match = s.exec(doc);

        console.log(match);
        if(match) page_number++;
        else try_to_load = false;

    }

    loader();
    page.paginator = loader;
    page.loading = false;

});




new page.Route(plugin.id + ":start", function(page) {

    setPageHeader(page, plugin.synopsis);

    page.loading = true;


    var menu = [
                  {title: 'Все каналы', icon: Plugin.path+ "images/livetv.png", path: "/"},
                  {title: 'Развлекательные', icon: Plugin.path+ "images/livetv.png", path: "/razvlekatelnyye_kanaly"},
                  {title: 'Популярные', icon: Plugin.path+ "images/livetv.png", path: "/populyarnyye_kanaly"},
                  {title: 'Новостные', icon: Plugin.path+ "images/livetv.png", path: "/novostnye_kanaly"},
                  {title: 'Музыкальные', icon: Plugin.path+ "images/livetv.png", path: "/muzykalnye_kanaly"},
                  {title: 'Фильмы, сериалы', icon: Plugin.path+ "images/livetv.png", path: "/kino_serialy"},
                  {title: 'Детские', icon: Plugin.path+ "images/livetv.png", path: "/detskie_kanaly"},
                  {title: 'Православные', icon: Plugin.path+ "images/livetv.png", path: "/pravoslavnyye_kanaly"},
                  {title: 'Футбольные', icon: Plugin.path+ "images/livetv.png", path: "/futbolnye_kanaly"},
                  {title: 'Образовательные', icon: Plugin.path+ "images/livetv.png", path: "/obrazovatelnye_kanaly"},
                  {title: 'Спортивные', icon: Plugin.path+ "images/livetv.png", path: "/sportivnye_kanaly"},
                  {title: 'Спутниковые', icon: Plugin.path+ "images/livetv.png", path: "/sputnikovye_kanaly"},
                  {title: 'HD каналы', icon: Plugin.path+ "images/livetv.png", path: "/hd_kanaly"},
                  {title: 'Торрент тв', icon: Plugin.path+ "images/livetv.png", path: "/torrent_kanaly"},
                  {title: 'Мобильное тв', icon: Plugin.path+ "images/livetv.png", path: "/mobile_tv"},
                  {title: 'Русское тв', icon: Plugin.path+ "images/livetv.png", path: "/russkie_kanaly"},
                  {title: 'Украинское тв', icon: Plugin.path+ "images/livetv.png", path: "/ukrainskie_kanaly"},
                  {title: 'Белорусское тв', icon: Plugin.path+ "images/livetv.png", path: "/belorusskiye_kanaly"},
                  {title: 'Английское тв', icon: Plugin.path+ "images/livetv.png", path: "/angliskie_kanaly"}
                 ];

    for(var i = 0; i < menu.length; i++) {
        page.appendItem(plugin.id + ':channels:'+encodeURIComponent(menu[i].path) , 'directory', menu[i] );
        setPageHeader(page, plugin.synopsis + " " + (i).toString());
    }

    page.loading = false;

});

function atob(str) {
    return Duktape.dec('base64',str);
}