







function getCookie(cname)
{
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
}

function setCookie(cname, cvalue) 
{
    var d = new Date();
    d.setTime(d.getTime() + (360*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}



var urlsLastModified = Array();


$(document).ready(function()
{
    var base = window.location.href;

    base = base.split("?", 2)[0];

    var parts = base.split("/");

    var last = parts[parts.length - 1];

    if(last.match(new RegExp("(\.php$|\.html$)", "gi")) != null)
        parts.splice(parts.length - 1, 1);

    base = parts.join("/");

    if(getCookie("auto-page-load") == "true")
    {
        for(i = 0; i < 5; i++)
        {
            setTimeout(function()
            {
                $(window).scrollTop(parseInt(getCookie("saved-page-top")));
            }, i * 1000);
        }        
    }


    CheckModified();

    function CheckModified()
    {
        var urls = Array();

        urls.push(window.location.href);

        $("link").each(function(index, el)
        {
            var url = $(el).attr("href");

            urls.push(url);
        });

        $("script").each(function(index, el)
        {
            var url = $(el).attr("src");

            if(typeof(url) != "undefined")
                urls.push(url);
        });

        (async function(urls)
        {
            for(url of urls)
            {
                var fullUrl = url;

                if(url.indexOf("http") != 0)
                    fullUrl = base + "/" + url;
                
                await $.ajax(
                {
                    "url":fullUrl,
                    "method":"HEAD",
                    success:function(data, textStatus, request)
                    {
                        // Get the modified date
                        var currentModified = request.getResponseHeader("Last-Modified");

                        // If it has changed 
                        if(currentModified != urlsLastModified[url])
                        {
                            // If its not the first run
                            if(typeof(urlsLastModified[url]) != "undefined")
                            {
                                console.log("File changed");

                                // If its a css file, then just reload it without refreshing
                                if(url.indexOf(".css") != -1)
                                {
                                    console.log("reloading css file");
                                    $("link[href=\"" + url + "\"]").attr("href", $("link[href=\"" + url + "\"]").attr("href"));
                                }
                                else
                                {
                                    // tell it to reload the page and the scroll position
                                    setCookie("auto-page-reload", "true");
                                    setCookie("saved-page-top", $(window).scrollTop());
                                    
                                    window.location.reload();
                                }
                            }
            
                            // Save it
                            urlsLastModified[url] = currentModified;
                        };
                    }
                });
            }

            setTimeout(CheckModified, 100);
        })(urls);
    }

});
